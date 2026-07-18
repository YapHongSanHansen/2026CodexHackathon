// components/PipelinePanel.tsx — ❸ Live pipeline rows with artifact badges.
import React from 'react';
import {
  AGENT_GROUPS,
  type PipelineState,
  type Artifact,
  type StageState,
  type GroupId,
} from '@shared/types';
import {
  Card,
  SectionHeader,
  ProgressBar,
  StatusChip,
} from './ui';
import { DocIcon } from './icons';

const DEFAULT_STAGE = (id: GroupId): StageState => ({
  id,
  status: 'queued',
  progress: 0,
  message: 'Waiting to start',
});

function ArtifactBadge({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: (a: Artifact) => void;
}) {
  const json = artifact.kind === 'openapi' || artifact.kind === 'mcp-manifest';
  return (
    <button
      type="button"
      onClick={() => onOpen(artifact)}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
        json
          ? 'border-sky-500/30 bg-sky-500/5 text-sky-300 hover:border-sky-500/60'
          : 'border-forge-600/30 bg-forge-600/5 text-forge-400 hover:border-forge-600/60'
      }`}
      title={`Open ${artifact.name}`}
    >
      <DocIcon className="h-3.5 w-3.5" />
      {artifact.name}
    </button>
  );
}

export function PipelinePanel({
  state,
  onOpenArtifact,
}: {
  state: PipelineState | null;
  onOpenArtifact: (a: Artifact) => void;
}) {
  const artifactsByGroup: Record<string, Artifact[]> = {};
  for (const a of state?.artifacts ?? []) {
    (artifactsByGroup[a.groupId] ??= []).push(a);
  }

  const stages = state?.stages;
  const overall =
    stages
      ? Math.round(
          (Object.values(stages).reduce((s, st) => s + st.progress, 0) /
            (AGENT_GROUPS.length * 100)) *
            100,
        )
      : 0;

  return (
    <Card className="p-5">
      <SectionHeader
        badge="❸"
        title="Live pipeline"
        subtitle="Four agent groups triangulate the legacy app in parallel"
        right={
          <div className="text-right">
            <div className="font-mono text-lg font-semibold tabular-nums text-forge-400">
              {overall}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              overall
            </div>
          </div>
        }
      />

      <div className="mt-4 space-y-2.5">
        {AGENT_GROUPS.map((g) => {
          const stage = stages?.[g.id] ?? DEFAULT_STAGE(g.id);
          const arts = artifactsByGroup[g.id] ?? [];
          return (
            <div
              key={g.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                stage.status === 'running'
                  ? 'border-forge-600/40 bg-forge-600/[0.05]'
                  : 'border-ink-700 bg-ink-900/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 font-mono text-sm font-semibold text-slate-200">
                  {g.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">
                      {g.name}
                    </span>
                    <span className="hidden text-[11px] text-slate-500 sm:inline">
                      {g.input}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {stage.message || g.description}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-slate-300">
                    {stage.status === 'queued'
                      ? '—'
                      : `${Math.round(stage.progress)}%`}
                  </span>
                  <StatusChip status={stage.status} />
                </div>
              </div>

              <div className="mt-2.5">
                <ProgressBar value={stage.progress} status={stage.status} />
              </div>

              {arts.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {arts.map((a) => (
                    <ArtifactBadge
                      key={a.id}
                      artifact={a}
                      onOpen={onOpenArtifact}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
