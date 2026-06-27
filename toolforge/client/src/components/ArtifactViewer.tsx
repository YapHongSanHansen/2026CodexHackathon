// components/ArtifactViewer.tsx — slide-over drawer that renders an artifact.
// Markdown/docs are rendered with the in-house renderer; openapi/mcp-manifest
// are pretty-printed JSON in a mono block.
import React, { useEffect } from 'react';
import type { Artifact } from '@shared/types';
import { Markdown } from '../lib/Markdown';
import { prettyJson } from '../lib/format';
import { XIcon, DocIcon } from './icons';
import { CopyButton } from './ui';

function isJsonArtifact(a: Artifact): boolean {
  return (
    a.kind === 'openapi' ||
    a.kind === 'mcp-manifest' ||
    /\.json$/i.test(a.name)
  );
}

function jsonForCopy(a: Artifact): string {
  // content is already a string; for JSON artifacts re-pretty-print if possible.
  if (isJsonArtifact(a)) {
    try {
      return prettyJson(JSON.parse(a.content));
    } catch {
      return a.content;
    }
  }
  return a.content;
}

export function ArtifactViewer({
  artifact,
  onClose,
}: {
  artifact: Artifact | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!artifact) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [artifact, onClose]);

  if (!artifact) return null;

  const json = isJsonArtifact(artifact);
  const copyText = jsonForCopy(artifact);
  let body: React.ReactNode;
  if (json) {
    let pretty = artifact.content;
    try {
      pretty = prettyJson(JSON.parse(artifact.content));
    } catch {
      /* keep raw */
    }
    body = (
      <pre className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950/70 p-4 font-mono text-xs leading-relaxed text-slate-200">
        <code>{pretty}</code>
      </pre>
    );
  } else {
    body = <Markdown source={artifact.content} />;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* drawer */}
      <aside
        className="relative flex h-full w-full max-w-2xl animate-[slideIn_220ms_cubic-bezier(0.16,1,0.3,1)] flex-col border-l border-ink-700 bg-ink-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={artifact.name}
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-forge-400">
              <DocIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-mono text-sm text-slate-100">
                {artifact.name}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Group {artifact.groupId} · {artifact.kind}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton value={copyText} label="Copy" />
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-slate-400 transition-colors hover:border-ink-500 hover:text-slate-100"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{body}</div>
      </aside>
    </div>
  );
}
