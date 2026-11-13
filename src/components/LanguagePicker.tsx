import { Check, ChevronDown, Cloud, Cpu, Globe, Search, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LANGUAGE_CATEGORIES, LANGUAGES } from '../data/languages';
import type {
  CompilerMode,
  LanguageEngine,
  LanguageId,
  RuntimeCapability,
} from '../types/playground';
import { detectLanguage } from '../utils/autoDetect';

interface LanguagePickerProps {
  value: LanguageId;
  capabilities: RuntimeCapability[];
  compilerMode: CompilerMode;
  currentCode?: string;
  onChange: (lang: LanguageId) => void;
  onChangeCompilerMode: (mode: CompilerMode) => void;
}

const ENGINE_ICONS: Record<LanguageEngine, React.ComponentType<{ className?: string }>> = {
  local: Cpu,
  browser: Globe,
  cloud: Cloud,
};

export function LanguagePicker({
  value,
  capabilities,
  compilerMode,
  currentCode = '',
  onChange,
  onChangeCompilerMode,
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [groupBy, setGroupBy] = useState<'category' | 'engine'>('category');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => LANGUAGES.find((l) => l.id === value) ?? LANGUAGES[0],
    [value],
  );

  const capMap = useMemo(() => {
    const map = new Map<string, RuntimeCapability>();
    capabilities.forEach((c) => map.set(c.id, c));
    return map;
  }, [capabilities]);

  // Auto-detect result
  const autoDetected = useMemo(() => {
    if (compilerMode !== 'auto' || !currentCode.trim()) return null;
    return detectLanguage(currentCode);
  }, [compilerMode, currentCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.shortName.toLowerCase().includes(q) ||
        l.extension.toLowerCase().includes(q) ||
        l.engine.toLowerCase().includes(q) ||
        (l.category ?? '').toLowerCase().includes(q) ||
        l.defaultVersion.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 10);

    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Grouped by category
  const groupedByCategory = useMemo(() => {
    return LANGUAGE_CATEGORIES.map((cat) => ({
      ...cat,
      items: filtered.filter((l) => (l.category ?? 'modern') === cat.id),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  // Grouped by engine
  const groupedByEngine = useMemo(() => {
    const engines: LanguageEngine[] = ['local', 'browser', 'cloud'];
    const ENGINE_LABELS: Record<LanguageEngine, string> = {
      local: 'Local Native Runtimes',
      browser: 'Browser WASM & Sandbox',
      cloud: 'Cloud Compiler Engine',
    };
    return engines
      .map((engine) => ({
        id: engine,
        label: ENGINE_LABELS[engine],
        icon: '⚙',
        items: filtered.filter((l) => l.engine === engine),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const groups = groupBy === 'category' ? groupedByCategory : groupedByEngine;
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const handleSelect = (id: LanguageId) => {
    onChange(id);
    // When user manually picks, switch to manual mode
    if (compilerMode === 'auto') {
      onChangeCompilerMode('manual');
    }
    setOpen(false);
    setQuery('');
  };

  const handleAutoDetect = () => {
    if (!currentCode.trim()) return;
    const result = detectLanguage(currentCode);
    if (result.confidence > 10) {
      onChange(result.languageId);
    }
    onChangeCompilerMode('auto');
    setOpen(false);
  };

  const selectedCap = capMap.get(selected.id);
  const EngineIcon = ENGINE_ICONS[selected.engine];
  const isAuto = compilerMode === 'auto';

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger Button ── */}
      <div className="flex items-center gap-1">
        {/* Auto / Manual mode pill */}
        <button
          type="button"
          onClick={() => {
            const next: CompilerMode = isAuto ? 'manual' : 'auto';
            onChangeCompilerMode(next);
            if (next === 'auto' && currentCode.trim()) {
              const result = detectLanguage(currentCode);
              if (result.confidence > 10) onChange(result.languageId);
            }
          }}
          className="flex h-8 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold uppercase tracking-widest transition-all duration-150"
          style={{
            backgroundColor: isAuto ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            borderColor: isAuto ? 'var(--accent)' : 'var(--border-subtle)',
            color: isAuto ? 'var(--accent)' : 'var(--text-muted)',
          }}
          title={isAuto ? 'Auto-Detect is ON — click to switch to Manual' : 'Click to enable Auto-Detect compiler'}
          aria-pressed={isAuto}
        >
          <Sparkles className="h-3 w-3" />
          <span className="hidden sm:inline">{isAuto ? 'Auto' : 'Manual'}</span>
        </button>

        {/* Language selector button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-all duration-150 hover:bg-[var(--bg-hover)]"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: open ? 'var(--accent)' : 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span
            className="flex h-4.5 min-w-5 items-center justify-center rounded px-1 font-mono text-[10px] font-bold"
            style={{
              backgroundColor: `${selected.accentHex}22`,
              color: selected.accentHex,
            }}
          >
            {selected.shortName}
          </span>
          <span className="font-semibold tracking-tight">
            {selected.name}
            {isAuto && autoDetected && autoDetected.confidence > 10 && (
              <span
                className="ml-1 text-[9px] font-normal opacity-70"
                title={`Auto-detected with ${autoDetected.confidence}% confidence`}
              >
                ✦
              </span>
            )}
          </span>
          <span
            className="hidden items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex"
            style={{
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
            }}
          >
            <EngineIcon className="h-2.5 w-2.5" />
            {selectedCap?.version || selected.defaultVersion}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>
      </div>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          className="animate-pop-in absolute top-full left-0 z-50 mt-1.5 w-96 overflow-hidden rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            boxShadow: 'var(--shadow-overlay)',
          }}
          role="listbox"
        >
          {/* Search + controls header */}
          <div
            className="flex flex-col border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightIndex((i) => Math.min(flatItems.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter' && flatItems[highlightIndex]) {
                    e.preventDefault();
                    handleSelect(flatItems[highlightIndex].id);
                  }
                }}
                placeholder={`Search ${LANGUAGES.length} languages…`}
                className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
                style={{ color: 'var(--text-primary)' }}
              />
              {/* Group by toggle */}
              <button
                type="button"
                onClick={() => setGroupBy((g) => g === 'category' ? 'engine' : 'category')}
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-muted)' }}
                title="Toggle grouping (category / engine)"
              >
                {groupBy === 'category' ? '⚙ Engine' : '◈ Category'}
              </button>
            </div>

            {/* Auto-detect banner */}
            <button
              type="button"
              onClick={handleAutoDetect}
              className="flex items-center justify-between border-t px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--accent-soft)]"
              style={{
                borderColor: 'var(--border-subtle)',
                color: isAuto ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="h-3.5 w-3.5" />
                <div>
                  <span className="font-semibold">Auto-Detect Compiler</span>
                  {autoDetected && autoDetected.confidence > 10 ? (
                    <span className="ml-2 opacity-70">
                      → {LANGUAGES.find((l) => l.id === autoDetected.languageId)?.name ?? autoDetected.languageId}
                      <span className="ml-1 text-[10px]">({autoDetected.confidence}% confidence)</span>
                    </span>
                  ) : (
                    <span className="ml-2 opacity-50">Analyze code syntax to pick compiler</span>
                  )}
                </div>
              </div>
              {isAuto && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  ON
                </span>
              )}
            </button>
          </div>

          {/* Language list */}
          <div className="max-h-80 overflow-y-auto p-1.5">
            {groups.length === 0 ? (
              <div
                className="px-3 py-6 text-center text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                No matching languages
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="mb-1.5 last:mb-0">
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </div>
                  {group.items.map((lang) => {
                    const idx = flatItems.findIndex((item) => item.id === lang.id);
                    const isHighlighted = idx === highlightIndex;
                    const isSelected = lang.id === value;
                    const isAutoMatch = isAuto && autoDetected?.languageId === lang.id;
                    const cap = capMap.get(lang.id);
                    const isAvailable = cap ? cap.available : true;
                    const EIcon = ENGINE_ICONS[lang.engine];

                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => handleSelect(lang.id)}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors"
                        style={{
                          backgroundColor: isHighlighted
                            ? 'var(--bg-hover)'
                            : isAutoMatch
                              ? `${lang.accentHex}11`
                              : 'transparent',
                          color: 'var(--text-primary)',
                          opacity: isAvailable ? 1 : 0.5,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-5 w-9 items-center justify-center rounded font-mono text-[9px] font-bold"
                            style={{
                              backgroundColor: `${lang.accentHex}22`,
                              color: lang.accentHex,
                            }}
                          >
                            {lang.shortName}
                          </span>
                          <div>
                            <div className="flex items-center gap-1 font-medium leading-tight">
                              {lang.name}
                              {isAutoMatch && (
                                <Sparkles
                                  className="h-2.5 w-2.5"
                                  style={{ color: 'var(--accent)' }}
                                  title="Auto-detected match"
                                />
                              )}
                            </div>
                            <div
                              className="flex items-center gap-1 text-[10px]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <EIcon className="h-2.5 w-2.5" />
                              {cap?.version || lang.defaultVersion}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {lang.engine === 'local' && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-rose-400'}`}
                              title={isAvailable ? 'Detected locally' : 'Not installed locally'}
                            />
                          )}
                          {isSelected && (
                            <Check className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer stats */}
          <div
            className="border-t px-3 py-1.5 text-[10px]"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            {LANGUAGES.length} languages · {LANGUAGES.filter((l) => l.engine === 'local').length} local ·{' '}
            {LANGUAGES.filter((l) => l.engine === 'cloud').length} cloud ·{' '}
            {LANGUAGES.filter((l) => l.engine === 'browser').length} browser
          </div>
        </div>
      )}
    </div>
  );
}
