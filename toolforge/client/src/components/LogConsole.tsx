// components/LogConsole.tsx — streaming SSE log viewer.
import React, { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../hooks/usePipeline';
import { relTime } from '../lib/format';

const LEVEL_TONE: Record<string, string> = {
  info: 'text-slate-300',
  ok: 'text-forge-400',
  warn: 'text-ember-400',
};

const GROUP_TONE: Record<string, string> = {
  A: 'bg-sky-500/15 text-sky-300',
  B: 'bg-forge-600/15 text-forge-400',
  C: 'bg-ember-500/15 text-ember-400',
  D: 'bg-violet-500/15 text-violet-300',
};

export function LogConsole({ logs }: { logs: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-950/70">
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-ember-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-forge-500/70" />
          </span>
          <span className="ml-1 font-mono text-xs text-slate-400">
            pipeline.log
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
          <span>{logs.length} events</span>
          {!autoScroll && (
            <button
              type="button"
              onClick={() => setAutoScroll(true)}
              className="rounded border border-ink-600 px-1.5 py-0.5 text-slate-400 hover:text-forge-400"
            >
              ↓ follow
            </button>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-48 overflow-y-auto px-4 py-2.5 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-600">
            Awaiting pipeline events…
          </div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex gap-2 py-px">
              <span className="shrink-0 select-none text-slate-600">
                {relTime(l.ts)}
              </span>
              {l.groupId ? (
                <span
                  className={`shrink-0 rounded px-1 text-[10px] font-semibold ${
                    GROUP_TONE[l.groupId] ?? 'bg-ink-700 text-slate-400'
                  }`}
                >
                  {l.groupId}
                </span>
              ) : (
                <span className="shrink-0 rounded bg-ink-700/60 px-1 text-[10px] text-slate-500">
                  sys
                </span>
              )}
              <span className={`min-w-0 break-words ${LEVEL_TONE[l.level] ?? 'text-slate-300'}`}>
                {l.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
