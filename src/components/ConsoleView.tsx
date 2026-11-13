import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Info,
  Loader2,
  Terminal,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  ConsoleLogMessage,
  Diagnostic,
  ExecutionResult,
  LanguageDefinition,
} from '../types/playground';
import { parseAnsi } from '../utils/ansi';
import { MOD_KEY } from '../utils/shortcuts';

interface ConsoleViewProps {
  language: LanguageDefinition;
  result: ExecutionResult | null;
  isRunning: boolean;
  webLogs: ConsoleLogMessage[];
  onJumpToLine: (line: number, column?: number) => void;
}

type StreamFilter = 'all' | 'stdout' | 'stderr';

function AnsiBlock({ text, fallbackColor }: { text: string; fallbackColor?: string }) {
  const segments = useMemo(() => parseAnsi(text), [text]);
  return (
    <pre
      className="m-0 font-mono-code text-[12.5px] leading-[1.6] whitespace-pre-wrap break-words"
      style={{ color: fallbackColor ?? 'var(--text-primary)' }}
    >
      {segments.map((seg, i) => (
        <span
          key={i}
          style={{
            color: seg.color,
            backgroundColor: seg.bgColor,
            fontWeight: seg.bold ? 600 : undefined,
            opacity: seg.dim ? 0.72 : undefined,
            fontStyle: seg.italic ? 'italic' : undefined,
            textDecoration: seg.underline ? 'underline' : undefined,
          }}
        >
          {seg.text}
        </span>
      ))}
    </pre>
  );
}

function DiagnosticRow({
  diagnostic,
  onClick,
}: {
  diagnostic: Diagnostic;
  onClick: () => void;
}) {
  const isError = diagnostic.severity === 'error';
  const isWarn = diagnostic.severity === 'warning';
  const Icon = isError ? AlertCircle : isWarn ? AlertTriangle : Info;
  const colorClass = isError
    ? 'text-rose-400 border-rose-500/25 bg-rose-500/8 hover:bg-rose-500/15'
    : isWarn
      ? 'text-amber-400 border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15'
      : 'text-sky-400 border-sky-500/25 bg-sky-500/8 hover:bg-sky-500/15';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors ${colorClass}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0">
          <div className="font-mono-code text-[11px] font-semibold">
            Ln {diagnostic.line}, Col {diagnostic.column}
            {diagnostic.source && (
              <span className="ml-1.5 font-normal opacity-75">[{diagnostic.source}]</span>
            )}
          </div>
          <div
            className="mt-0.5 text-xs leading-snug break-words"
            style={{ color: 'var(--text-primary)' }}
          >
            {diagnostic.message}
          </div>
        </div>
      </div>
      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
    </button>
  );
}

export function ConsoleView({
  language,
  result,
  isRunning,
  webLogs,
  onJumpToLine,
}: ConsoleViewProps) {
  const [filter, setFilter] = useState<StreamFilter>('all');

  if (language.id === 'web') {
    return (
      <div className="flex h-full flex-col">
        {webLogs.length === 0 ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            <Terminal className="h-6 w-6 opacity-50" />
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Browser Console Ready
            </div>
            <p className="max-w-xs text-[11px] leading-relaxed">
              Calls to <code className="font-mono-code">console.log()</code>, warnings, and
              runtime errors inside the Web Preview appear here.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-1 overflow-y-auto p-3 font-mono-code text-xs">
            {webLogs.map((log) => {
              const style =
                log.level === 'error'
                  ? 'border-rose-500/25 bg-rose-500/8 text-rose-300'
                  : log.level === 'warn'
                    ? 'border-amber-500/25 bg-amber-500/8 text-amber-300'
                    : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-primary)]';

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 rounded border px-2.5 py-1.5 ${style}`}
                >
                  <span className="mt-0.5 shrink-0 text-[10px] uppercase opacity-60">
                    {log.level}
                  </span>
                  <pre className="m-0 flex-1 whitespace-pre-wrap break-words leading-relaxed">
                    {log.args.join(' ')}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (isRunning && !result) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2.5"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-xs font-medium">
          Running on {language.engine === 'local' ? 'Local Engine' : 'Compiler Engine'}...
        </span>
      </div>
    );
  }

  if (!result) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        <Terminal className="h-6 w-6 opacity-45" />
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Ready to execute {language.name}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>Press</span>
          <kbd className="studio-kbd">{MOD_KEY}</kbd>
          <span>+</span>
          <kbd className="studio-kbd">Enter</kbd>
          <span>or click Run</span>
        </div>
      </div>
    );
  }

  const hasStdout = Boolean(result.stdout);
  const hasStderr = Boolean(result.stderr);
  const hasDiagnostics = result.diagnostics.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Stream Filter Bar when both stdout & stderr exist or diagnostics exist */}
      {(hasStdout || hasStderr) && (
        <div
          className="flex shrink-0 items-center justify-between border-b px-3 py-1.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all' as const, label: 'Unified' },
                { id: 'stdout' as const, label: 'stdout', has: hasStdout },
                { id: 'stderr' as const, label: 'stderr', has: hasStderr },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: filter === tab.id ? 'var(--bg-active)' : 'transparent',
                  color: filter === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <span>{tab.label}</span>
                {tab.id === 'stderr' && hasStderr && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                )}
              </button>
            ))}
          </div>

          {isRunning && (
            <span
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: 'var(--accent)' }}
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Running...
            </span>
          )}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
        {/* Clickable Diagnostic Jump Cards */}
        {hasDiagnostics && (
          <div className="space-y-1.5">
            <div
              className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              Diagnostics (click to jump in editor)
            </div>
            {result.diagnostics.map((d, idx) => (
              <DiagnosticRow
                key={`${d.line}:${d.column}:${idx}`}
                diagnostic={d}
                onClick={() => onJumpToLine(d.line, d.column)}
              />
            ))}
          </div>
        )}

        {/* Stdout Stream */}
        {(filter === 'all' || filter === 'stdout') && hasStdout && (
          <div>
            {filter === 'all' && hasStderr && (
              <div
                className="mb-1 text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                stdout
              </div>
            )}
            <AnsiBlock text={result.stdout} />
          </div>
        )}

        {/* Stderr / Compiler Message Stream */}
        {(filter === 'all' || filter === 'stderr') && hasStderr && (
          <div
            className="rounded-md border p-2.5"
            style={{
              backgroundColor: 'rgba(244, 63, 94, 0.05)',
              borderColor: 'rgba(244, 63, 94, 0.2)',
            }}
          >
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
              {result.status === 'compile_error' ? 'Compiler Output' : 'stderr'}
            </div>
            <AnsiBlock text={result.stderr} fallbackColor="#fda4af" />
          </div>
        )}

        {/* Warnings during successful C/C++ compile */}
        {filter === 'all' &&
          !hasStderr &&
          result.compilerOutput &&
          result.compilerOutput.trim().length > 0 && (
            <div
              className="rounded-md border p-2.5"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                borderColor: 'rgba(245, 158, 11, 0.22)',
              }}
            >
              <div className="mb-1 text-[10px] font-semibold tracking-wider text-amber-400 uppercase">
                Compiler Warnings
              </div>
              <AnsiBlock text={result.compilerOutput} />
            </div>
          )}

        {!hasStdout && !hasStderr && !result.compilerOutput && (
          <div className="font-mono-code text-xs" style={{ color: 'var(--text-muted)' }}>
            Program finished with exit code {result.exitCode ?? 0} and produced no output.
          </div>
        )}

        {result.truncated && (
          <div
            className="rounded border px-2.5 py-1.5 text-[11px]"
            style={{
              borderColor: 'rgba(245, 158, 11, 0.3)',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              color: '#fbbf24',
            }}
          >
            Output truncated at 512 KB stream cap.
          </div>
        )}
      </div>
    </div>
  );
}
