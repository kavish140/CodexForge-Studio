import {
  Check,
  Code2,
  Columns2,
  Palette,
  PanelLeft,
  Play,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LANGUAGES } from '../data/languages';
import { ACCENTS, THEMES } from '../data/themes';
import type { AccentId, LanguageId, ThemeId } from '../types/playground';
import { MOD_KEY } from '../utils/shortcuts';

interface PaletteAction {
  id: string;
  category: 'Actions' | 'Languages' | 'Themes' | 'Accents';
  title: string;
  subtitle?: string;
  shortcut?: string;
  isActive?: boolean;
  dotColor?: string;
  icon: typeof Play;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  currentLanguage: LanguageId;
  currentTheme: ThemeId;
  currentAccent: AccentId;
  onClose: () => void;
  onRun: () => void;
  onSelectLanguage: (id: LanguageId) => void;
  onSelectTheme: (id: ThemeId) => void;
  onSelectAccent: (id: AccentId) => void;
  onToggleLayout: () => void;
  onToggleDrawer: () => void;
  onToggleAutoRun: () => void;
  onToggleVim: () => void;
  onFormat: () => void;
  onShare: () => void;
  onResetTemplate: () => void;
  onOpenSettings: () => void;
}

export function CommandPalette({
  open,
  currentLanguage,
  currentTheme,
  currentAccent,
  onClose,
  onRun,
  onSelectLanguage,
  onSelectTheme,
  onSelectAccent,
  onToggleLayout,
  onToggleDrawer,
  onToggleAutoRun,
  onToggleVim,
  onFormat,
  onShare,
  onResetTemplate,
  onOpenSettings,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const allItems = useMemo<PaletteAction[]>(() => {
    const actions: PaletteAction[] = [
      {
        id: 'act-run',
        category: 'Actions',
        title: 'Run Code',
        subtitle: 'Compile and execute active buffer',
        shortcut: `${MOD_KEY}+↵`,
        icon: Play,
        onSelect: onRun,
      },
      {
        id: 'act-layout',
        category: 'Actions',
        title: 'Toggle Split Layout',
        subtitle: 'Switch between Side-by-Side and Stacked panes',
        shortcut: `${MOD_KEY}+\\`,
        icon: Columns2,
        onSelect: onToggleLayout,
      },
      {
        id: 'act-drawer',
        category: 'Actions',
        title: 'Toggle Library & History Drawer',
        subtitle: 'Show or hide templates, saved snippets, and run history',
        shortcut: `${MOD_KEY}+B`,
        icon: PanelLeft,
        onSelect: onToggleDrawer,
      },
      {
        id: 'act-format',
        category: 'Actions',
        title: 'Format Document',
        subtitle: 'Run Monaco built-in code formatter',
        shortcut: 'Shift+Alt+F',
        icon: Sparkles,
        onSelect: onFormat,
      },
      {
        id: 'act-autorun',
        category: 'Actions',
        title: 'Toggle Auto-Run Mode',
        subtitle: 'Automatically execute after editing pauses',
        icon: Zap,
        onSelect: onToggleAutoRun,
      },
      {
        id: 'act-vim',
        category: 'Actions',
        title: 'Toggle Vim Keybindings',
        subtitle: 'Enable or disable Vim modal editing in Monaco',
        icon: Code2,
        onSelect: onToggleVim,
      },
      {
        id: 'act-share',
        category: 'Actions',
        title: 'Copy Shareable URL',
        subtitle: 'Encode code & stdin into a shareable link',
        icon: Share2,
        onSelect: onShare,
      },
      {
        id: 'act-reset',
        category: 'Actions',
        title: 'Reset to Default Template',
        subtitle: 'Restore starter code for current language',
        icon: RotateCcw,
        onSelect: onResetTemplate,
      },
      {
        id: 'act-settings',
        category: 'Actions',
        title: 'Open Studio Settings',
        subtitle: 'Themes, accents, compiler URL & keyboard shortcuts',
        icon: Settings,
        onSelect: onOpenSettings,
      },
    ];

    const languageItems: PaletteAction[] = LANGUAGES.map((l) => ({
      id: `lang-${l.id}`,
      category: 'Languages',
      title: `Switch to ${l.name}`,
      subtitle: `${l.defaultVersion} · ${l.engine.toUpperCase()}`,
      isActive: currentLanguage === l.id,
      dotColor: l.accentHex,
      icon: Code2,
      onSelect: () => onSelectLanguage(l.id),
    }));

    const themeItems: PaletteAction[] = (Object.keys(THEMES) as ThemeId[]).map((id) => ({
      id: `theme-${id}`,
      category: 'Themes',
      title: `Theme: ${THEMES[id].name}`,
      subtitle: THEMES[id].description,
      isActive: currentTheme === id,
      dotColor: THEMES[id].swatches[0],
      icon: Palette,
      onSelect: () => onSelectTheme(id),
    }));

    const accentItems: PaletteAction[] = (Object.keys(ACCENTS) as AccentId[]).map((id) => ({
      id: `accent-${id}`,
      category: 'Accents',
      title: `Accent: ${ACCENTS[id].name}`,
      isActive: currentAccent === id,
      dotColor: ACCENTS[id].hex,
      icon: Palette,
      onSelect: () => onSelectAccent(id),
    }));

    return [...actions, ...languageItems, ...themeItems, ...accentItems];
  }, [
    currentAccent,
    currentLanguage,
    currentTheme,
    onFormat,
    onOpenSettings,
    onResetTemplate,
    onRun,
    onSelectAccent,
    onSelectLanguage,
    onSelectTheme,
    onShare,
    onToggleAutoRun,
    onToggleDrawer,
    onToggleLayout,
    onToggleVim,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q),
    );
  }, [allItems, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const executeItem = (item: PaletteAction) => {
    onClose();
    item.onSelect();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[14vh] backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-pop-in w-full max-w-xl overflow-hidden rounded-xl border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          boxShadow: 'var(--shadow-overlay)',
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-2.5 border-b px-4 py-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && filtered[activeIndex]) {
                e.preventDefault();
                executeItem(filtered[activeIndex]);
              }
            }}
            placeholder="Type a command, language, theme, or accent..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="studio-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div
              className="py-10 text-center text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isHighlighted = idx === activeIndex;
              const prevCategory = idx > 0 ? filtered[idx - 1].category : null;
              const showHeader = item.category !== prevCategory;

              return (
                <div key={item.id}>
                  {showHeader && (
                    <div
                      className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase first:pt-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {item.category}
                    </div>
                  )}
                  <button
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors"
                    style={{
                      backgroundColor: isHighlighted ? 'var(--bg-hover)' : 'transparent',
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {item.dotColor ? (
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border"
                          style={{
                            backgroundColor: item.dotColor,
                            borderColor: 'var(--border-strong)',
                          }}
                        />
                      ) : (
                        <Icon
                          className="h-4 w-4 shrink-0"
                          style={{ color: isHighlighted ? 'var(--accent)' : 'var(--text-muted)' }}
                        />
                      )}
                      <div className="min-w-0">
                        <div
                          className="truncate text-xs font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div
                            className="truncate text-[11px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {item.isActive && (
                        <Check className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                      )}
                      {item.shortcut && <kbd className="studio-kbd">{item.shortcut}</kbd>}
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
