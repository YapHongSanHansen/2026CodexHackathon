// components/ReviewGate.tsx — ❺ Human review gate (endpoint approval checklist).
import React, { useMemo, useState } from 'react';
import type { GeneratedEndpoint } from '@shared/types';
import {
  Card,
  SectionHeader,
  Button,
  MethodBadge,
  ConfidenceMeter,
} from './ui';
import { CheckIcon, Spinner } from './icons';

export function ReviewGate({
  endpoints,
  onApprove,
  approving,
}: {
  endpoints: GeneratedEndpoint[];
  onApprove: (approvedToolIds: string[]) => void;
  approving: boolean;
}) {
  // All checked by default. Key endpoints by method+path.
  const keyOf = (e: GeneratedEndpoint) => `${e.method} ${e.path}`;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const e of endpoints) init[keyOf(e)] = true;
    return init;
  });

  // Approve by the unique mcpTool id, NOT the path: GET/POST siblings share a
  // path (e.g. GET vs POST /invoices), so approving by path would silently
  // re-approve a de-selected sibling. The server approve handler matches mcpTool.
  const selectedTools = useMemo(
    () =>
      endpoints
        .filter((e) => checked[keyOf(e)])
        .map((e) => e.mcpTool),
    [endpoints, checked],
  );

  const selectedCount = selectedTools.length;
  const toggle = (e: GeneratedEndpoint) =>
    setChecked((c) => ({ ...c, [keyOf(e)]: !c[keyOf(e)] }));

  return (
    <Card className="overflow-hidden border-ember-500/30 p-5">
      <SectionHeader
        badge="❺"
        title="Human review gate"
        subtitle="Approve the generated surface before anything is deployed"
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ember-500/40 bg-ember-500/10 px-2.5 py-1 text-xs font-medium text-ember-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember-400" />
            Awaiting approval
          </span>
        }
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-ink-700">
        <div className="grid grid-cols-[auto_64px_1fr_auto] items-center gap-3 border-b border-ink-700 bg-ink-900/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span className="w-5" />
          <span>Method</span>
          <span>Path · MCP tool</span>
          <span className="text-right">Confidence</span>
        </div>
        <ul>
          {endpoints.map((e) => {
            const on = checked[keyOf(e)];
            return (
              <li
                key={keyOf(e)}
                className="grid grid-cols-[auto_64px_1fr_auto] items-center gap-3 border-b border-ink-700/60 px-3 py-2.5 last:border-b-0 hover:bg-ink-800/40"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(e)}
                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                    on
                      ? 'border-forge-500 bg-forge-500 text-ink-950'
                      : 'border-ink-500 bg-ink-800'
                  }`}
                  aria-label={`${on ? 'Deselect' : 'Select'} ${e.method} ${e.path}`}
                >
                  {on && <CheckIcon className="h-3.5 w-3.5" />}
                </button>
                <MethodBadge method={e.method} />
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm text-slate-100">
                    {e.path}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    <span className="font-mono text-forge-400/90">
                      {e.mcpTool}
                    </span>
                    {e.summary ? ` · ${e.summary}` : ''}
                    {e.sourceScreen ? ` · ${e.sourceScreen}` : ''}
                  </div>
                </div>
                <div className="justify-self-end">
                  <ConfidenceMeter value={e.confidence} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          <span className="font-mono text-slate-200">{selectedCount}</span> of{' '}
          <span className="font-mono text-slate-200">{endpoints.length}</span>{' '}
          endpoints selected
        </div>
        <Button
          variant="ember"
          onClick={() => onApprove(selectedTools)}
          disabled={approving || selectedCount === 0}
        >
          {approving ? (
            <>
              <Spinner className="h-4 w-4" /> Deploying…
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4" /> Approve &amp; deploy
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
