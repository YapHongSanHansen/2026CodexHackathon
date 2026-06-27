"""List the model IDs each configured provider's key can see (OpenAI /models endpoint).
Run:  python check_models.py

Use this to confirm which models each key can access — in particular whether GrafiLab
exposes a VISION model — and copy the exact ids into your .env
(OPENAI_VISION_MODEL / OPENAI_TEXT_MODEL / GRAFILAB_VISION_MODEL / GRAFILAB_TEXT_MODEL).
"""
from openai import OpenAI

import config

for name, p in config.PROVIDERS.items():
    if not p["api_key"]:
        print(f"== {name}: no API key set, skipping ==\n")
        continue
    base = p["base_url"] or "https://api.openai.com/v1"
    print(f"== {name} ({base}) ==")
    try:
        client = OpenAI(api_key=p["api_key"], base_url=p["base_url"])
        for mid in sorted(m.id for m in client.models.list().data):
            print(" ", mid)
    except Exception as e:
        print(f"  couldn't list models: {e}")
        print("  (if /models isn't supported, read the ids off the provider's dashboard)")
    print()
