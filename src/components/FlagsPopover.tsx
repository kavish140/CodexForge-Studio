import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LanguageDefinition } from '../types/playground';

interface FlagsPopoverProps {
  language: LanguageDefinition;
  selectedFlags: string[];
  timeoutMs: number;
  onToggleFlag: (flag: string, group: 'standard' | 'optimization' | 'warnings') => void;
  onChangeTimeout: (ms: number) => void;
}

const TIMEOUT_OPTIONS = [
  { label: '5s', ms: 5000 },
  { label: '10s', ms: 10000 },
  { label: '15s', ms: 15000 },
  { label: '30s', ms: 30000 },
];

export function FlagsPopover({
  language,
  selectedFlags,
  timeoutMs,
  onToggleFlag,
  onChangeTimeout,
}: FlagsPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onOutside);
    return () => window.removeEventListener('mousedown', onOutside);
  }, [open]);

  if (language.engine === 'browser') return null;

  const standards = language.flagOptions?.filter((f) => f.group === 'standard') ?? [];
  const optimizations = language.flagOptions?.filter((f) => f.group === 'optimization') ?? [];
  const warnings = language.flagOptions?.filter((f) => f.group === 'warnings') ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-r-md border border-l-0 px-2 text-xs transition-colors hover:bg-[var(--bg-hover)]"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: open ? 'var(--accent)' : 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
        title="Compiler flags & execution timeout"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {language.supportsFlags && selectedFlags.length > 0 && (
          <span
            className="hidden rounded px-1 font-mono-code text-[10px] lg:inline"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
          >
            {selectedFlags[0]}
          </span>
        )}
      </button>

      {open && (
        <div
          className="animate-pop-in absolute top-full right-0 z-50 mt-1.5 w-72 rounded-lg border p-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span
              className="text-[11px] font-semibold tracking-wider uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              Execution Options
            </span>
            <span className="font-mono-code text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {language.name}
            </span>
          </div>

          {language.supportsFlags && (
            <div className="mb-3 space-y-2.5 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              {standards.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Language Standard
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {standards.map((opt) => {
                      const active = selectedFlags.includes(opt.flag);
                      return (
                        <button
                          key={opt.flag}
                          type="button"
                          onClick={() => onToggleFlag(opt.flag, opt.group)}
                          className="rounded border px-2 py-1 font-mono-code text-[11px] font-medium transition-colors"
                          style={{
                            borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                            backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {optimizations.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Optimization
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {optimizations.map((opt) => {
                      const active = selectedFlags.includes(opt.flag);
                      return (
                        <button
                          key={opt.flag}
                          type="button"
                          onClick={() => onToggleFlag(opt.flag, opt.group)}
                          className="rounded border px-2 py-1 font-mono-code text-[11px] font-medium transition-colors"
                          style={{
                            borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                            backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Diagnostics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {warnings.map((opt) => {
                      const active = selectedFlags.includes(opt.flag);
                      return (
                        <button
                          key={opt.flag}
                          type="button"
                          onClick={() => onToggleFlag(opt.flag, opt.group)}
                          className="rounded border px-2 py-1 font-mono-code text-[11px] font-medium transition-colors"
                          style={{
                            borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                            backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="mb-1.5 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Execution Timeout
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TIMEOUT_OPTIONS.map((opt) => {
                const active = timeoutMs === opt.ms;
                return (
                  <button
                    key={opt.ms}
                    type="button"
                    onClick={() => onChangeTimeout(opt.ms)}
                    className="rounded border py-1 font-mono-code text-[11px] font-medium transition-colors"
                    style={{
                      borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                      backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
