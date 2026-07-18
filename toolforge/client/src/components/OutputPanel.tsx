// components/OutputPanel.tsx — ❹ Deployed output (key, MCP URL, command, docs).
import React, { useState } from 'react';
import type { Deliverables, Artifact } from '@shared/types';
import { Card, SectionHeader, Button, CopyButton } from './ui';
import { EyeIcon, EyeOffIcon, DocIcon, LinkIcon } from './icons';
import { maskKey } from '../lib/format';

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3.5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      {children}
    </div>
  );
}

export function OutputPanel({
  deliverables,
  onOpenDocs,
}: {
  deliverables: Deliverables;
  onOpenDocs: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  const d = deliverables;

  return (
    <Card className="p-5">
      <SectionHeader
        badge="❹"
        title="Output"
        subtitle="Live REST + MCP surface, governed by your approval"
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-forge-600/40 bg-forge-600/10 px-2.5 py-1 text-xs font-medium text-forge-400">
            <span className="h-1.5 w-1.5 rounded-full bg-forge-400 shadow-[0_0_6px_rgba(94,234,212,0.9)]" />
            Deployed
          </span>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FieldRow label="API key">
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-ink-700 bg-ink-950/70 px-3 py-2 font-mono text-sm text-ember-400">
              {reveal ? d.apiKey : maskKey(d.apiKey)}
            </code>
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-slate-400 transition-colors hover:border-forge-600/50 hover:text-forge-400"
              aria-label={reveal ? 'Hide key' : 'Reveal key'}
            >
              {reveal ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
            <CopyButton value={d.apiKey} compact />
          </div>
          <div className="mt-1.5 font-mono text-[11px] text-slate-500">
            base: {d.apiBaseUrl}
          </div>
        </FieldRow>

        <FieldRow label="MCP URL">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-forge-400">
              <LinkIcon className="h-4 w-4" />
            </span>
            <code className="min-w-0 flex-1 truncate rounded-lg border border-ink-700 bg-ink-950/70 px-3 py-2 font-mono text-sm text-slate-200">
              {d.mcpUrl}
            </code>
            <CopyButton value={d.mcpUrl} compact />
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {d.mcpManifest.tools.length} tools · {d.mcpManifest.name}@
            {d.mcpManifest.version}
          </div>
        </FieldRow>
      </div>

      <div className="mt-3">
        <FieldRow label="MCP launch command">
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-lg border border-ink-700 bg-ink-950/70 px-3 py-2 font-mono text-xs text-forge-400">
              {d.mcpCommand}
            </code>
            <CopyButton value={d.mcpCommand} compact />
          </div>
        </FieldRow>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-slate-200">
            Auto-generated documentation
          </div>
          <div className="text-xs text-slate-500">
            Endpoint reference, examples and the MCP tool catalogue.
          </div>
        </div>
        <Button variant="ghost" onClick={onOpenDocs}>
          <DocIcon className="h-4 w-4" /> Open auto-docs
        </Button>
      </div>
    </Card>
  );
}
