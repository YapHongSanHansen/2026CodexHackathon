"""Replays a workflow's steps with pyautogui, substituting {{params}}.
Shared by the REST API (api.py) and the MCP server (mcp_server.py)."""
import time
import pyautogui

pyautogui.PAUSE = 0.4        # small pause between actions
pyautogui.FAILSAFE = True    # slam the mouse into a screen corner to abort


def _fill(text, args):
    for k, v in (args or {}).items():
        text = text.replace("{{" + k + "}}", str(v))
    return text


def run_step(step, args=None):
    a = step.get("action")
    if a == "click":
        pyautogui.click(step["x"], step["y"])
    elif a == "double_click":
        pyautogui.doubleClick(step["x"], step["y"])
    elif a == "type":
        pyautogui.typewrite(_fill(step.get("text", ""), args), interval=0.02)
    elif a == "key":
        pyautogui.hotkey(*step.get("keys", []))
    elif a == "scroll":
        pyautogui.scroll(int(step.get("amount", 0)))
    elif a == "wait":
        time.sleep(float(step.get("seconds", 1)))
    else:
        raise ValueError(f"unknown action: {a}")


def run(tool_def, args):
    """tool_def: {name, parameters, steps:[...]}; args: {param: value}."""
    ran = []
    for i, step in enumerate(tool_def["steps"]):
        run_step(step, args)
        ran.append({"step": i, "action": step.get("action")})
    return {"status": "ok", "tool": tool_def["name"], "ran": ran}
