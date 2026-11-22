import Editor, { type OnMount } from '@monaco-editor/react';
import {
  Check,
  Copy,
  Download,
  FileCode,
  RotateCcw,
  Settings2,
  Sparkles,
} from 'lucide-react';
import type * as MonacoType from 'monaco-editor';
import { initVimMode, type VimAdapterInstance } from 'monaco-vim';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type {
  Diagnostic,
  EditorSettings,
  LanguageDefinition,
  ThemeId,
  WebCodeBundle,
  WebTabId,
} from '../types/playground';
import { ensureMonacoConfigured, monaco } from '../utils/monacoSetup';

ensureMonacoConfigured();

export interface CodeEditorHandle {
  jumpToLine: (line: number, column?: number) => void;
  formatDocument: () => void;
  focus: () => void;
}

interface CodeEditorPaneProps {
  language: LanguageDefinition;
  code: string;
  webCode: WebCodeBundle;
  webTab: WebTabId;
  theme: ThemeId;
  editorSettings: EditorSettings;
  diagnostics: Diagnostic[];
  onChangeCode: (next: string) => void;
  onChangeWebCode: (tab: WebTabId, next: string) => void;
  onChangeWebTab: (tab: WebTabId) => void;
  onUpdateEditorSettings: (patch: Partial<EditorSettings>) => void;
  onResetTemplate: () => void;
  onRunShortcut: () => void;
  onNotify: (msg: string) => void;
  activeFilename?: string;
}

const WEB_TABS: { id: WebTabId; label: string; monacoLang: string; color: string }[] = [
  { id: 'html', label: 'index.html', monacoLang: 'html', color: '#F97316' },
  { id: 'css', label: 'styles.css', monacoLang: 'css', color: '#38BDF8' },
  { id: 'js', label: 'script.js', monacoLang: 'javascript', color: '#FACC15' },
];

export const CodeEditorPane = forwardRef<CodeEditorHandle, CodeEditorPaneProps>(
  function CodeEditorPane(
    {
      language,
      code,
      webCode,
      webTab,
      theme,
      editorSettings,
      diagnostics,
      onChangeCode,
      onChangeWebCode,
      onChangeWebTab,
      onUpdateEditorSettings,
      onResetTemplate,
      onRunShortcut,
      onNotify,
      activeFilename,
    },
    ref,
  ) {
    const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);
    const vimRef = useRef<VimAdapterInstance | null>(null);
    const vimStatusRef = useRef<HTMLDivElement | null>(null);
    const flashDecRef = useRef<string[]>([]);
    const settingsRef = useRef<HTMLDivElement | null>(null);
    const runShortcutRef = useRef(onRunShortcut);

    const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
    const [copied, setCopied] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    runShortcutRef.current = onRunShortcut;

    const isWeb = language.id === 'web';
    const activeValue = isWeb ? webCode[webTab] : code;
    const activeMonacoLang = isWeb
      ? WEB_TABS.find((t) => t.id === webTab)?.monacoLang ?? 'html'
      : language.monacoLanguage;
    const displayFilename = activeFilename ?? (isWeb
      ? WEB_TABS.find((t) => t.id === webTab)?.label ?? 'index.html'
      : language.filename);

    useImperativeHandle(ref, () => ({
      jumpToLine(line: number, column = 1) {
        const ed = editorRef.current;
        if (!ed) return;
        ed.revealLineInCenter(line);
        ed.setPosition({ lineNumber: line, column });
        ed.focus();

        flashDecRef.current = ed.deltaDecorations(flashDecRef.current, [
          {
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: 'monaco-error-flash-line',
            },
          },
        ]);
        window.setTimeout(() => {
          if (editorRef.current) {
            flashDecRef.current = editorRef.current.deltaDecorations(flashDecRef.current, []);
          }
        }, 1200);
      },
      formatDocument() {
        const ed = editorRef.current;
        if (!ed) return;
        const action = ed.getAction('editor.action.formatDocument');
        if (action) {
          void action.run();
        }
      },
      focus() {
        editorRef.current?.focus();
      },
    }));

    // Handle Vim mode activation & cleanup
    useEffect(() => {
      const ed = editorRef.current;
      if (!ed) return;

      if (vimRef.current) {
        vimRef.current.dispose();
        vimRef.current = null;
      }

      if (editorSettings.vimMode && vimStatusRef.current) {
        vimStatusRef.current.innerHTML = '';
        vimRef.current = initVimMode(ed, vimStatusRef.current);
      }

      return () => {
        if (vimRef.current) {
          vimRef.current.dispose();
          vimRef.current = null;
        }
      };
    }, [editorSettings.vimMode]);

    // Update Monaco diagnostic markers
    useEffect(() => {
      const ed = editorRef.current;
      if (!ed) return;
      const model = ed.getModel();
      if (!model) return;

      const markers: MonacoType.editor.IMarkerData[] = diagnostics.map((d) => ({
        startLineNumber: Math.max(1, Math.min(d.line, model.getLineCount())),
        startColumn: Math.max(1, d.column),
        endLineNumber: Math.max(1, Math.min(d.endLine ?? d.line, model.getLineCount())),
        endColumn: Math.max(2, d.endColumn ?? model.getLineMaxColumn(Math.min(d.line, model.getLineCount()))),
        message: d.message,
        severity:
          d.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : d.severity === 'info'
              ? monaco.MarkerSeverity.Info
              : monaco.MarkerSeverity.Error,
        source: d.source ?? 'compiler',
      }));

      monaco.editor.setModelMarkers(model, 'codexforge-compiler', markers);
    }, [diagnostics, activeMonacoLang]);

    useEffect(() => {
      if (!settingsOpen) return;
      const onClickOut = (e: MouseEvent) => {
        if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
          setSettingsOpen(false);
        }
      };
      window.addEventListener('mousedown', onClickOut);
      return () => window.removeEventListener('mousedown', onClickOut);
    }, [settingsOpen]);

    const handleMount: OnMount = (editor) => {
      editorRef.current = editor;

      editor.onDidChangeCursorPosition((e) => {
        setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      });

      // Bind Ctrl/Cmd + Enter directly inside Monaco so it runs code even while typing
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runShortcutRef.current();
      });

      if (editorSettings.vimMode && vimStatusRef.current) {
        vimStatusRef.current.innerHTML = '';
        vimRef.current = initVimMode(editor, vimStatusRef.current);
      }
    };

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(activeValue);
        setCopied(true);
        onNotify(`Copied ${displayFilename} to clipboard`);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        onNotify('Clipboard access denied');
      }
    };

    const handleDownload = () => {
      const content = isWeb
        ? `<!doctype html>\n<html>\n<head>\n<style>\n${webCode.css}\n</style>\n</head>\n<body>\n${webCode.html}\n<script>\n${webCode.js}\n</script>\n</body>\n</html>`
        : code;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = displayFilename.split('/').pop() ?? displayFilename;
      a.click();
      URL.revokeObjectURL(url);
      onNotify(`Downloaded ${displayFilename}`);
    };

    const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
    const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

    const fontFamilyString =
      editorSettings.fontFamily === 'fira'
        ? "'Fira Code', 'JetBrains Mono', monospace"
        : "'JetBrains Mono', 'Fira Code', monospace";

    return (
      <section
        className="flex h-full min-h-0 min-w-0 flex-col"
        style={{ backgroundColor: 'var(--bg-editor)' }}
      >
        {/* Editor Top Header Strip */}
        <div
          className="flex h-9 shrink-0 items-center justify-between border-b px-2.5 select-none"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* Left: File Pill or Web Multi-Tab Pills */}
          <div className="flex min-w-0 items-center gap-1">
            {isWeb ? (
              <div className="flex items-center gap-1">
                {WEB_TABS.map((t) => {
                  const active = webTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onChangeWebTab(t.id)}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono-code text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono-code text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <FileCode className="h-3.5 w-3.5" style={{ color: language.accentHex }} />
                <span>{displayFilename}</span>
              </div>
            )}
          </div>

          {/* Right: Inline Editor Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const action = editorRef.current?.getAction('editor.action.formatDocument');
                if (action) void action.run();
              }}
              className="flex h-6.5 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title="Format document (Shift+Alt+F)"
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden lg:inline">Format</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex h-6.5 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title="Copy buffer"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              <span className="hidden xl:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex h-6.5 w-6.5 items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title={`Download ${displayFilename}`}
              aria-label="Download source file"
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onResetTemplate}
              className="flex h-6.5 w-6.5 items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title="Reset to default starter template"
              aria-label="Reset code to template"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Quick Editor Preferences Popover */}
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className="flex h-6.5 items-center gap-1 rounded border px-2 text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  borderColor: settingsOpen ? 'var(--accent)' : 'var(--border-subtle)',
                  backgroundColor: settingsOpen ? 'var(--accent-soft)' : 'transparent',
                  color: settingsOpen ? 'var(--accent)' : 'var(--text-secondary)',
                }}
                title="Editor preferences"
              >
                <Settings2 className="h-3 w-3" />
                {editorSettings.vimMode && (
                  <span className="rounded bg-emerald-500/20 px-1 font-mono-code text-[9px] text-emerald-400">
                    VIM
                  </span>
                )}
              </button>

              {settingsOpen && (
                <div
                  className="animate-pop-in absolute top-full right-0 z-50 mt-1.5 w-64 rounded-lg border p-3 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    boxShadow: 'var(--shadow-overlay)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div
                    className="mb-2.5 text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Editor Controls
                  </div>

                  <div className="space-y-2.5">
                    {/* Font Size */}
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Font Size</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateEditorSettings({
                              fontSize: Math.max(11, editorSettings.fontSize - 1),
                            })
                          }
                          className="h-6 w-6 rounded border font-mono-code hover:bg-[var(--bg-hover)]"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono-code text-[11px]">
                          {editorSettings.fontSize}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateEditorSettings({
                              fontSize: Math.min(22, editorSettings.fontSize + 1),
                            })
                          }
                          className="h-6 w-6 rounded border font-mono-code hover:bg-[var(--bg-hover)]"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Tab Size */}
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Tab Width</span>
                      <div className="flex gap-1">
                        {[2, 4].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => onUpdateEditorSettings({ tabSize: sz })}
                            className="rounded border px-2 py-0.5 font-mono-code text-[11px]"
                            style={{
                              borderColor:
                                editorSettings.tabSize === sz
                                  ? 'var(--accent)'
                                  : 'var(--border-subtle)',
                              backgroundColor:
                                editorSettings.tabSize === sz
                                  ? 'var(--accent-soft)'
                                  : 'var(--bg-elevated)',
                              color:
                                editorSettings.tabSize === sz
                                  ? 'var(--accent)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family */}
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Font</span>
                      <div className="flex gap-1">
                        {[
                          { id: 'jetbrains' as const, label: 'JetBrains' },
                          { id: 'fira' as const, label: 'Fira Code' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => onUpdateEditorSettings({ fontFamily: f.id })}
                            className="rounded border px-1.5 py-0.5 text-[11px]"
                            style={{
                              borderColor:
                                editorSettings.fontFamily === f.id
                                  ? 'var(--accent)'
                                  : 'var(--border-subtle)',
                              backgroundColor:
                                editorSettings.fontFamily === f.id
                                  ? 'var(--accent-soft)'
                                  : 'var(--bg-elevated)',
                              color:
                                editorSettings.fontFamily === f.id
                                  ? 'var(--accent)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggle switches */}
                    {(
                      [
                        ['ligatures', 'Font Ligatures'],
                        ['wordWrap', 'Word Wrap'],
                        ['minimap', 'Minimap'],
                        ['lineNumbers', 'Line Numbers'],
                        ['vimMode', 'Vim Keybindings'],
                      ] as const
                    ).map(([key, label]) => {
                      const active = editorSettings[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onUpdateEditorSettings({ [key]: !active })}
                          className="flex w-full items-center justify-between rounded py-0.5 text-left"
                        >
                          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                          <span
                            className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
                            style={{
                              backgroundColor: active ? 'var(--accent)' : 'var(--bg-active)',
                            }}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                active ? 'translate-x-3.5' : 'translate-x-0.5'
                              }`}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monaco Editor Surface */}
        <div className="relative min-h-0 flex-1">
          <Editor
            height="100%"
            language={activeMonacoLang}
            value={activeValue}
            theme={`codexforge-${theme}`}
            onChange={(val) => {
              const next = val ?? '';
              if (isWeb) {
                onChangeWebCode(webTab, next);
              } else {
                onChangeCode(next);
              }
            }}
            onMount={handleMount}
            options={{
              fontSize: editorSettings.fontSize,
              tabSize: editorSettings.tabSize,
              insertSpaces: true,
              fontFamily: fontFamilyString,
              fontLigatures: editorSettings.ligatures,
              wordWrap: editorSettings.wordWrap ? 'on' : 'off',
              minimap: { enabled: editorSettings.minimap },
              lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'all',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>

        {/* Subtle Bottom Status Bar */}
        <div
          className="flex h-6 shrink-0 items-center justify-between border-t px-3 font-mono-code text-[10px] select-none"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="flex items-center gap-3">
            {editorSettings.vimMode && (
              <div
                ref={vimStatusRef}
                className="font-semibold"
                style={{ color: 'var(--accent)' }}
              />
            )}
            {(errorCount > 0 || warningCount > 0) && (
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <span className="text-rose-400">
                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-amber-400">
                    {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>
              Ln {cursorPos.line}, Col {cursorPos.column}
            </span>
            <span className="hidden sm:inline">Spaces: {editorSettings.tabSize}</span>
            <span className="hidden md:inline">UTF-8</span>
            <span style={{ color: 'var(--text-secondary)' }}>{language.name}</span>
          </div>
        </div>
      </section>
    );
  },
);
