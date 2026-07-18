"""Provider-routing LLM client with cross-provider failover.

complete(capability, messages, **kw) tries each provider in that capability's chain
(config.VISION_CHAIN / config.TEXT_CHAIN) and returns (text, provider_name, model)
from the first that succeeds. It fails over on ANY error (network, timeout, 4xx/5xx,
rate limit, refusal) or an empty response, and raises RuntimeError only if EVERY
provider in the chain fails.

A provider that returns an auth/quota error is "circuit-broken" for the rest of the
process (added to _dead) so we don't keep retrying — and waiting on — a dead key. This
matters in record.py's per-step loop (up to 40 calls): one dead key shouldn't add a
timeout to every step.
"""
import sys

from openai import OpenAI

import config

_clients = {}        # provider name -> cached OpenAI client
_dead = set()        # providers circuit-broken for this process


def _client(name):
    if name not in _clients:
        p = config.PROVIDERS[name]
        _clients[name] = OpenAI(
            api_key=p["api_key"],
            base_url=p["base_url"],
            timeout=config.LLM_TIMEOUT,
        )
    return _clients[name]


def _chain(capability):
    return config.VISION_CHAIN if capability == "vision" else config.TEXT_CHAIN


def complete(capability, messages, **kw):
    """Run a chat completion for `capability` ("vision" | "text") with failover.

    Returns (text, provider_name, model). Raises RuntimeError if all providers fail.
    Extra kwargs (temperature, max_tokens, ...) pass straight to chat.completions.create.
    """
    errors = []
    for name in _chain(capability):
        p = config.PROVIDERS.get(name)
        if not p or not p["api_key"]:
            continue                      # provider not configured
        if name in _dead:
            continue                      # circuit-broken earlier this run
        model = p[capability]
        try:
            r = _client(name).chat.completions.create(model=model, messages=messages, **kw)
            txt = (r.choices[0].message.content or "").strip()
            if txt:
                print(f"[llm] {capability} via {model} ({name})", file=sys.stderr)
                return txt, name, model
            errors.append(f"{name}: empty response")
        except Exception as e:
            if any(s in str(e).lower() for s in ("401", "invalid api key", "quota", "insufficient")):
                _dead.add(name)           # dead key — stop retrying it this run
            errors.append(f"{name}: {e}")
            print(f"[llm] {name} failed ({e}); trying next provider", file=sys.stderr)

    raise RuntimeError(
        f"all providers failed for '{capability}' (chain={_chain(capability)}): {errors}"
    )
