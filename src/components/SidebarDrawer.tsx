import {
  Bookmark,
  Check,
  Clock,
  FileCode2,
  History,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { getLanguageById } from '../data/languages';
import type {
  LanguageDefinition,
  LanguageTemplate,
  RunHistoryEntry,
  SavedSnippet,
  SidebarTabId,
} from '../types/playground';

interface SidebarDrawerProps {
  open: boolean;
  activeTab: SidebarTabId;
  language: LanguageDefinition;
  savedSnippets: SavedSnippet[];
  history: RunHistoryEntry[];
  onChangeTab: (tab: SidebarTabId) => void;
  onClose: () => void;
  onApplyTemplate: (template: LanguageTemplate) => void;
  onSaveSnippet: (name: string) => void;
  onLoadSnippet: (snippet: SavedSnippet) => void;
  onRenameSnippet: (id: string, newName: string) => void;
  onDeleteSnippet: (id: string) => void;
  onRestoreHistory: (entry: RunHistoryEntry) => void;
  onClearHistory: () => void;
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function SidebarDrawer({
  open,
  activeTab,
  language,
  savedSnippets,
  history,
  onChangeTab,
  onClose,
  onApplyTemplate,
  onSaveSnippet,
  onLoadSnippet,
  onRenameSnippet,
  onDeleteSnippet,
  onRestoreHistory,
  onClearHistory,
}: SidebarDrawerProps) {
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const filteredSnippets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return savedSnippets;
    return savedSnippets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        getLanguageById(s.language).name.toLowerCase().includes(q),
    );
  }, [savedSnippets, search]);

  if (!open) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim() || `${language.name} Snippet ${savedSnippets.length + 1}`;
    onSaveSnippet(trimmed);
    setNewName('');
  };

  return (
    <aside
      className="fixed top-12 bottom-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r shadow-2xl select-none md:static md:h-full md:shadow-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Tabs Header */}
      <div
        className="flex h-9 shrink-0 items-center justify-between border-b px-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-0.5">
          {[
            { id: 'templates' as const, label: 'Templates', icon: Sparkles },
            { id: 'saved' as const, label: 'Saved', icon: Bookmark, count: savedSnippets.length },
            { id: 'history' as const, label: 'History', icon: History, count: history.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className="rounded-full px-1 text-[9px]"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close drawer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {activeTab === 'templates' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                {language.name} Starters
              </span>
              <span className="font-mono-code text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {language.templates.length} available
              </span>
            </div>

            {language.templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onApplyTemplate(tpl)}
                className="group flex w-full flex-col gap-1 rounded-lg border p-2.5 text-left transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <FileCode2 className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                    {tpl.name}
                  </span>
                  <span
                    className="text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--accent)' }}
                  >
                    Load →
                  </span>
                </div>
                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  {tpl.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-2.5">
            <form onSubmit={handleSave} className="flex gap-1.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`Save current ${language.shortName} snippet...`}
                className="min-w-0 flex-1 rounded-md border px-2.5 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                className="flex h-7.5 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
                title="Save current buffer"
              >
                <Plus className="h-3.5 w-3.5" />
                Save
              </button>
            </form>

            {savedSnippets.length > 0 && (
              <div
                className="flex items-center gap-1.5 rounded-md border px-2 py-1"
                style={{
                  backgroundColor: 'var(--bg-app)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Search className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter saved snippets..."
                  className="w-full bg-transparent text-[11px] outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            )}

            {filteredSnippets.length === 0 ? (
              <div
                className="rounded-lg border border-dashed px-4 py-8 text-center text-xs"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {savedSnippets.length === 0
                  ? 'No saved snippets yet. Save your active code above to build your personal library.'
                  : 'No snippets match your search.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredSnippets.map((snippet) => {
                  const lang = getLanguageById(snippet.language);
                  const isEditing = editingId === snippet.id;
                  return (
                    <div
                      key={snippet.id}
                      className="group rounded-lg border p-2.5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-1">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editingText.trim()) {
                                  onRenameSnippet(snippet.id, editingText.trim());
                                  setEditingId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              autoFocus
                              className="w-full rounded border px-1.5 py-0.5 text-xs outline-none"
                              style={{
                                backgroundColor: 'var(--bg-app)',
                                borderColor: 'var(--accent)',
                                color: 'var(--text-primary)',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editingText.trim()) {
                                  onRenameSnippet(snippet.id, editingText.trim());
                                }
                                setEditingId(null);
                              }}
                              className="rounded p-1 text-emerald-400 hover:bg-[var(--bg-active)]"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onLoadSnippet(snippet)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div
                              className="truncate text-xs font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {snippet.name}
                            </div>
                          </button>
                        )}

                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(snippet.id);
                              setEditingText(snippet.name);
                            }}
                            className="rounded p-1 hover:bg-[var(--bg-active)]"
                            style={{ color: 'var(--text-muted)' }}
                            title="Rename"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSnippet(snippet.id)}
                            className="rounded p-1 text-rose-400 hover:bg-rose-500/15"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onLoadSnippet(snippet)}
                        className="mt-1.5 flex w-full items-center justify-between text-[10px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span
                          className="rounded px-1.5 py-0.5 font-mono-code font-semibold"
                          style={{
                            backgroundColor: `${lang.accentHex}20`,
                            color: lang.accentHex,
                          }}
                        >
                          {lang.shortName}
                        </span>
                        <span>{formatTime(snippet.updatedAt)}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Recent Runs
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[11px] font-medium text-rose-400 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div
                className="rounded-lg border border-dashed px-4 py-8 text-center text-xs"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                Run code to capture automatic snapshots of your code, stdin, and timing.
              </div>
            ) : (
              <div className="space-y-1.5">
                {history.map((entry) => {
                  const lang = getLanguageById(entry.language);
                  const dotColor =
                    entry.status === 'success'
                      ? 'bg-emerald-400'
                      : entry.status === 'timeout'
                        ? 'bg-amber-400'
                        : 'bg-rose-400';

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onRestoreHistory(entry)}
                      className="flex w-full flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                          <span
                            className="rounded px-1.5 py-0.5 font-mono-code text-[10px] font-bold"
                            style={{
                              backgroundColor: `${lang.accentHex}20`,
                              color: lang.accentHex,
                            }}
                          >
                            {lang.name}
                          </span>
                        </div>
                        <span
                          className="flex items-center gap-1 font-mono-code text-[10px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {entry.runTimeMs}ms
                        </span>
                      </div>

                      <div
                        className="truncate font-mono-code text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {entry.stdoutPreview || '(no stdout)'}
                      </div>

                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(entry.timestamp)} · Click to restore
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
