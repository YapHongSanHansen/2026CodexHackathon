// components/TestPlayground.tsx — ❻ Test playground against the generated API.
import React, { useEffect, useMemo, useState } from 'react';
import type { McpTool, McpManifest } from '@shared/types';
import {
  Card,
  SectionHeader,
  Button,
  HttpStatusChip,
  MethodBadge,
} from './ui';
import { SendIcon, Spinner } from './icons';
import { prettyJson } from '../lib/format';
import type { TestResult } from '../lib/api';

// Sensible per-tool defaults (matches the UBS seed data).
const TOOL_DEFAULTS: Record<string, Record<string, unknown>> = {
  list_customers: {},
  get_customer: { code: '300-A001' },
  create_invoice: {
    customerCode: '300-A001',
    lines: [{ stockCode: 'SKU-1001', qty: 3 }],
  },
  list_invoices: {},
  list_stock: {},
  record_payment: {
    invoiceNumber: 'IV-2024-0188',
    amount: 600,
    method: 'Bank Transfer',
  },
};

type FieldType = 'string' | 'number' | 'boolean' | 'json';

interface Field {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
}

function fieldsFromSchema(tool: McpTool): Field[] {
  const schema = tool.inputSchema ?? {};
  const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = new Set<string>(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );
  return Object.entries(props).map(([name, def]) => {
    const t = String(def.type ?? 'string');
    let type: FieldType = 'string';
    if (t === 'number' || t === 'integer') type = 'number';
    else if (t === 'boolean') type = 'boolean';
    else if (t === 'array' || t === 'object') type = 'json';
    return {
      name,
      type,
      required: required.has(name),
      description: typeof def.description === 'string' ? def.description : undefined,
    };
  });
}

function initialValues(tool: McpTool): Record<string, string> {
  const defaults = TOOL_DEFAULTS[tool.name] ?? {};
  const fields = fieldsFromSchema(tool);
  const out: Record<string, string> = {};
  for (const f of fields) {
    const d = (defaults as Record<string, unknown>)[f.name];
    if (d === undefined) {
      out[f.name] = f.type === 'json' ? '' : '';
    } else if (f.type === 'json') {
      out[f.name] = prettyJson(d);
    } else {
      out[f.name] = String(d);
    }
  }
  return out;
}

function buildArgs(
  fields: Field[],
  values: Record<string, string>,
): { args: Record<string, unknown>; error?: string } {
  const args: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.name];
    if (raw === undefined || raw === '') {
      if (f.required) return { args, error: `Field "${f.name}" is required` };
      continue;
    }
    if (f.type === 'number') {
      const n = Number(raw);
      if (Number.isNaN(n)) return { args, error: `"${f.name}" must be a number` };
      args[f.name] = n;
    } else if (f.type === 'boolean') {
      args[f.name] = raw === 'true';
    } else if (f.type === 'json') {
      try {
        args[f.name] = JSON.parse(raw);
      } catch {
        return { args, error: `"${f.name}" must be valid JSON` };
      }
    } else {
      args[f.name] = raw;
    }
  }
  return { args };
}

export function TestPlayground({
  manifest,
  onSend,
}: {
  manifest: McpManifest;
  onSend: (tool: string, args: Record<string, unknown>) => Promise<TestResult>;
}) {
  const tools = manifest.tools;
  const [toolName, setToolName] = useState(tools[0]?.name ?? '');
  const tool = useMemo(
    () => tools.find((t) => t.name === toolName) ?? tools[0],
    [tools, toolName],
  );
  const fields = useMemo(() => (tool ? fieldsFromSchema(tool) : []), [tool]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    tool ? initialValues(tool) : {},
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (tool) {
      setValues(initialValues(tool));
      setResult(null);
      setErr(null);
    }
  }, [tool]);

  const send = async () => {
    if (!tool) return;
    const { args, error } = buildArgs(fields, values);
    if (error) {
      setErr(error);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await onSend(tool.name, args);
      setResult(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <SectionHeader
        badge="❻"
        title="Test playground"
        subtitle="Exercise the generated MCP tools against live seed data"
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Request */}
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Tool
            </label>
            <div className="relative">
              <select
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                className="w-full appearance-none rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-2 pr-9 font-mono text-sm text-slate-100 outline-none transition-colors focus:border-forge-600/60"
              >
                {tools.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                ▾
              </span>
            </div>
            {tool && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                <MethodBadge method={tool.rest.method} />
                <span className="font-mono">{tool.rest.path}</span>
              </div>
            )}
          </div>

          {tool && <p className="text-xs text-slate-400">{tool.description}</p>}

          <div className="space-y-2.5">
            {fields.length === 0 && (
              <div className="rounded-lg border border-dashed border-ink-600 bg-ink-900/40 px-3 py-2.5 text-xs text-slate-500">
                No parameters — this tool takes an empty body.
              </div>
            )}
            {fields.map((f) => (
              <div key={f.name}>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="font-mono">{f.name}</span>
                  {f.required && <span className="text-ember-400">*</span>}
                  <span className="font-mono text-[10px] text-slate-600">
                    {f.type}
                  </span>
                </label>
                {f.type === 'json' ? (
                  <textarea
                    value={values[f.name] ?? ''}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.name]: e.target.value }))
                    }
                    rows={4}
                    spellCheck={false}
                    className="w-full resize-y rounded-lg border border-ink-600 bg-ink-950/70 px-3 py-2 font-mono text-xs text-slate-100 outline-none transition-colors focus:border-forge-600/60"
                  />
                ) : f.type === 'boolean' ? (
                  <select
                    value={values[f.name] ?? 'false'}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.name]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-forge-600/60"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                ) : (
                  <input
                    value={values[f.name] ?? ''}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.name]: e.target.value }))
                    }
                    type={f.type === 'number' ? 'number' : 'text'}
                    placeholder={f.description}
                    className="w-full rounded-lg border border-ink-600 bg-ink-950/70 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition-colors focus:border-forge-600/60"
                  />
                )}
              </div>
            ))}
          </div>

          <Button variant="primary" onClick={send} disabled={busy} className="w-full">
            {busy ? (
              <>
                <Spinner className="h-4 w-4" /> Sending…
              </>
            ) : (
              <>
                <SendIcon className="h-4 w-4" /> Send
              </>
            )}
          </Button>
          {err && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {err}
            </div>
          )}
        </div>

        {/* Response */}
        <div className="flex flex-col rounded-xl border border-ink-700 bg-ink-950/60">
          <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
            <span className="font-mono text-xs text-slate-400">response</span>
            {result && <HttpStatusChip status={result.status} />}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {result ? (
              <div className="space-y-2">
                <div className="font-mono text-[11px] text-slate-500">
                  {result.request.method} {result.request.url}
                </div>
                <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
                  <code>{prettyJson(result.data)}</code>
                </pre>
              </div>
            ) : (
              <div className="flex h-full min-h-[180px] items-center justify-center text-xs text-slate-600">
                Send a request to see the response.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
