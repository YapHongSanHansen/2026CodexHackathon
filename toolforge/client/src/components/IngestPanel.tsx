// components/IngestPanel.tsx — ❶ Upload / Connect.
import React from 'react';
import { CAPTURED_SCREENS, APP_META } from '@shared/sample-app/ubs';
import { Card, SectionHeader, Button } from './ui';
import { UploadIcon, PlayIcon, Spinner, CheckIcon } from './icons';

export function IngestPanel({
  authorized,
  onAuthorizedChange,
  mode,
  onModeChange,
  onRun,
  running,
  started,
}: {
  authorized: boolean;
  onAuthorizedChange: (v: boolean) => void;
  mode: 'demo' | 'live';
  onModeChange: (m: 'demo' | 'live') => void;
  onRun: () => void;
  running: boolean;
  started: boolean;
}) {
  const screenKind: Record<string, string> = {
    'master-data form': '🗃️',
    'transaction form': '🧾',
    report: '📊',
  };
  return (
    <Card className="p-5">
      <SectionHeader
        badge="❶"
        title="Upload / Connect"
        subtitle={`${APP_META.name} · ${APP_META.platform}`}
        right={
          <div className="flex items-center rounded-lg border border-ink-600 bg-ink-800/60 p-0.5 text-xs">
            {(['demo', 'live'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                disabled={started}
                className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors disabled:opacity-50 ${
                  mode === m
                    ? 'bg-forge-600/20 text-forge-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        {/* Dropzone */}
        <div className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-600 bg-ink-900/40 px-4 py-7 text-center transition-colors hover:border-forge-600/50">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-700/60 text-forge-400 transition-colors group-hover:bg-forge-600/15">
            <UploadIcon className="h-6 w-6" />
          </span>
          <div className="mt-2.5 text-sm font-medium text-slate-200">
            Drop screenshots &amp; screen recording
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            PNG · MP4 · captured Win32 forms — or browse
          </div>
        </div>

        {/* Connect live app */}
        <div className="flex flex-col justify-between rounded-xl border border-ink-700 bg-ink-900/40 p-4">
          <div>
            <div className="text-sm font-medium text-slate-200">
              Connect live app
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Spin up a sandbox VM and let agents operate the app via
              computer-use.
            </p>
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-forge-600/50 hover:text-forge-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ember-400" />
            Connect live app (sandbox VM)
          </button>
        </div>
      </div>

      {/* Detected screens */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Detected screens
          <span className="rounded-full bg-ink-700/70 px-1.5 py-0.5 font-mono text-[10px] text-forge-400">
            {CAPTURED_SCREENS.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CAPTURED_SCREENS.map((s) => (
            <span
              key={s.id}
              title={`${s.kind} · ${s.fields.length} fields`}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800/60 py-1 pl-2 pr-2.5 text-xs text-slate-300"
            >
              <span aria-hidden>{screenKind[s.kind] ?? '🖥️'}</span>
              {s.title}
              <span className="font-mono text-[10px] text-slate-500">
                {s.fields.length}f
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Authorize + Run */}
      <div className="mt-5 flex flex-col gap-3 border-t border-ink-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-start gap-2.5 select-none">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
              authorized
                ? 'border-forge-500 bg-forge-500 text-ink-950'
                : 'border-ink-500 bg-ink-800'
            }`}
          >
            {authorized && <CheckIcon className="h-3.5 w-3.5" />}
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={authorized}
            onChange={(e) => onAuthorizedChange(e.target.checked)}
          />
          <span className="text-xs leading-snug text-slate-300">
            I confirm I&apos;m authorised to integrate this app
            <span className="block text-[11px] text-slate-500">
              Required — gates the pipeline run.
            </span>
          </span>
        </label>

        <Button
          variant="primary"
          onClick={onRun}
          disabled={!authorized || running || started}
          className="shrink-0"
        >
          {running ? (
            <>
              <Spinner className="h-4 w-4" /> Starting…
            </>
          ) : started ? (
            <>
              <CheckIcon className="h-4 w-4" /> Pipeline running
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" /> Run pipeline
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
