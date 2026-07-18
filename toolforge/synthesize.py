"""
Turn a raw recording (workflows/<name>.json) into a parameterized TOOL definition
(tools/<name>.tool.json) using the TEXT chain (GrafiLab glm-5.2 primary, OpenAI fallback).

The model names the tool, writes a description + JSON-Schema parameters, and rewrites
the 'type' steps that contain variable data into {{placeholders}} bound to those params.

Usage:  python synthesize.py create_invoice
"""
import json
import sys
from pathlib import Path

import llm

PROMPT = """You are given a recorded GUI workflow as JSON steps. Produce a reusable TOOL definition.
Return ONLY JSON (no fences) with this exact shape:
{"name": "<snake_case>", "description": "<one line>",
 "parameters": {"type": "object", "properties": {...}, "required": [...]},
 "steps": [ ...the same steps, but in any 'type' step whose text is variable data,
            replace the literal text with "{{param_name}}" matching a parameter... ]}
Keep click/key/scroll coordinates exactly as given. Only parameterize 'type' text a caller would vary."""


def main():
    name = sys.argv[1]
    raw = json.loads((Path("workflows") / f"{name}.json").read_text())
    messages = [
        {"role": "system", "content": PROMPT},
        {"role": "user", "content": json.dumps(raw)},
    ]
    # Text chain: GrafiLab glm-5.2 primary (cheap) -> OpenAI fallback (see config.TEXT_CHAIN).
    txt, _, _ = llm.complete("text", messages, temperature=0)
    if txt.startswith("```"):
        txt = txt.strip("`").split("\n", 1)[-1].rsplit("```", 1)[0]
    tool = json.loads(txt)

    Path("tools").mkdir(exist_ok=True)
    out = Path("tools") / f"{name}.tool.json"
    out.write_text(json.dumps(tool, indent=2))
    params = list(tool.get("parameters", {}).get("properties", {}))
    print(f"Wrote tool definition -> {out}\nParameters: {params}")


if __name__ == "__main__":
    main()
