"""
Record a workflow by letting a VISION model drive the app like a human.

Usage (PowerShell):
    python record.py create_invoice "Create a new invoice for a customer with line items" 40

Open the target app FIRST, then run this. The model sees a screenshot each step and
returns ONE JSON action; we execute it with pyautogui and log it.
Move the mouse to a screen corner to abort (pyautogui failsafe).
"""
import base64
import io
import json
import sys
import time
from pathlib import Path

import mss
import pyautogui
from PIL import Image
import executor
import llm

SYSTEM = """You are a GUI agent operating a desktop app by looking at screenshots.
Each turn you receive a screenshot and the goal. Reply with EXACTLY ONE JSON object,
no prose, no markdown fences. Schema:
{"thought": "<brief>", "action": "click|double_click|type|key|scroll|wait|done",
 "x": <int>, "y": <int>, "text": "<for type>", "keys": ["ctrl","s"],
 "amount": <int for scroll>, "seconds": <float for wait>, "summary": "<for done>"}
Coordinates are pixels in the screenshot you were given. Use "done" when the goal is complete."""


def grab():
    """Return (base64 png, (width, height)) of the primary monitor."""
    with mss.mss() as sct:
        raw = sct.grab(sct.monitors[1])
        img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode(), img.size


def ask(goal, b64, size):
    w, h = size
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": [
            {"type": "text", "text": f"Goal: {goal}\nScreenshot is {w}x{h} pixels. Return one JSON action."},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
        ]},
    ]
    # Vision chain: OpenAI gpt-4o primary -> GrafiLab fallback (see config.VISION_CHAIN).
    txt, _, _ = llm.complete("vision", messages, temperature=0, max_tokens=500)
    if txt.startswith("```"):                       # tolerate ```json fences
        txt = txt.strip("`").split("\n", 1)[-1].rsplit("```", 1)[0]
    return json.loads(txt)


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "workflow"
    goal = sys.argv[2] if len(sys.argv) > 2 else "Complete the task in the open app"
    max_steps = int(sys.argv[3]) if len(sys.argv) > 3 else 40   # HARD CAP — protects your credit

    screen_w, screen_h = pyautogui.size()
    steps = []
    print(f"Recording '{name}'. Goal: {goal}\nSwitch to the target app now... starting in 4s.")
    time.sleep(4)

    for n in range(max_steps):
        b64, (sw, sh) = grab()
        try:
            act = ask(goal, b64, (sw, sh))
        except Exception as e:
            print(f"[{n}] model/parse error: {e} — stopping.")
            break
        print(f"[{n}] {act.get('action')}  {act.get('thought', '')[:60]}")
        if act.get("action") == "done":
            break
        # scale screenshot px -> pyautogui logical px if DPI scaling differs
        if "x" in act:
            act["x"] = int(act["x"] * screen_w / sw)
        if "y" in act:
            act["y"] = int(act["y"] * screen_h / sh)
        executor.run_step(act)
        steps.append(act)
        time.sleep(0.6)

    Path("workflows").mkdir(exist_ok=True)
    out = Path("workflows") / f"{name}.json"
    out.write_text(json.dumps({"name": name, "goal": goal, "steps": steps}, indent=2))
    print(f"Saved {len(steps)} steps -> {out}")


if __name__ == "__main__":
    main()
