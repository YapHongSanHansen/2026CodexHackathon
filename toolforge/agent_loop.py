"""
Live-operation crew — the spec's Group B, made self-healing and callable at MCP-call-time.

`operate(goal, ...)` runs a small crew that drives the live app to satisfy an English goal:
  PLANNER   (text)   -> ordered sub-steps + a visible success signal
  OPERATOR  (vision) -> looks at a FRESH screenshot each step, returns ONE action  (record.SYSTEM schema)
  VERIFIER  (vision) -> compares before/after, classifies progress, detects popups/moved windows

Re-grounding on a new screenshot every step is the self-healing property: nothing trusts old
coordinates, so the run adapts when the window moves or a dialog pops up. This is the difference
from executor.run (fixed-coordinate replay).

Reuses: record.grab()/record.SYSTEM (screenshot + action schema), executor.run_step (pyautogui
execution), llm.complete (provider failover). pyautogui/mss are imported lazily via those modules,
so importing agent_loop never requires a display until operate() actually runs.

Needs a VISION-capable LLM key at runtime (unlike pure replay). Safety: pyautogui FAILSAFE (slam
the mouse to a screen corner to abort), a hard step cap, a no-progress abort, and a confirmation
gate before destructive actions (delete/send/submit/pay/...).
"""
import json
import time

import executor
import llm
import prompts
import record

DEFAULT_MAX_STEPS = 25          # 2 vision calls/step, so lower than record.py's 40 — protects credit
NO_PROGRESS_LIMIT = 3           # consecutive "no" verdicts before we give up
STEP_PAUSE = 0.6                # let the UI settle before the after-screenshot

# Words that mean the action is hard to undo — gated behind allow_destructive.
DESTRUCTIVE = ("delete", "remove", "send", "submit", "pay", "print", "post", "finalize",
               "confirm", "purchase", "transfer", "discard")


def _loads(txt):
    """Parse a model reply that should be one JSON object, tolerating ```json fences."""
    if txt.startswith("```"):
        txt = txt.strip("`").split("\n", 1)[-1].rsplit("```", 1)[0]
    return json.loads(txt)


def _img(b64):
    return {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}


def make_plan(goal):
    """PLANNER (text chain). Falls back to a one-step plan if the model misbehaves."""
    messages = [
        {"role": "system", "content": prompts.PLANNER},
        {"role": "user", "content": f"GOAL: {goal}\nReturn one JSON object."},
    ]
    try:
        txt, _, _ = llm.complete("text", messages, temperature=0, max_tokens=400)
        plan = _loads(txt)
        if isinstance(plan, dict) and plan.get("subgoals"):
            return {"subgoals": plan["subgoals"], "success_signal": plan.get("success_signal", "")}
    except Exception:
        pass
    return {"subgoals": [goal], "success_signal": ""}


def _operator(goal, plan, history, b64, size):
    """OPERATOR (vision chain). Returns ONE action dict for the current screenshot."""
    w, h = size
    hist = "\n".join(
        f"- did {h_['action'].get('action')} -> {h_['verdict'].get('progress')}"
        f" ({h_['verdict'].get('recover_hint', '') or h_['verdict'].get('note', '')})"
        for h_ in history
    ) or "(none yet)"
    text = (
        f"GOAL: {goal}\n"
        f"PLAN: {json.dumps(plan['subgoals'])}\n"
        f"SUCCESS SIGNAL: {plan.get('success_signal', '')}\n"
        f"RECENT HISTORY:\n{hist}\n"
        f"Screenshot is {w}x{h} pixels. Return ONE JSON action for THIS screenshot."
    )
    messages = [
        {"role": "system", "content": prompts.OPERATOR},
        {"role": "user", "content": [{"type": "text", "text": text}, _img(b64)]},
    ]
    txt, _, _ = llm.complete("vision", messages, temperature=0, max_tokens=500)
    return _loads(txt)


def _verifier(goal, action, before_b64, after_b64):
    """VERIFIER (vision chain). Classifies progress from before/after screenshots."""
    text = (
        f"GOAL: {goal}\nACTION TAKEN: {json.dumps(action)}\n"
        "First image = BEFORE, second image = AFTER. Return one JSON verdict."
    )
    messages = [
        {"role": "system", "content": prompts.VERIFIER},
        {"role": "user", "content": [{"type": "text", "text": text}, _img(before_b64), _img(after_b64)]},
    ]
    try:
        txt, _, _ = llm.complete("vision", messages, temperature=0, max_tokens=200)
        v = _loads(txt)
        if isinstance(v, dict) and v.get("progress"):
            return v
    except Exception as e:
        return {"progress": "no", "note": f"verifier error: {e}", "recover_hint": ""}
    return {"progress": "no", "note": "unparseable verdict", "recover_hint": ""}


def _is_destructive(action):
    blob = (action.get("summary", "") + " " + action.get("thought", "") + " " +
            action.get("text", "") + " " + " ".join(action.get("keys", []))).lower()
    return any(w in blob for w in DESTRUCTIVE)


def _focus(app_hint):
    """Best-effort: bring a window whose title contains app_hint to the front."""
    try:
        import pygetwindow as gw
        for win in gw.getAllWindows():
            if app_hint.lower() in (win.title or "").lower():
                win.activate()
                return True
    except Exception:
        pass
    return False


def operate(goal, app_hint=None, save_as=None, dry_run=False,
            allow_destructive=False, max_steps=DEFAULT_MAX_STEPS):
    """Drive the live app to satisfy `goal`. Returns a JSON-able result dict.

    dry_run=True         -> plan + propose the first action, execute NOTHING (cheap demo).
    save_as="name"       -> on success, write the executed steps to workflows/name.json
                            (so synthesize.py can later turn them into a reusable tool).
    allow_destructive    -> permit delete/send/submit/... actions (else returns confirm_required).
    """
    import pyautogui
    screen_w, screen_h = pyautogui.size()

    plan = make_plan(goal)
    if app_hint:
        _focus(app_hint)
        time.sleep(0.5)

    if dry_run:
        b64, size = record.grab()
        try:
            action = _operator(goal, plan, [], b64, size)
        except Exception as e:
            return {"status": "error", "stage": "operator", "error": str(e), "plan": plan}
        return {"status": "dry_run", "goal": goal, "plan": plan, "proposed_first_action": action}

    history, transcript, executed = [], [], []
    no_progress = 0

    for n in range(max_steps):
        b64, (sw, sh) = record.grab()
        try:
            action = _operator(goal, plan, history[-3:], b64, (sw, sh))
        except Exception as e:
            return {"status": "error", "stage": "operator", "step": n, "error": str(e),
                    "transcript": transcript}

        if action.get("action") == "done":
            return {"status": "done", "steps": n, "summary": action.get("summary", ""),
                    "plan": plan, "transcript": transcript,
                    **_maybe_save(save_as, goal, executed)}

        if _is_destructive(action) and not allow_destructive:
            return {"status": "confirm_required", "step": n, "proposed_action": action,
                    "reason": "action looks destructive (e.g. delete/send/submit)",
                    "hint": "ask the user, then re-call operate_app with allow_destructive=true",
                    "transcript": transcript}

        # scale screenshot px -> pyautogui logical px (same approach as record.py)
        if "x" in action:
            action["x"] = int(action["x"] * screen_w / sw)
        if "y" in action:
            action["y"] = int(action["y"] * screen_h / sh)

        try:
            executor.run_step(action)
            executed.append(action)
        except Exception as e:
            transcript.append({"step": n, "action": action, "error": str(e)})
            return {"status": "error", "stage": "execute", "step": n, "error": str(e),
                    "transcript": transcript}

        time.sleep(STEP_PAUSE)
        after_b64, _ = record.grab()
        verdict = _verifier(goal, action, b64, after_b64)
        transcript.append({"step": n, "action": action, "verdict": verdict})
        history.append({"action": action, "verdict": verdict})

        no_progress = no_progress + 1 if verdict.get("progress") == "no" else 0
        if no_progress >= NO_PROGRESS_LIMIT:
            return {"status": "stuck", "steps": n + 1, "plan": plan, "transcript": transcript,
                    "note": "no progress for several consecutive steps"}

    return {"status": "max_steps", "steps": max_steps, "plan": plan, "transcript": transcript,
            **_maybe_save(save_as, goal, executed)}


def _maybe_save(save_as, goal, executed):
    """On success, persist executed actions as a raw recording for later synthesis. No-op if unset."""
    if not save_as or not executed:
        return {}
    from pathlib import Path
    Path("workflows").mkdir(exist_ok=True)
    out = Path("workflows") / f"{save_as}.json"
    out.write_text(json.dumps({"name": save_as, "goal": goal, "steps": executed}, indent=2))
    return {"saved_recording": str(out),
            "next": f"run: python synthesize.py {save_as}   (turns it into a reusable tool)"}
