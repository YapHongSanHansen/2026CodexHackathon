// components/TopBar.tsx — wordmark, nav, account chip, connection indicator.
import React from 'react';
import { AnvilLogo } from './icons';

export function TopBar({
  connected,
  email,
}: {
  connected: boolean;
  email: string;
}) {
  const initial = email ? email[0].toUpperCase() : 'U';
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-700 bg-ink-900/70 px-5 backdrop-blur">
      <div className="flex items-center gap-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-forge-500 to-forge-600 text-ink-950 shadow-[0_4px_14px_-4px_rgba(45,212,191,0.6)]">
            <AnvilLogo className="h-5 w-5" />
          </span>
          <div className="leading-none">
            <div className="text-[15px] font-bold tracking-tight text-slate-100">
              Tool<span className="text-forge-400">Forge</span>
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Conversion Studio
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: 'Projects', active: true },
            { label: 'Marketplace', active: false },
            { label: 'Docs', active: false },
          ].map((n) => (
            <span
              key={n.label}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
                n.active
                  ? 'bg-ink-700/60 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {n.label}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800/60 px-2.5 py-1 text-[11px] text-slate-400"
          title={connected ? 'Live event stream connected' : 'Stream offline'}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected
                ? 'bg-forge-400 shadow-[0_0_6px_rgba(94,234,212,0.9)]'
                : 'bg-slate-600'
            } ${connected ? 'animate-pulse' : ''}`}
          />
          {connected ? 'Live' : 'Offline'}
        </span>
        <div className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-800/60 py-1 pl-1 pr-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-forge-500 to-ember-500 text-xs font-semibold text-ink-950">
            {initial}
          </span>
          <span className="hidden max-w-[160px] truncate text-xs text-slate-300 sm:block">
            {email}
          </span>
        </div>
      </div>
    </header>
  );
}
