"""Central config + provider registry. Reads from environment; .env auto-loaded.

Two providers, both spoken to via the OpenAI SDK:
  - openai   : real OpenAI (api.openai.com)            — strongest at vision/GUI control
  - grafilab : OpenAI-compatible (Gemini/Qwen/GLM ...) — cheaper for easy text synthesis

Each capability ("vision" / "text") has an ordered fallback CHAIN. The llm.py router
tries each provider in the chain until one succeeds, so a single outage or credit cap
never kills a run. Defaults are "accuracy-first": OpenAI leads on vision, GrafiLab on text.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ---- Providers ---------------------------------------------------------------
OPENAI_API_KEY    = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL   = os.environ.get("OPENAI_BASE_URL")            # None => api.openai.com
GRAFILAB_API_KEY  = os.environ.get("GRAFILAB_API_KEY", "")
GRAFILAB_BASE_URL = os.environ.get("GRAFILAB_BASE_URL", "https://api.grafilab.ai/v1")

# ---- Per-provider model ids (override in .env) -------------------------------
# Vision models MUST accept image input. Confirm GrafiLab's exact ids with check_models.py.
OPENAI_VISION_MODEL   = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o")
OPENAI_TEXT_MODEL     = os.environ.get("OPENAI_TEXT_MODEL", "gpt-4o")
GRAFILAB_VISION_MODEL = os.environ.get("GRAFILAB_VISION_MODEL", "qwen2.5-vl-72b-instruct")
GRAFILAB_TEXT_MODEL   = os.environ.get("GRAFILAB_TEXT_MODEL", "glm-5.2")

# Registry: name -> connection + its model per capability.
PROVIDERS = {
    "openai": {
        "api_key": OPENAI_API_KEY, "base_url": OPENAI_BASE_URL,
        "vision": OPENAI_VISION_MODEL, "text": OPENAI_TEXT_MODEL,
    },
    "grafilab": {
        "api_key": GRAFILAB_API_KEY, "base_url": GRAFILAB_BASE_URL,
        "vision": GRAFILAB_VISION_MODEL, "text": GRAFILAB_TEXT_MODEL,
    },
}

# ---- Routing (accuracy-first defaults; comma-separated, override in .env) -----
# Vision: OpenAI primary (best live GUI control) -> GrafiLab fallback.
# Text:   GrafiLab primary (cheap) -> OpenAI fallback.
VISION_CHAIN = [n.strip() for n in os.environ.get("VISION_CHAIN", "openai,grafilab").split(",") if n.strip()]
TEXT_CHAIN   = [n.strip() for n in os.environ.get("TEXT_CHAIN",   "grafilab,openai").split(",") if n.strip()]

# Per-call timeout (seconds) before failing over to the next provider.
LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", "60"))

# The API key your generated REST endpoint requires from callers (NOT an LLM key).
TOOLFORGE_API_KEY = os.environ.get("TOOLFORGE_API_KEY", "dev-secret-key")
