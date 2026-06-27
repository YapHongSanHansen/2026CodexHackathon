// components/ui.tsx — shared presentational primitives.
import React from 'react';
import type { StageStatus } from '@shared/types';
import { CopyIcon, CheckIcon, Spinner } from './icons';
import { copyToClipboard } from '../lib/format';
import { useToast } from '../hooks/useToast';

/* ------------------------------- Card ------------------------------- */
export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-ink-700 bg-ink-800/60 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

/* --------------------------- Section header --------------------------- */
export function SectionHeader({
  badge,
  title,
  subtitle,
  right,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-forge-600/40 bg-forge-600/10 text-sm font-semibold text-forge-400">
          {badge}
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-100">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------ Buttons ------------------------------ */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'subtle' | 'ember';
};

export function Button({
  variant = 'subtle',
  className = '',
  children,
  ...rest
}: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-forge-500/60';
  const variants: Record<string, string> = {
    primary:
      'bg-forge-500 text-ink-950 hover:bg-forge-400 shadow-[0_0_0_1px_rgba(45,212,191,0.4),0_6px_20px_-8px_rgba(45,212,191,0.7)] disabled:shadow-none',
    ember:
      'bg-ember-500 text-ink-950 hover:bg-ember-400 shadow-[0_6px_20px_-8px_rgba(245,158,11,0.7)] disabled:shadow-none',
    ghost:
      'border border-ink-600 bg-transparent text-slate-200 hover:border-ink-600 hover:bg-ink-700/50',
    subtle: 'bg-ink-700/70 text-slate-200 hover:bg-ink-600/70',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* --------------------------- Copy button --------------------------- */
export function CopyButton({
  value,
  label = 'Copy',
  className = '',
  compact = false,
}: {
  value: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const toast = useToast();
  const [done, setDone] = React.useState(false);
  const onClick = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setDone(true);
      toast.push('Copied to clipboard', 'ok');
      window.setTimeout(() => setDone(false), 1200);
    } else {
      toast.push('Copy failed', 'warn');
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-700/60 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-forge-600/50 hover:text-forge-400 ${className}`}
    >
      {done ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {!compact && <span>{done ? 'Copied' : label}</span>}
    </button>
  );
}

/* ----------------------------- Status pill ----------------------------- */
export function StatusIcon({ status }: { status: StageStatus }) {
  if (status === 'running')
    return <Spinner className="h-4 w-4 text-forge-400" />;
  if (status === 'done')
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-forge-600/20 text-forge-400">
        <CheckIcon className="h-3 w-3" />
      </span>
    );
  if (status === 'error')
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500/20 text-red-400">
        ✕
      </span>
    );
  return <span className="text-sm text-slate-500" aria-hidden>▷</span>;
}

const STATUS_LABEL: Record<StageStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

export function StatusChip({ status }: { status: StageStatus }) {
  const tone: Record<StageStatus, string> = {
    queued: 'border-ink-600 bg-ink-700/50 text-slate-400',
    running: 'border-forge-600/50 bg-forge-600/10 text-forge-400',
    done: 'border-forge-600/40 bg-forge-600/15 text-forge-400',
    error: 'border-red-500/50 bg-red-500/10 text-red-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone[status]}`}
    >
      {status === 'running' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-forge-400" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ----------------------------- Progress bar ----------------------------- */
export function ProgressBar({
  value,
  status,
}: {
  value: number;
  status: StageStatus;
}) {
  const color =
    status === 'error'
      ? 'bg-red-500'
      : status === 'done'
      ? 'bg-forge-500'
      : 'bg-gradient-to-r from-forge-600 to-forge-400';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${color} ${
          status === 'running' ? 'shadow-[0_0_8px_rgba(45,212,191,0.6)]' : ''
        }`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ----------------------------- Method badge ----------------------------- */
export function MethodBadge({ method }: { method: string }) {
  const tone: Record<string, string> = {
    GET: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    POST: 'border-forge-600/40 bg-forge-600/10 text-forge-400',
    PUT: 'border-ember-500/40 bg-ember-500/10 text-ember-400',
    DELETE: 'border-red-500/40 bg-red-500/10 text-red-400',
  };
  return (
    <span
      className={`inline-block w-[52px] rounded-md border px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold ${
        tone[method] ?? 'border-ink-600 bg-ink-700/50 text-slate-300'
      }`}
    >
      {method}
    </span>
  );
}

/* --------------------------- Confidence meter --------------------------- */
export function ConfidenceMeter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value));
  const p = Math.round(v * 100);
  const color =
    v >= 0.85 ? 'bg-forge-500' : v >= 0.6 ? 'bg-ember-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${p}%` }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-slate-400">
        {p}%
      </span>
    </div>
  );
}

/* ------------------------------ Status chip (http) ------------------------------ */
export function HttpStatusChip({ status }: { status: number }) {
  const ok = status >= 200 && status < 300;
  const warn = status >= 300 && status < 400;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${
        ok
          ? 'border-forge-600/50 bg-forge-600/10 text-forge-400'
          : warn
          ? 'border-ember-500/50 bg-ember-500/10 text-ember-400'
          : 'border-red-500/50 bg-red-500/10 text-red-400'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
