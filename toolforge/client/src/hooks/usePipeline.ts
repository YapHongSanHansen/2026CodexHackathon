// hooks/usePipeline.ts — subscribes to the SSE event stream for a project,
// maintaining the latest PipelineState and an append-only log buffer.
import { useEffect, useRef, useState } from 'react';
import {
  API,
  type PipelineState,
  type PipelineEvent,
  type GroupId,
  type LogLevel,
} from '@shared/types';

export interface LogEntry {
  id: number;
  groupId?: GroupId;
  level: LogLevel;
  message: string;
  ts: number;
}

export interface PipelineFeed {
  state: PipelineState | null;
  logs: LogEntry[];
  connected: boolean;
  streamError: string | null;
}

const MAX_LOGS = 500;

export function usePipeline(projectId: string | null): PipelineFeed {
  const [state, setState] = useState<PipelineState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const logSeq = useRef(0);

  useEffect(() => {
    if (!projectId) {
      setState(null);
      setLogs([]);
      setConnected(false);
      setStreamError(null);
      return;
    }

    // Reset buffers when switching projects.
    setLogs([]);
    setStreamError(null);
    logSeq.current = 0;

    const es = new EventSource(API.events(projectId));

    es.onopen = () => {
      setConnected(true);
      setStreamError(null);
    };

    es.onmessage = (ev: MessageEvent<string>) => {
      let parsed: PipelineEvent;
      try {
        parsed = JSON.parse(ev.data) as PipelineEvent;
      } catch {
        return;
      }
      if (parsed.type === 'state') {
        setState(parsed.state);
      } else if (parsed.type === 'log') {
        const entry: LogEntry = {
          id: logSeq.current++,
          groupId: parsed.groupId,
          level: parsed.level ?? 'info',
          message: parsed.message,
          ts: parsed.ts,
        };
        setLogs((prev) => {
          const next = prev.length >= MAX_LOGS ? prev.slice(-MAX_LOGS + 1) : prev;
          return [...next, entry];
        });
      } else if (parsed.type === 'error') {
        setStreamError(parsed.message);
        setLogs((prev) => [
          ...prev,
          {
            id: logSeq.current++,
            level: 'warn',
            message: parsed.message,
            ts: Date.now(),
          },
        ]);
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; reflect the transient drop in UI.
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [projectId]);

  return { state, logs, connected, streamError };
}
