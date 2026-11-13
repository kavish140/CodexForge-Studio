import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eraser,
  Eye,
  Table2,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';
import { useSplitPane } from '../hooks/useSplitPane';
import type {
  ConsoleLogMessage,
  ExecutionResult,
  LanguageDefinition,
  OutputTabId,
} from '../types/playground';
import { ConsoleView } from './ConsoleView';
import { SqlTablesView } from './SqlTablesView';
import { WebPreviewView } from './WebPreviewView';

interface IOPaneProps {
  language: LanguageDefinition;
  stdin: string;
  result: ExecutionResult | null;
  isRunning: boolean;
  activeTab: OutputTabId;
  webSrcDoc: string;
  webRenderKey: number;
  webLogs: ConsoleLogMessage[];
  isDraggingParentSplit: boolean;
  onChangeStdin: (next: string) => void;
  onChangeTab: (tab: OutputTabId) => void;
  onClearOutput: () => void;
  onRefreshPreview: () => void;
  onJumpToLine: (line: number, column?: number) => void;
  onNotify: (msg: string) => void;
}

export function IOPane({
  language,
  stdin,
  result,
  isRunning,
  activeTab,
  webSrcDoc,
  webRenderKey,
  webLogs,
  isDraggingParentSplit,
  onChangeStdin,
  onChangeTab,
  onClearOutput,
  onRefreshPreview,
  onJumpToLine,
  onNotify,
}: IOPaneProps) {
  const [stdinCollapsed, setStdinCollapsed] = useState(false);
  const [copiedOut, setCopiedOut] = useState(false);

  const stdinSplit = useSplitPane({
    direction: 'vertical',
    initialPct: 24,
    minPct: 12,
    maxPct: 60,
  });

  const showStdin = language.supportsStdin;
  const isWeb = language.id === 'web';
  const isSql = language.id === 'sql';

  const statusBadge = (() => {
    if (isRunning) {
      return {
        label: 'Running',
        classes: 'border-sky-500/30 bg-sky-500/12 text-sky-400',
      };
    }
    if (!result) return null;
    switch (result.status) {
      case 'success':
        return {
          label: 'Success',
          classes: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-400',
        };
      case 'compile_error':
        return {
          label: 'Compile Error',
          classes: 'border-rose-500/30 bg-rose-500/12 text-rose-400',
        };
      case 'runtime_error':
      case 'error':
        return {
          label: 'Error',
          classes: 'border-rose-500/30 bg-rose-500/12 text-rose-400',
        };
      case 'timeout':
        return {
          label: 'Timed Out',
          classes: 'border-amber-500/30 bg-amber-500/12 text-amber-400',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          classes: 'border-slate-500/30 bg-slate-500/12 text-slate-400',
        };
      default:
        return null;
    }
  })();

  const handleCopyOutput = async () => {
    const text = isWeb
      ? webLogs.map((l) => `[${l.level}] ${l.args.join(' ')}`).join('\n')
      : [result?.stdout, result?.stderr].filter(Boolean).join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOut(true);
      onNotify('Copied output to clipboard');
      setTimeout(() => setCopiedOut(false), 1400);
    } catch {
      onNotify('Clipboard access denied');
    }
  };

  const tabs: { id: OutputTabId; label: string; icon: typeof Terminal; badge?: number }[] = [
    ...(isWeb
      ? [{ id: 'preview' as const, label: 'Preview', icon: Eye }]
      : []),
    ...(isSql
      ? [
          {
            id: 'tables' as const,
            label: 'Tables',
            icon: Table2,
            badge: result?.sqlTables?.length,
          },
        ]
      : []),
    {
      id: 'console' as const,
      label: 'Console',
      icon: Terminal,
      badge: isWeb && webLogs.length > 0 ? webLogs.length : undefined,
    },
  ];

  return (
    <section
      ref={stdinSplit.containerRef}
      className="flex h-full min-h-0 min-w-0 flex-col"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      {/* Standard Input (Stdin) Top Box */}
      {showStdin && (
        <>
          <div
            className="flex flex-col overflow-hidden"
            style={{
              height: stdinCollapsed ? '36px' : `${stdinSplit.pct}%`,
              minHeight: '36px',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div
              className="flex h-9 shrink-0 items-center justify-between border-b px-3 select-none"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={() => setStdinCollapsed((c) => !c)}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {stdinCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                )}
                <span>Standard Input (stdin)</span>
                {stdin.length > 0 && (
                  <span
                    className="rounded px-1.5 py-0.5 font-mono-code text-[10px] font-medium"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    }}
                  >
                    {stdin.split(/\r?\n/).length}L
                  </span>
                )}
              </button>

              {stdin.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeStdin('')}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear
                </button>
              )}
            </div>

            {!stdinCollapsed && (
              <textarea
                value={stdin}
                onChange={(e) => onChangeStdin(e.target.value)}
                placeholder="Enter program input passed via stdin..."
                spellCheck={false}
                className="min-h-0 flex-1 resize-none border-0 bg-transparent p-3 font-mono-code text-xs leading-relaxed outline-none placeholder:text-[var(--text-muted)]"
                style={{
                  backgroundColor: 'var(--bg-editor)',
                  color: 'var(--text-primary)',
                }}
              />
            )}
          </div>

          {/* Vertical Splitter between Stdin and Output */}
          {!stdinCollapsed && (
            <div
              onPointerDown={stdinSplit.onPointerDown}
              onDoubleClick={stdinSplit.reset}
              className="group relative flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-y transition-colors hover:bg-[var(--accent-soft)]"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: stdinSplit.isDragging ? 'var(--accent-soft)' : 'var(--bg-app)',
              }}
              title="Drag to resize stdin (double-click to reset)"
            >
              <div
                className="h-0.5 w-8 rounded-full transition-colors group-hover:bg-[var(--accent)]"
                style={{
                  backgroundColor: stdinSplit.isDragging
                    ? 'var(--accent)'
                    : 'var(--border-strong)',
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Output Pane */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-editor)' }}
      >
        {/* Output Header Bar with Tabs & Telemetry */}
        <div
          className="flex h-9 shrink-0 items-center justify-between gap-2 border-b px-2.5 select-none"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Output View Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: active ? 'var(--accent)' : undefined }}
                  />
                  <span>{tab.label}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className="rounded-full px-1.5 font-mono-code text-[10px]"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--accent)',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Telemetry Pills + Actions */}
          <div className="flex items-center gap-1.5">
            {statusBadge && (
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${statusBadge.classes}`}
              >
                {statusBadge.label}
              </span>
            )}

            {result && result.exitCode !== null && !isWeb && (
              <span
                className="hidden rounded border px-1.5 py-0.5 font-mono-code text-[10px] sm:inline"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                }}
              >
                exit {result.exitCode}
              </span>
            )}

            {result && result.compileTimeMs !== null && (
              <span
                className="hidden items-center gap-1 rounded border px-1.5 py-0.5 font-mono-code text-[10px] lg:inline-flex"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                }}
                title="Compilation time"
              >
                C {result.compileTimeMs}ms
              </span>
            )}

            {result && (
              <span
                className="hidden items-center gap-1 rounded border px-1.5 py-0.5 font-mono-code text-[10px] sm:inline-flex"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                }}
                title="Execution duration"
              >
                <Clock className="h-2.5 w-2.5" />
                {result.runTimeMs}ms
              </span>
            )}

            <button
              type="button"
              onClick={handleCopyOutput}
              className="flex h-6.5 w-6.5 items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-muted)' }}
              title="Copy output"
              aria-label="Copy output"
            >
              {copiedOut ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onClearOutput}
              className="flex h-6.5 w-6.5 items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-muted)' }}
              title="Clear console output"
              aria-label="Clear output"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Active Output Tab Content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'preview' && isWeb ? (
            <WebPreviewView
              srcDoc={webSrcDoc}
              renderKey={webRenderKey}
              isDraggingSplit={isDraggingParentSplit || stdinSplit.isDragging}
              onRefresh={onRefreshPreview}
            />
          ) : activeTab === 'tables' && isSql ? (
            <SqlTablesView tables={result?.sqlTables ?? []} />
          ) : (
            <ConsoleView
              language={language}
              result={result}
              isRunning={isRunning}
              webLogs={webLogs}
              onJumpToLine={onJumpToLine}
            />
          )}
        </div>
      </div>
    </section>
  );
}
