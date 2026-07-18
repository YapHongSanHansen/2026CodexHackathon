// server/src/llm/index.ts — optional live OpenAI adapter.
//
// DEMO MODE MUST WORK WITH NO DEPENDENCY INSTALLED. The `openai` SDK IS a declared
// dependency, but it is still imported *dynamically* inside a try/catch so a missing
// or broken install can never break the build or the run. Every failure path returns
// null so the caller can fall back to the demo markdown.

/**
 * The OpenAI model used for live generation. Read lazily from the environment
 * (OPENAI_MODEL) so a value loaded from .env at boot is always picked up,
 * regardless of module load order. Defaults to gpt-4o (broadly available,
 * supports text + vision + temperature + max_tokens).
 */
export function modelId(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

/**
 * True only when live generation is plausible: an API key is present. The dynamic
 * import of the SDK is awaited lazily by callers; here we only do the cheap
 * env-var check synchronously.
 */
export function liveModeAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

const SYSTEM_BY_KIND: Record<'mock' | 'behavior' | 'internal' | 'synthesis', string> = {
  mock:
    'You are Group A (Vision/OCR) in an AI pipeline that reverse-engineers a legacy ' +
    'desktop app into a REST API. From captured screenshots, write a precise, ' +
    'specific Markdown "mock spec" describing how the app appears to work: per-screen ' +
    'field/action tables, an "appears to do" narrative, and low-confidence flags.',
  behavior:
    'You are Group B (Interaction) in an AI pipeline. You drove the live legacy app ' +
    'in a sandbox. Write a Markdown "behavior spec" documenting observed input→output ' +
    'flows, validation rules, a function-key map, and sample round-trips.',
  internal:
    'You are Group C (Observation) in an AI pipeline. Using observational reverse-' +
    'engineering only (UI-state transitions + passive network capture, NO binary ' +
    'decompilation), write a Markdown "internal spec": inferred data entities + fields, ' +
    'candidate CRUD operations, and network/UI-state observations. State explicitly ' +
    'that no decompilation was used.',
  synthesis:
    'You are Group D (Synthesis) in an AI pipeline. Reconcile Group B (behavior) and ' +
    'Group C (internal) findings into a Markdown "synthesis spec": the reconciliation, ' +
    'conflicts resolved, gaps filled, a proposed REST endpoint table, and a human-review note.',
};

/**
 * Attempt a live artifact generation via OpenAI. Returns the model's Markdown
 * text, or null on any failure (missing package, missing key, API error,
 * refusal, content filter, or an empty/odd response). NEVER throws.
 */
export async function generateArtifact(
  kind: 'mock' | 'behavior' | 'internal' | 'synthesis',
  context: string,
): Promise<string | null> {
  if (!liveModeAvailable()) return null;

  try {
    // Dynamic import so a missing/broken optional dependency cannot break
    // build/run. The specifier is held in a variable so the compiler does NOT
    // statically resolve it.
    const sdkSpecifier = 'openai';
    const mod: any = await import(/* @vite-ignore */ sdkSpecifier).catch(() => null);
    if (!mod) return null;

    const OpenAI = mod.default ?? mod.OpenAI ?? mod;
    if (typeof OpenAI !== 'function') return null;

    // baseURL is optional — only pass it when OPENAI_BASE_URL is set, so the SDK
    // defaults to https://api.openai.com otherwise. (Lets you point at an
    // OpenAI-compatible provider without code changes.)
    const baseURL = process.env.OPENAI_BASE_URL;
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(baseURL ? { baseURL } : {}),
    });

    const response = await client.chat.completions.create({
      model: modelId(),
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_BY_KIND[kind] },
        {
          role: 'user',
          content:
            `Here is the captured context for the legacy app under study:\n\n${context}\n\n` +
            `Write the ${kind} Markdown spec now. Output only the Markdown document.`,
        },
      ],
    });

    const choice = response?.choices?.[0];

    // A content filter or an explicit refusal means there is no usable content —
    // fall back to demo markdown rather than return something empty/odd.
    if (choice?.finish_reason === 'content_filter') return null;
    if (choice?.message?.refusal) return null;

    const text = (choice?.message?.content ?? '').trim();
    return text.length > 0 ? text : null;
  } catch {
    // Network error, auth error, malformed response — anything: fall back.
    return null;
  }
}
