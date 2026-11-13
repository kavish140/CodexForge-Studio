import { Check, Cpu, Keyboard, Palette, RefreshCw, Sliders, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ACCENTS, THEMES } from '../data/themes';
import type {
  AccentId,
  EditorSettings,
  RuntimeCapability,
  StudioSettings,
  ThemeId,
} from '../types/playground';
import { MOD_KEY } from '../utils/shortcuts';

interface SettingsModalProps {
  open: boolean;
  settings: StudioSettings;
  capabilities: RuntimeCapability[];
  onClose: () => void;
  onUpdateSettings: (patch: Partial<StudioSettings>) => void;
  onUpdateEditorSettings: (patch: Partial<EditorSettings>) => void;
  onRefreshCapabilities: () => void;
}

type SettingsTab = 'appearance' | 'engine' | 'shortcuts';

export function SettingsModal({
  open,
  settings,
  capabilities,
  onClose,
  onUpdateSettings,
  onUpdateEditorSettings,
  onRefreshCapabilities,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('appearance');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const localCaps = capabilities.filter((c) => c.engine === 'local');

  const shortcuts = [
    { keys: [MOD_KEY, '↵'], desc: 'Compile & Run active code' },
    { keys: [MOD_KEY, 'K'], desc: 'Open Command Palette' },
    { keys: [MOD_KEY, 'B'], desc: 'Toggle Snippets & History drawer' },
    { keys: [MOD_KEY, '\\'], desc: 'Toggle Side-by-Side / Stacked layout' },
    { keys: ['Shift', 'Alt', 'F'], desc: 'Format code inside editor' },
    { keys: ['Esc'], desc: 'Close modal or popover' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-pop-in flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          boxShadow: 'var(--shadow-overlay)',
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Studio Settings
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Synchronized UI themes, compiler options, and keyboard shortcuts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex gap-1 border-b px-5 py-2"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          {[
            { id: 'appearance' as const, label: 'Appearance', icon: Palette },
            { id: 'engine' as const, label: 'Engine & Runtimes', icon: Sliders },
            { id: 'shortcuts' as const, label: 'Keyboard Shortcuts', icon: Keyboard },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: active ? 'var(--accent)' : undefined }} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {tab === 'appearance' && (
            <>
              {/* Theme Grid */}
              <div>
                <div
                  className="mb-2.5 text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Synchronized Theme
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                    const t = THEMES[id];
                    const active = settings.theme === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onUpdateSettings({ theme: id })}
                        className="flex items-center justify-between rounded-lg border p-3 text-left transition-all"
                        style={{
                          backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                          borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-12 items-center justify-center gap-1 rounded-md border p-1"
                            style={{
                              backgroundColor: t.swatches[0],
                              borderColor: 'var(--border-strong)',
                            }}
                          >
                            <span
                              className="h-5 w-2.5 rounded-xs"
                              style={{ backgroundColor: t.swatches[1] }}
                            />
                            <span
                              className="h-5 w-2.5 rounded-xs"
                              style={{ backgroundColor: t.swatches[2] }}
                            />
                          </div>
                          <div>
                            <div
                              className="text-xs font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {t.name}
                            </div>
                            <div
                              className="text-[11px]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {t.description}
                            </div>
                          </div>
                        </div>
                        {active && <Check className="h-4 w-4" style={{ color: 'var(--accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color Switcher */}
              <div>
                <div
                  className="mb-2.5 text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Accent Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ACCENTS) as AccentId[]).map((id) => {
                    const acc = ACCENTS[id];
                    const active = settings.accent === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onUpdateSettings({ accent: id })}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: active ? 'var(--bg-active)' : 'var(--bg-elevated)',
                          borderColor: active ? acc.hex : 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: acc.hex }}
                        />
                        {acc.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Editor Toggles */}
              <div
                className="rounded-lg border p-3.5"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="mb-2 text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Editor Quick Preferences
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {(
                    [
                      ['ligatures', 'Code Font Ligatures'],
                      ['vimMode', 'Vim Keybindings'],
                      ['minimap', 'Monaco Minimap'],
                      ['wordWrap', 'Soft Word Wrap'],
                    ] as const
                  ).map(([key, label]) => {
                    const active = settings.editor[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onUpdateEditorSettings({ [key]: !active })}
                        className="flex items-center justify-between rounded-md border px-2.5 py-2"
                        style={{
                          borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                          backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span>{label}</span>
                        <span
                          className="text-[10px] font-semibold uppercase"
                          style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                          {active ? 'On' : 'Off'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'engine' && (
            <div className="space-y-5">
              {/* Local Runtimes Status */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <div
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Cpu className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                    Detected Local Runtimes
                  </div>
                  <button
                    type="button"
                    onClick={onRefreshCapabilities}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Re-scan
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {localCaps.map((cap) => (
                    <div
                      key={cap.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <span className="font-mono-code font-semibold uppercase">{cap.id}</span>
                      <span
                        className={`flex items-center gap-1.5 text-[11px] ${
                          cap.available ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            cap.available ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {cap.available ? cap.version : 'Not found in PATH'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remote Cloud Compiler URL */}
              <div>
                <label
                  htmlFor="remote-api-input"
                  className="mb-1.5 block text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Cloud Compiler API Endpoint (Wandbox / Judge0)
                </label>
                <input
                  id="remote-api-input"
                  type="url"
                  value={settings.remoteApiUrl}
                  onChange={(e) => onUpdateSettings({ remoteApiUrl: e.target.value })}
                  placeholder="Auto (Wandbox + Judge0 CE fallback)"
                  className="w-full rounded-lg border px-3 py-2 font-mono-code text-xs outline-none focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Used for Rust, Go, Java, C#, Ruby, PHP, and Bash when executing outside local
                  runtimes. Leave empty to use built-in Wandbox &amp; Judge0 CE routing.
                </p>
              </div>
            </div>
          )}

          {tab === 'shortcuts' && (
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div
                  key={s.desc}
                  className="flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <kbd key={k} className="studio-kbd">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
