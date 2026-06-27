// components/Sidebar.tsx — project card, agent-pipeline list, and output mini-list.
import React from 'react';
import {
  AGENT_GROUPS,
  type PipelineState,
  type StageState,
  type GroupId,
} from '@shared/types';
import { StatusIcon } from './ui';

const DEFAULT_STAGE = (id: GroupId): StageState => ({
  id,
  status: 'queued',
  progress: 0,
  message: 'Waiting to start',
});

function ProjectCard({ state }: { state: PipelineState | null }) {
  const projectName = state?.projectName ?? 'UBS Acct v9';
  const appName = state?.appName ?? 'Sage UBS Accounting v9';
  return (
    <div className="rounded-xl border border-ink-700 bg-gradient-to-b from-ink-800/80 to-ink-800/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Project
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forge-600/15 text-base">
          🗂️
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">
            {projectName}
          </div>
          <div className="truncate text-xs text-slate-400">{appName}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['no API', 'no docs', 'no source'].map((t) => (
          <span
            key={t}
            className="rounded-md border border-ember-500/30 bg-ember-500/5 px-1.5 py-0.5 font-mono text-[10px] text-ember-400"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function PipelineList({ state }: { state: PipelineState | null }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Agent Pipeline
        </span>
        <span className="font-mono text-[10px] text-slate-600">A·B·C·D</span>
      </div>
      <ul className="space-y-1.5">
        {AGENT_GROUPS.map((g) => {
          const stage = state?.stages?.[g.id] ?? DEFAULT_STAGE(g.id);
          const active = stage.status === 'running';
          return (
            <li
              key={g.id}
              className={`rounded-lg border px-3 py-2 transition-colors ${
                active
                  ? 'border-forge-600/40 bg-forge-600/[0.06]'
                  : 'border-ink-700/70 bg-ink-800/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center">
                  <StatusIcon status={stage.status} />
                </span>
                <span className="font-mono text-xs font-semibold text-slate-300">
                  {g.id}
                </span>
                <span className="flex-1 truncate text-xs text-slate-300">
                  {g.short}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-slate-500">
                  {stage.status === 'queued' ? '—' : `${Math.round(stage.progress)}%`}
                </span>
              </div>
              {stage.status !== 'queued' && (
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-700">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      stage.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-forge-600 to-forge-400'
                    }`}
                    style={{ width: `${Math.min(100, stage.progress)}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OutputItem({
  label,
  ready,
  value,
}: {
  label: string;
  ready: boolean;
  value?: string;
}) {
  return (
    <li
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
        ready
          ? 'border-forge-600/40 bg-forge-600/[0.06]'
          : 'border-ink-700/70 bg-ink-800/30'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ready ? 'bg-forge-400 shadow-[0_0_6px_rgba(94,234,212,0.8)]' : 'bg-ink-600'
        }`}
      />
      <span
        className={`text-xs ${ready ? 'text-slate-200' : 'text-slate-500'}`}
      >
        {label}
      </span>
      {ready && value && (
        <span className="ml-auto truncate font-mono text-[10px] text-slate-500">
          {value}
        </span>
      )}
    </li>
  );
}

export function Sidebar({ state }: { state: PipelineState | null }) {
  const deployed = state?.phase === 'deployed' && !!state.deliverables;
  const d = state?.deliverables;
  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-5 border-r border-ink-700 bg-ink-900/40 p-5">
      <ProjectCard state={state} />
      <PipelineList state={state} />
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Output
        </div>
        <ul className="space-y-1.5">
          <OutputItem
            label="API key"
            ready={deployed}
            value={d ? 'issued' : undefined}
          />
          <OutputItem
            label="MCP URL"
            ready={deployed}
            value={d ? 'live' : undefined}
          />
          <OutputItem label="Auto-docs" ready={deployed} value={d ? 'ready' : undefined} />
        </ul>
      </div>
      <div className="mt-auto rounded-lg border border-ink-700/70 bg-ink-800/30 p-3 text-[11px] leading-relaxed text-slate-500">
        <span className="text-forge-400">ToolForge</span> turns a legacy app
        with no API into a governed REST + MCP surface — observed, synthesised,
        human-approved.
      </div>
    </aside>
  );
}
