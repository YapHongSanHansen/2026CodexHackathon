// App.tsx — ToolForge "Conversion Studio" root.
import React, { useCallback, useMemo, useState } from 'react';
import type { Artifact, McpManifest } from '@shared/types';
import { apiClient, type TestResult } from './lib/api';
import { usePipeline } from './hooks/usePipeline';
import { ToastProvider, useToast } from './hooks/useToast';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { IngestPanel } from './components/IngestPanel';
import { PipelinePanel } from './components/PipelinePanel';
import { LogConsole } from './components/LogConsole';
import { ReviewGate } from './components/ReviewGate';
import { OutputPanel } from './components/OutputPanel';
import { TestPlayground } from './components/TestPlayground';
import { ArtifactViewer } from './components/ArtifactViewer';

const USER_EMAIL = 'yaphongsan@gmail.com';

function Studio() {
  const toast = useToast();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [starting, setStarting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [openArtifact, setOpenArtifact] = useState<Artifact | null>(null);

  const { state, logs, connected, streamError } = usePipeline(projectId);

  const phase = state?.phase;
  const started = !!projectId;

  // Lazily create the project on Run (with authorized:true), then run.
  const handleRun = useCallback(async () => {
    if (!authorized || starting || projectId) return;
    setStarting(true);
    try {
      const created = await apiClient.createProject({
        projectName: 'UBS Acct v9',
        appName: 'Sage UBS Accounting v9',
        mode,
        authorized: true,
      });
      setProjectId(created.id); // opens SSE
      await apiClient.run(created.id);
      toast.push('Pipeline started', 'ok');
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to start', 'warn');
      setProjectId(null);
    } finally {
      setStarting(false);
    }
  }, [authorized, starting, projectId, mode, toast]);

  const handleApprove = useCallback(
    async (approvedPaths: string[]) => {
      if (!projectId) return;
      setApproving(true);
      try {
        await apiClient.approve(projectId, approvedPaths);
        toast.push('Approved — deploying surface', 'ok');
      } catch (e) {
        toast.push(e instanceof Error ? e.message : 'Approve failed', 'warn');
      } finally {
        setApproving(false);
      }
    },
    [projectId, toast],
  );

  const handleTest = useCallback(
    (tool: string, args: Record<string, unknown>): Promise<TestResult> => {
      if (!projectId) return Promise.reject(new Error('No project'));
      return apiClient.test(projectId, tool, args);
    },
    [projectId],
  );

  // Docs artifact: prefer a real artifact; fall back to deliverables.docsMarkdown.
  const docsArtifact = useMemo<Artifact | null>(() => {
    const fromArtifacts = state?.artifacts.find((a) => a.kind === 'docs');
    if (fromArtifacts) return fromArtifacts;
    const md =
      state?.deliverables?.docsMarkdown ?? state?.draft?.docsMarkdown;
    if (md) {
      return {
        id: 'auto-docs',
        groupId: 'D',
        name: 'auto-docs.md',
        kind: 'docs',
        content: md,
      };
    }
    return null;
  }, [state]);

  const reviewEndpoints = state?.draft?.endpoints ?? [];
  const manifest: McpManifest | undefined =
    state?.deliverables?.mcpManifest ?? state?.draft?.mcpManifest;

  return (
    <div className="studio-bg flex h-screen min-w-[1100px] flex-col bg-ink-950 text-slate-200">
      <TopBar connected={connected} email={USER_EMAIL} />

      <div className="flex min-h-0 flex-1">
        <Sidebar state={state} />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-5 p-6">
            <IngestPanel
              authorized={authorized}
              onAuthorizedChange={setAuthorized}
              mode={mode}
              onModeChange={setMode}
              onRun={handleRun}
              running={starting}
              started={started}
            />

            {streamError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm"
              >
                <span className="mt-0.5 text-ember-400">⚠</span>
                <div>
                  <div className="font-medium text-ember-300">Pipeline error</div>
                  <div className="text-ember-300/80">{streamError}</div>
                </div>
              </div>
            )}

            {started && (
              <>
                <PipelinePanel state={state} onOpenArtifact={setOpenArtifact} />
                <LogConsole logs={logs} />
              </>
            )}

            {phase === 'awaiting_review' && reviewEndpoints.length > 0 && (
              <ReviewGate
                endpoints={reviewEndpoints}
                onApprove={handleApprove}
                approving={approving}
              />
            )}

            {phase === 'deployed' && state?.deliverables && (
              <>
                <OutputPanel
                  deliverables={state.deliverables}
                  onOpenDocs={() => {
                    if (docsArtifact) setOpenArtifact(docsArtifact);
                  }}
                />
                {manifest && (
                  <TestPlayground manifest={manifest} onSend={handleTest} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <ArtifactViewer
        artifact={openArtifact}
        onClose={() => setOpenArtifact(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Studio />
    </ToastProvider>
  );
}
