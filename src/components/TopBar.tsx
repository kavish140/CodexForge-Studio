import {
  Columns2,
  Command,
  Moon,
  PanelLeft,
  Play,
  Rows2,
  Settings,
  Share2,
  Square,
  Sun,
  Zap,
} from 'lucide-react';
import { THEMES } from '../data/themes';
import type {
  CompilerMode,
  LanguageDefinition,
  LanguageId,
  LayoutMode,
  RuntimeCapability,
  ThemeId,
} from '../types/playground';
import { MOD_KEY } from '../utils/shortcuts';
import { FlagsPopover } from './FlagsPopover';
import { LanguagePicker } from './LanguagePicker';

interface TopBarProps {
  language: LanguageDefinition;
  capabilities: RuntimeCapability[];
  isRunning: boolean;
  autoRun: boolean;
  drawerOpen: boolean;
  layout: LayoutMode;
  theme: ThemeId;
  selectedFlags: string[];
  timeoutMs: number;
  compilerMode: CompilerMode;
  currentCode: string;
  onSelectLanguage: (id: LanguageId) => void;
  onRun: () => void;
  onStop: () => void;
  onToggleAutoRun: () => void;
  onToggleDrawer: () => void;
  onToggleLayout: () => void;
  onCycleTheme: () => void;
  onOpenPalette: () => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onToggleFlag: (flag: string, group: 'standard' | 'optimization' | 'warnings') => void;
  onChangeTimeout: (ms: number) => void;
  onChangeCompilerMode: (mode: CompilerMode) => void;
}

export function TopBar({
  language,
  capabilities,
  isRunning,
  autoRun,
  drawerOpen,
  layout,
  theme,
  selectedFlags,
  timeoutMs,
  compilerMode,
  currentCode,
  onSelectLanguage,
  onRun,
  onStop,
  onToggleAutoRun,
  onToggleDrawer,
  onToggleLayout,
  onCycleTheme,
  onOpenPalette,
  onShare,
  onOpenSettings,
  onToggleFlag,
  onChangeTimeout,
  onChangeCompilerMode,
}: TopBarProps) {
  const isDark = THEMES[theme].isDark;

  return (
    <header
      className="relative flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3 select-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Left Cluster: Drawer toggle + Brand + Language Picker */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleDrawer}
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            borderColor: drawerOpen ? 'var(--accent)' : 'transparent',
            backgroundColor: drawerOpen ? 'var(--accent-soft)' : 'transparent',
            color: drawerOpen ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          title={`Toggle Library & History (${MOD_KEY}+B)`}
          aria-label="Toggle Snippets and History drawer"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 7 3 12 8 17" />
              <polyline points="16 7 21 12 16 17" />
              <line x1="13.5" y1="5" x2="10.5" y2="19" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              CodexForge
            </span>
            <span
              className="hidden rounded px-1 py-0.5 text-[9px] font-semibold tracking-wider uppercase xl:inline"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Studio
            </span>
          </div>
        </div>

        <div
          className="mx-1 hidden h-4 w-px sm:block"
          style={{ backgroundColor: 'var(--border-subtle)' }}
        />

        <LanguagePicker
          value={language.id}
          capabilities={capabilities}
          compilerMode={compilerMode}
          currentCode={currentCode}
          onChange={onSelectLanguage}
          onChangeCompilerMode={onChangeCompilerMode}
        />
      </div>

      {/* Center / Right Cluster: Run/Stop + AutoRun + Layout + Palette + Share + Settings */}
      <div className="flex items-center gap-1.5">
        {/* Run / Stop Split Button */}
        <div className="flex items-center">
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className={`flex h-8 items-center gap-1.5 border border-rose-500/40 bg-rose-500/15 px-3 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/25 ${
                language.engine === 'browser' ? 'rounded-md' : 'rounded-l-md'
              }`}
              title="Cancel execution"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRun}
              className={`flex h-8 items-center gap-1.5 px-3 text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                language.engine === 'browser' ? 'rounded-md' : 'rounded-l-md'
              }`}
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
              title={`Run code (${MOD_KEY}+Enter)`}
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Run</span>
              <kbd
                className="ml-0.5 hidden rounded px-1 py-0.5 text-[10px] font-medium opacity-80 md:inline"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                {MOD_KEY} ↵
              </kbd>
            </button>
          )}
          <FlagsPopover
            language={language}
            selectedFlags={selectedFlags}
            timeoutMs={timeoutMs}
            onToggleFlag={onToggleFlag}
            onChangeTimeout={onChangeTimeout}
          />
        </div>

        {/* Auto-Run Pill */}
        <button
          type="button"
          onClick={onToggleAutoRun}
          className="hidden h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors sm:flex"
          style={{
            backgroundColor: autoRun ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            borderColor: autoRun ? 'var(--accent)' : 'var(--border-subtle)',
            color: autoRun ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          title="Auto-run code after typing pauses"
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Auto</span>
          {autoRun && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
        </button>

        {/* Layout Orientation Toggle */}
        <button
          type="button"
          onClick={onToggleLayout}
          className="hidden h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-[var(--bg-hover)] md:flex"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title={`Switch to ${layout === 'horizontal' ? 'Stacked' : 'Side-by-Side'} layout (${MOD_KEY}+\\)`}
          aria-label="Toggle split layout direction"
        >
          {layout === 'horizontal' ? (
            <Rows2 className="h-3.5 w-3.5" />
          ) : (
            <Columns2 className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title={`Command Palette (${MOD_KEY}+K)`}
        >
          <Command className="h-3.5 w-3.5" />
          <kbd className="studio-kbd hidden sm:inline-flex">{MOD_KEY}K</kbd>
        </button>

        {/* Share URL */}
        <button
          type="button"
          onClick={onShare}
          className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Copy shareable playground URL"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Share</span>
        </button>

        {/* Quick Theme Cycle */}
        <button
          type="button"
          onClick={onCycleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title={`Theme: ${THEMES[theme].name} (click to cycle)`}
          aria-label="Cycle theme"
        >
          {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Studio Settings & Keyboard Shortcuts"
          aria-label="Open Studio Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Subtle hairline progress bar during compilation/execution */}
      {isRunning && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-[2px] overflow-hidden">
          <div
            className="animate-studio-progress h-full w-1/3"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        </div>
      )}
    </header>
  );
}
