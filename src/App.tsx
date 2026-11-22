import type React from 'react';
import { Code2, Terminal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditorPane, type CodeEditorHandle } from './components/CodeEditorPane';
import { CommandPalette } from './components/CommandPalette';
import { IOPane } from './components/IOPane';
import { SettingsModal } from './components/SettingsModal';
import { SidebarDrawer } from './components/SidebarDrawer';
import { ToastContainer, type ToastItem } from './components/ToastContainer';
import { TopBar } from './components/TopBar';
import { LANGUAGES, getLanguageById } from './data/languages';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSplitPane } from './hooks/useSplitPane';
import type {
  AccentId,
  CompilerMode,
  ConsoleLogMessage,
  EditorSettings,
  ExecutionResult,
  LanguageId,
  LanguageTemplate,
  OutputTabId,
  RunHistoryEntry,
  RuntimeCapability,
  SavedSnippet,
  SidebarTabId,
  StudioSettings,
  ThemeId,
  WebCodeBundle,
  WebTabId,
  WorkspaceProject,
} from './types/playground';
import { decodeShareFromHash, encodeShareUrl } from './utils/shareUrl';
import { executeSqlBrowser } from './utils/sqlEngine';
import { buildWebSandboxDoc, type SandboxConsolePayload } from './utils/webSandbox';
import { detectLanguage } from './utils/autoDetect';

interface LanguageDraft {
  code: string;
  webCode?: WebCodeBundle;
  stdin: string;
}

const DEFAULT_SETTINGS: StudioSettings = {
  theme: 'obsidian',
  accent: 'indigo',
  layout: 'horizontal',
  autoRun: false,
  timeoutMs: 10000,
  remoteApiUrl: '',
  compilerMode: 'manual',
  editor: {
    fontSize: 14,
    tabSize: 4,
    fontFamily: 'jetbrains',
    ligatures: true,
    wordWrap: false,
    minimap: false,
    vimMode: false,
    lineNumbers: true,
  },
};

function createInitialDrafts(): Record<LanguageId, LanguageDraft> {
  const drafts = {} as Record<LanguageId, LanguageDraft>;
  for (const lang of LANGUAGES) {
    const first = lang.templates[0];
    drafts[lang.id] = {
      code: first?.code ?? '',
      webCode: first?.webCode ? { ...first.webCode } : undefined,
      stdin: first?.stdin ?? '',
    };
  }
  return drafts;
}

function createInitialFlags(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const lang of LANGUAGES) {
    if (lang.defaultFlags) {
      map[lang.id] = [...lang.defaultFlags];
    }
  }
  return map;
}

const THEME_CYCLE: ThemeId[] = ['obsidian', 'midnight', 'daylight', 'high-contrast'];

export default function App() {
  const [settings, setSettings] = useLocalStorage<StudioSettings>(
    'codexforge.settings.v1',
    DEFAULT_SETTINGS,
  );
  const [activeLanguageId, setActiveLanguageId] = useLocalStorage<LanguageId>(
    'codexforge.activeLanguage.v1',
    'python',
  );
  const [drafts, setDrafts] = useLocalStorage<Record<LanguageId, LanguageDraft>>(
    'codexforge.drafts.v1',
    createInitialDrafts(),
  );
  const [languageFlags, setLanguageFlags] = useLocalStorage<Record<string, string[]>>(
    'codexforge.flags.v1',
    createInitialFlags(),
  );
  const [savedSnippets, setSavedSnippets] = useLocalStorage<SavedSnippet[]>(
    'codexforge.snippets.v1',
    [],
  );
  const [history, setHistory] = useLocalStorage<RunHistoryEntry[]>(
    'codexforge.history.v1',
    [],
  );
  const [workspaces, setWorkspaces] = useLocalStorage<WorkspaceProject[]>(
    'codexforge.workspaces.v1',
    [],
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useLocalStorage<string>(
    'codexforge.activeWorkspace.v1',
    '',
  );
  const [activeFilePath, setActiveFilePath] = useLocalStorage<string>(
    'codexforge.activeFile.v1',
    '',
  );

  const [capabilities, setCapabilities] = useState<RuntimeCapability[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<SidebarTabId>('templates');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [webTab, setWebTab] = useState<WebTabId>('html');
  const [outputTab, setOutputTab] = useState<OutputTabId>('console');
  const [mobilePane, setMobilePane] = useState<'editor' | 'output'>('editor');

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [webSrcDoc, setWebSrcDoc] = useState<string>('');
  const [webRenderKey, setWebRenderKey] = useState(1);
  const [webLogs, setWebLogs] = useState<ConsoleLogMessage[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const editorRef = useRef<CodeEditorHandle | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const activeWebRunIdRef = useRef<string>('init');
  const autoRunInitRef = useRef(true);

  const language = useMemo(() => getLanguageById(activeLanguageId), [activeLanguageId]);
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces],
  );

  const currentDraft = useMemo<LanguageDraft>(() => {
    const existing = drafts[activeLanguageId];
    if (existing) return existing;
    const first = language.templates[0];
    return {
      code: first?.code ?? '',
      webCode: first?.webCode ? { ...first.webCode } : undefined,
      stdin: first?.stdin ?? '',
    };
  }, [activeLanguageId, drafts, language]);

  const notify = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Synchronize CSS theme & accent attributes on root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-accent', settings.accent);
  }, [settings.theme, settings.accent]);

  // Load shared snippet from URL hash if present
  useEffect(() => {
    const shared = decodeShareFromHash(window.location.hash);
    if (!shared) return;
    const targetLang = getLanguageById(shared.language);
    setActiveLanguageId(targetLang.id);
    setDrafts((prev) => ({
      ...prev,
      [targetLang.id]: {
        code: shared.code,
        webCode: shared.webCode,
        stdin: shared.stdin ?? '',
      },
    }));
    window.history.replaceState(null, '', window.location.pathname);
    notify(`Loaded shared ${targetLang.name} playground`, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch local/cloud runtime capabilities
  const fetchCapabilities = useCallback(async (refresh = false) => {
    try {
      const res = await fetch(`/api/languages${refresh ? '?refresh=1' : ''}`);
      if (!res.ok) return;
      const data = (await res.json()) as { capabilities?: RuntimeCapability[] };
      if (Array.isArray(data.capabilities)) {
        setCapabilities(data.capabilities);
      }
    } catch {
      // Server may be starting up
    }
  }, []);

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    if (!activeWorkspace) return;
    setActiveLanguageId(activeWorkspace.language);
  }, [activeWorkspace?.id, activeWorkspace?.language, setActiveLanguageId]);

  useEffect(() => {
    if (!activeWorkspace) return;
    const timer = window.setTimeout(() => {
      void fetch(`/api/workspaces/${encodeURIComponent(activeWorkspace.id)}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: activeWorkspace.files }),
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeWorkspace]);

  // Web sandbox console postMessage bridge
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const payload = event.data as Partial<SandboxConsolePayload> | null;
      if (!payload || payload.source !== 'codexforge-sandbox') return;
      if (payload.runId !== activeWebRunIdRef.current) return;

      setWebLogs((prev) => [
        ...prev.slice(-199),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          level: payload.level ?? 'log',
          args: Array.isArray(payload.args) ? payload.args : [],
          timestamp: Date.now(),
        },
      ]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Initialize web preview when switching into Web language
  useEffect(() => {
    if (language.id === 'web') {
      const bundle = currentDraft.webCode ??
        language.templates[0]?.webCode ?? { html: '', css: '', js: '' };
      const runId = `web-${Date.now()}`;
      activeWebRunIdRef.current = runId;
      setWebLogs([]);
      setWebSrcDoc(buildWebSandboxDoc(bundle, runId));
      setWebRenderKey((k) => k + 1);
      setOutputTab('preview');
    } else if (language.id === 'sql') {
      setOutputTab('tables');
    } else {
      setOutputTab('console');
    }
    // Reset active error markers when changing languages
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language.id]);

  // Main Split Pane between Editor and IO
  const mainSplit = useSplitPane({
    direction: settings.layout,
    initialPct: 54,
    minPct: 25,
    maxPct: 75,
  });

  const updateSettings = useCallback(
    (patch: Partial<StudioSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [setSettings],
  );

  const updateEditorSettings = useCallback(
    (patch: Partial<EditorSettings>) => {
      setSettings((prev) => ({
        ...prev,
        editor: { ...prev.editor, ...patch },
      }));
    },
    [setSettings],
  );

  const updateCurrentCode = useCallback(
    (nextCode: string) => {
      setDrafts((prev) => ({
        ...prev,
        [activeLanguageId]: {
          ...currentDraft,
          code: nextCode,
        },
      }));
      if (activeWorkspace && activeFilePath) {
        setWorkspaces((prev) =>
          prev.map((workspace) =>
            workspace.id === activeWorkspace.id
              ? {
                  ...workspace,
                  updatedAt: Date.now(),
                  files: workspace.files.map((file) =>
                    file.path === activeFilePath ? { ...file, content: nextCode } : file,
                  ),
                }
              : workspace,
          ),
        );
      }
    },
    [activeFilePath, activeLanguageId, activeWorkspace, currentDraft, setDrafts, setWorkspaces],
  );

  const updateCurrentWebCode = useCallback(
    (tab: WebTabId, nextVal: string) => {
      const existing = currentDraft.webCode ?? { html: '', css: '', js: '' };
      setDrafts((prev) => ({
        ...prev,
        [activeLanguageId]: {
          ...currentDraft,
          webCode: {
            ...existing,
            [tab]: nextVal,
          },
        },
      }));
    },
    [activeLanguageId, currentDraft, setDrafts],
  );

  const updateCurrentStdin = useCallback(
    (nextStdin: string) => {
      setDrafts((prev) => ({
        ...prev,
        [activeLanguageId]: {
          ...currentDraft,
          stdin: nextStdin,
        },
      }));
    },
    [activeLanguageId, currentDraft, setDrafts],
  );

  const recordHistory = useCallback(
    (res: ExecutionResult, codeSnapshot: string, webSnapshot: WebCodeBundle | undefined, stdinSnapshot: string) => {
      const previewSource = res.stdout || res.stderr || '';
      const firstLine = previewSource.split(/\r?\n/).find((l) => l.trim())?.slice(0, 90) ?? '';
      const entry: RunHistoryEntry = {
        id: res.runId,
        language: activeLanguageId,
        code: codeSnapshot,
        webCode: webSnapshot,
        stdin: stdinSnapshot,
        status: res.status,
        runTimeMs: res.runTimeMs,
        compileTimeMs: res.compileTimeMs,
        exitCode: res.exitCode,
        stdoutPreview: firstLine,
        timestamp: Date.now(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 30));
    },
    [activeLanguageId, setHistory],
  );

  const handleStop = useCallback(async () => {
    const runId = activeRunIdRef.current;
    abortControllerRef.current?.abort();
    if (runId) {
      try {
        await fetch(`/api/stop/${encodeURIComponent(runId)}`, { method: 'POST' });
      } catch {
        // Ignore network error during cancellation
      }
    }
    activeRunIdRef.current = null;
    setIsRunning(false);
    setResult((prev) =>
      prev
        ? { ...prev, status: 'cancelled' }
        : {
            runId: runId ?? `stop-${Date.now()}`,
            status: 'cancelled',
            engine: language.engine,
            stdout: '',
            stderr: 'Execution cancelled by user.',
            compilerOutput: '',
            exitCode: null,
            compileTimeMs: null,
            runTimeMs: 0,
            diagnostics: [],
            timestamp: Date.now(),
          },
    );
  }, [language.engine]);

  const handleRun = useCallback(async () => {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Browser Web Sandbox execution
    if (language.id === 'web') {
      const bundle = currentDraft.webCode ??
        language.templates[0]?.webCode ?? { html: '', css: '', js: '' };
      activeWebRunIdRef.current = runId;
      setWebLogs([]);
      setWebSrcDoc(buildWebSandboxDoc(bundle, runId));
      setWebRenderKey((k) => k + 1);
      setResult({
        runId,
        status: 'success',
        engine: 'browser',
        stdout: 'Preview updated',
        stderr: '',
        compilerOutput: '',
        exitCode: 0,
        compileTimeMs: null,
        runTimeMs: 1,
        diagnostics: [],
        runtimeVersion: 'Browser Sandbox',
        timestamp: Date.now(),
      });
      return;
    }

    // Browser SQLite WASM execution
    if (language.id === 'sql') {
      setIsRunning(true);
      const sqlResult = await executeSqlBrowser(runId, currentDraft.code);
      setIsRunning(false);
      setResult(sqlResult);
      if (sqlResult.status === 'success' && sqlResult.sqlTables && sqlResult.sqlTables.length > 0) {
        setOutputTab('tables');
      } else {
        setOutputTab('console');
      }
      recordHistory(sqlResult, currentDraft.code, undefined, '');
      return;
    }

    // Cancel any existing backend request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      if (activeRunIdRef.current) {
        void fetch(`/api/stop/${encodeURIComponent(activeRunIdRef.current)}`, { method: 'POST' });
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    activeRunIdRef.current = runId;

    setIsRunning(true);
    setOutputTab('console');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          runId,
          language: language.id,
          code: currentDraft.code,
          stdin: currentDraft.stdin,
          flags: languageFlags[language.id] ?? language.defaultFlags ?? [],
          timeoutMs: settings.timeoutMs,
          remoteApiUrl: settings.remoteApiUrl || undefined,
          entryFile: activeWorkspace?.entryFile,
          files: activeWorkspace?.files,
        }),
      });

      const data = (await response.json()) as Omit<ExecutionResult, 'timestamp'>;
      const finalResult: ExecutionResult = {
        ...data,
        timestamp: Date.now(),
      };

      if (activeRunIdRef.current === runId) {
        setResult(finalResult);
        recordHistory(finalResult, currentDraft.code, undefined, currentDraft.stdin);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setResult({
        runId,
        status: 'error',
        engine: language.engine,
        stdout: '',
        stderr: `Failed to reach local execution server: ${message}`,
        compilerOutput: '',
        exitCode: null,
        compileTimeMs: null,
        runTimeMs: 0,
        diagnostics: [],
        timestamp: Date.now(),
      });
    } finally {
      if (activeRunIdRef.current === runId) {
        activeRunIdRef.current = null;
        setIsRunning(false);
      }
    }
  }, [
    activeWorkspace,
    currentDraft.code,
    currentDraft.stdin,
    currentDraft.webCode,
    language,
    languageFlags,
    recordHistory,
    settings.remoteApiUrl,
    settings.timeoutMs,
  ]);

  // Auto-run debounced effect
  useEffect(() => {
    if (autoRunInitRef.current) {
      autoRunInitRef.current = false;
      return;
    }
    if (!settings.autoRun) return;
    const delay = language.engine === 'browser' ? 350 : 850;
    const timer = window.setTimeout(() => {
      void handleRun();
    }, delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoRun, currentDraft.code, currentDraft.webCode, currentDraft.stdin, language.id]);

  // Debounced auto-detect language from code
  useEffect(() => {
    if (settings.compilerMode !== 'auto') return;
    if (!currentDraft.code || currentDraft.code.trim().length < 20) return;
    const timer = window.setTimeout(() => {
      const result = detectLanguage(currentDraft.code);
      if (result.confidence > 25 && result.languageId !== activeLanguageId) {
        setActiveLanguageId(result.languageId);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.compilerMode, currentDraft.code]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        void handleRun();
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setDrawerOpen((d) => !d);
      } else if (e.key === '\\') {
        e.preventDefault();
        updateSettings({
          layout: settings.layout === 'horizontal' ? 'vertical' : 'horizontal',
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun, settings.layout, updateSettings]);

  const handleApplyTemplate = useCallback(
    (tpl: LanguageTemplate) => {
      setDrafts((prev) => ({
        ...prev,
        [activeLanguageId]: {
          code: tpl.code,
          webCode: tpl.webCode ? { ...tpl.webCode } : undefined,
          stdin: tpl.stdin ?? '',
        },
      }));
      notify(`Loaded template: ${tpl.name}`, 'success');
      if (activeLanguageId === 'web' && tpl.webCode) {
        const runId = `web-${Date.now()}`;
        activeWebRunIdRef.current = runId;
        setWebLogs([]);
        setWebSrcDoc(buildWebSandboxDoc(tpl.webCode, runId));
        setWebRenderKey((k) => k + 1);
      }
    },
    [activeLanguageId, notify, setDrafts],
  );

  const handleResetTemplate = useCallback(() => {
    const first = language.templates[0];
    if (first) {
      handleApplyTemplate(first);
    }
  }, [handleApplyTemplate, language.templates]);

  const handleToggleFlag = useCallback(
    (flag: string, group: 'standard' | 'optimization' | 'warnings') => {
      setLanguageFlags((prev) => {
        const current = prev[language.id] ?? language.defaultFlags ?? [];
        const sameGroupFlags =
          language.flagOptions?.filter((f) => f.group === group).map((f) => f.flag) ?? [];

        let next: string[];
        if (group === 'warnings') {
          next = current.includes(flag)
            ? current.filter((f) => f !== flag)
            : [...current, flag];
        } else {
          // Radio behavior within standard or optimization groups
          next = [...current.filter((f) => !sameGroupFlags.includes(f)), flag];
        }
        return { ...prev, [language.id]: next };
      });
    },
    [language.defaultFlags, language.flagOptions, language.id, setLanguageFlags],
  );

  const handleShare = useCallback(async () => {
    try {
      const url = encodeShareUrl({
        language: activeLanguageId,
        code: currentDraft.code,
        webCode: currentDraft.webCode,
        stdin: currentDraft.stdin,
      });
      window.history.replaceState(null, '', url);
      await navigator.clipboard.writeText(url);
      notify('Shareable playground URL copied to clipboard', 'success');
    } catch {
      notify('Failed to copy shareable URL', 'error');
    }
  }, [activeLanguageId, currentDraft, notify]);

  const handleSaveSnippet = useCallback(
    (name: string) => {
      const now = Date.now();
      const snippet: SavedSnippet = {
        id: `snip-${now}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        language: activeLanguageId,
        code: currentDraft.code,
        webCode: currentDraft.webCode ? { ...currentDraft.webCode } : undefined,
        stdin: currentDraft.stdin,
        createdAt: now,
        updatedAt: now,
      };
      setSavedSnippets((prev) => [snippet, ...prev]);
      notify(`Saved "${name}"`, 'success');
    },
    [activeLanguageId, currentDraft, notify, setSavedSnippets],
  );

  const handleLoadSnippet = useCallback(
    (snippet: SavedSnippet) => {
      setActiveLanguageId(snippet.language);
      setDrafts((prev) => ({
        ...prev,
        [snippet.language]: {
          code: snippet.code,
          webCode: snippet.webCode ? { ...snippet.webCode } : undefined,
          stdin: snippet.stdin,
        },
      }));
      notify(`Loaded "${snippet.name}"`, 'info');
    },
    [notify, setActiveLanguageId, setDrafts],
  );

  const handleRestoreHistory = useCallback(
    (entry: RunHistoryEntry) => {
      setActiveLanguageId(entry.language);
      setDrafts((prev) => ({
        ...prev,
        [entry.language]: {
          code: entry.code,
          webCode: entry.webCode ? { ...entry.webCode } : undefined,
          stdin: entry.stdin,
        },
      }));
      notify(`Restored snapshot from ${new Date(entry.timestamp).toLocaleTimeString()}`, 'info');
    },
    [notify, setActiveLanguageId, setDrafts],
  );

  const handleCycleTheme = useCallback(() => {
    const idx = THEME_CYCLE.indexOf(settings.theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    updateSettings({ theme: next });
    notify(`Theme: ${next}`, 'info');
  }, [notify, settings.theme, updateSettings]);

  const handleCreateWorkspace = useCallback(
    (name: string) => {
      const now = Date.now();
      const id = `ws-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const fileName = language.filename || 'main.txt';
      const workspace: WorkspaceProject = {
        id,
        name: name.trim() || `${language.name} Workspace`,
        language: language.id,
        entryFile: fileName,
        files: [{ path: fileName, content: currentDraft.code }],
        createdAt: now,
        updatedAt: now,
      };
      setWorkspaces((prev) => [workspace, ...prev]);
      setActiveWorkspaceId(id);
      setActiveFilePath(fileName);
      setOutputTab('terminal');
      notify(`Created workspace "${workspace.name}"`, 'success');
    },
    [currentDraft.code, language, notify, setActiveFilePath, setActiveWorkspaceId, setOutputTab, setWorkspaces],
  );

  const handleSelectWorkspace = useCallback(
    (workspace: WorkspaceProject) => {
      setActiveWorkspaceId(workspace.id);
      setActiveLanguageId(workspace.language);
      const file = workspace.files.find((item) => item.path === workspace.entryFile) ?? workspace.files[0];
      if (file) {
        setActiveFilePath(file.path);
        setDrafts((prev) => ({
          ...prev,
          [workspace.language]: {
            code: file.content,
            stdin: prev[workspace.language]?.stdin ?? '',
          },
        }));
      }
      setOutputTab('terminal');
    },
    [setActiveFilePath, setActiveLanguageId, setActiveWorkspaceId, setDrafts],
  );

  const handleSelectProjectFile = useCallback(
    (path: string) => {
      const file = activeWorkspace?.files.find((item) => item.path === path);
      if (!file) return;
      setActiveFilePath(path);
      setDrafts((prev) => ({
        ...prev,
        [activeLanguageId]: {
          ...currentDraft,
          code: file.content,
        },
      }));
    },
    [activeLanguageId, activeWorkspace, currentDraft, setActiveFilePath, setDrafts],
  );

  const handleCreateProjectFile = useCallback(
    (path: string) => {
      if (!activeWorkspace) return;
      const cleanPath = path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
      if (!cleanPath || cleanPath.split('/').includes('..')) {
        notify('Invalid file path', 'error');
        return;
      }
      if (activeWorkspace.files.some((file) => file.path === cleanPath)) {
        handleSelectProjectFile(cleanPath);
        return;
      }
      const nextWorkspace: WorkspaceProject = {
        ...activeWorkspace,
        updatedAt: Date.now(),
        files: [...activeWorkspace.files, { path: cleanPath, content: '' }],
      };
      setWorkspaces((prev) =>
        prev.map((workspace) => (workspace.id === activeWorkspace.id ? nextWorkspace : workspace)),
      );
      setActiveFilePath(cleanPath);
      setDrafts((prev) => ({
        ...prev,
        [activeLanguageId]: { ...currentDraft, code: '' },
      }));
      notify(`Created ${cleanPath}`, 'success');
    },
    [activeLanguageId, activeWorkspace, currentDraft, handleSelectProjectFile, notify, setActiveFilePath, setDrafts, setWorkspaces],
  );

  const handleDeleteProjectFile = useCallback(
    (path: string) => {
      if (!activeWorkspace) return;
      if (activeWorkspace.files.length === 1) {
        notify('A workspace must keep at least one file', 'error');
        return;
      }
      const files = activeWorkspace.files.filter((file) => file.path !== path);
      const entryFile = activeWorkspace.entryFile === path ? files[0].path : activeWorkspace.entryFile;
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === activeWorkspace.id
            ? { ...workspace, entryFile, files, updatedAt: Date.now() }
            : workspace,
        ),
      );
      if (activeFilePath === path) {
        setActiveFilePath(files[0].path);
        setDrafts((prev) => ({
          ...prev,
          [activeLanguageId]: { ...currentDraft, code: files[0].content },
        }));
      }
    },
    [activeFilePath, activeLanguageId, activeWorkspace, currentDraft, notify, setActiveFilePath, setDrafts, setWorkspaces],
  );

  const handleSetEntryFile = useCallback(
    (path: string) => {
      if (!activeWorkspace) return;
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === activeWorkspace.id ? { ...workspace, entryFile: path, updatedAt: Date.now() } : workspace,
        ),
      );
      notify(`Entry file set to ${path}`, 'success');
    },
    [activeWorkspace, notify, setWorkspaces],
  );

  const handleDeleteWorkspace = useCallback(
    (id: string) => {
      setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== id));
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId('');
        setActiveFilePath('');
      }
      notify('Workspace deleted', 'info');
    },
    [activeWorkspaceId, notify, setActiveFilePath, setActiveWorkspaceId, setWorkspaces],
  );

  const isHorizontal = settings.layout === 'horizontal';

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <TopBar
        language={language}
        capabilities={capabilities}
        isRunning={isRunning}
        autoRun={settings.autoRun}
        drawerOpen={drawerOpen}
        layout={settings.layout}
        theme={settings.theme}
        selectedFlags={languageFlags[language.id] ?? language.defaultFlags ?? []}
        timeoutMs={settings.timeoutMs}
        compilerMode={settings.compilerMode}
        currentCode={currentDraft.code}
        onSelectLanguage={setActiveLanguageId}
        onRun={() => void handleRun()}
        onStop={() => void handleStop()}
        onToggleAutoRun={() => {
          const next = !settings.autoRun;
          updateSettings({ autoRun: next });
          notify(next ? 'Auto-Run enabled' : 'Auto-Run disabled', 'info');
        }}
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
        onToggleLayout={() =>
          updateSettings({
            layout: settings.layout === 'horizontal' ? 'vertical' : 'horizontal',
          })
        }
        onCycleTheme={handleCycleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
        onShare={() => void handleShare()}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleFlag={handleToggleFlag}
        onChangeTimeout={(ms) => updateSettings({ timeoutMs: ms })}
        onChangeCompilerMode={(mode: CompilerMode) => {
          updateSettings({ compilerMode: mode });
          notify(mode === 'auto' ? '✦ Auto-Detect compiler enabled' : 'Manual compiler mode', 'info');
        }}
      />

      {/* Mobile Pane Switcher (< md) */}
      <div
        className="flex shrink-0 border-b p-1 md:hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {[
          { id: 'editor' as const, label: 'Editor', icon: Code2 },
          { id: 'output' as const, label: 'Output & I/O', icon: Terminal },
        ].map((item) => {
          const Icon = item.icon;
          const active = mobilePane === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMobilePane(item.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium"
              style={{
                backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Workbench Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SidebarDrawer
          open={drawerOpen}
          activeTab={drawerTab}
          language={language}
          savedSnippets={savedSnippets}
          history={history}
          onChangeTab={setDrawerTab}
          onClose={() => setDrawerOpen(false)}
          onApplyTemplate={handleApplyTemplate}
          onSaveSnippet={handleSaveSnippet}
          onLoadSnippet={handleLoadSnippet}
          onRenameSnippet={(id, name) =>
            setSavedSnippets((prev) =>
              prev.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s)),
            )
          }
          onDeleteSnippet={(id) =>
            setSavedSnippets((prev) => prev.filter((s) => s.id !== id))
          }
          onRestoreHistory={handleRestoreHistory}
          onClearHistory={() => setHistory([])}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          activeFilePath={activeFilePath}
          onCreateWorkspace={handleCreateWorkspace}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectProjectFile={handleSelectProjectFile}
          onCreateProjectFile={handleCreateProjectFile}
          onDeleteProjectFile={handleDeleteProjectFile}
          onSetEntryFile={handleSetEntryFile}
          onDeleteWorkspace={handleDeleteWorkspace}
        />

        {/* Resizable Split Workbench */}
        <div
          ref={mainSplit.containerRef}
          className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${
            isHorizontal ? 'flex-row' : 'flex-col'
          }`}
        >
          {/* Editor Pane */}
          <div
            className={`min-h-0 min-w-0 overflow-hidden md:flex-[0_0_var(--split-pct)] ${
              mobilePane === 'editor' ? 'flex flex-1' : 'hidden md:flex'
            }`}
            style={{ '--split-pct': `${mainSplit.pct}%` } as React.CSSProperties}
          >
            <div className="h-full w-full">
              <CodeEditorPane
                ref={editorRef}
                language={language}
                code={currentDraft.code}
                webCode={
                  currentDraft.webCode ??
                  language.templates[0]?.webCode ?? { html: '', css: '', js: '' }
                }
                webTab={webTab}
                theme={settings.theme}
                editorSettings={settings.editor}
                diagnostics={result?.diagnostics ?? []}
                onChangeCode={updateCurrentCode}
                onChangeWebCode={updateCurrentWebCode}
                onChangeWebTab={setWebTab}
                onUpdateEditorSettings={updateEditorSettings}
                onResetTemplate={handleResetTemplate}
                onRunShortcut={() => void handleRun()}
                onNotify={(m) => notify(m, 'success')}
                activeFilename={activeFilePath || undefined}
              />
            </div>
          </div>

          {/* Interactive Split Divider (Desktop >= md) */}
          <div
            onPointerDown={mainSplit.onPointerDown}
            onDoubleClick={mainSplit.reset}
            className={`group relative hidden shrink-0 items-center justify-center transition-colors hover:bg-[var(--accent-soft)] md:flex ${
              isHorizontal
                ? 'w-1.5 cursor-col-resize border-x'
                : 'h-1.5 cursor-row-resize border-y'
            }`}
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: mainSplit.isDragging ? 'var(--accent-soft)' : 'var(--bg-app)',
            }}
            title="Drag to resize panes (double-click to reset)"
          >
            <div
              className={`rounded-full transition-colors group-hover:bg-[var(--accent)] ${
                isHorizontal ? 'h-8 w-0.5' : 'h-0.5 w-8'
              }`}
              style={{
                backgroundColor: mainSplit.isDragging
                  ? 'var(--accent)'
                  : 'var(--border-strong)',
              }}
            />
          </div>

          {/* IO / Output Pane */}
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
              mobilePane === 'output' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="h-full w-full">
              <IOPane
                language={language}
                stdin={currentDraft.stdin}
                result={result}
                isRunning={isRunning}
                activeTab={outputTab}
                webSrcDoc={webSrcDoc}
                webRenderKey={webRenderKey}
                webLogs={webLogs}
                isDraggingParentSplit={mainSplit.isDragging}
                onChangeStdin={updateCurrentStdin}
                onChangeTab={setOutputTab}
                onClearOutput={() => {
                  setResult(null);
                  setWebLogs([]);
                }}
                onRefreshPreview={() => {
                  const bundle = currentDraft.webCode ??
                    language.templates[0]?.webCode ?? { html: '', css: '', js: '' };
                  const runId = `web-${Date.now()}`;
                  activeWebRunIdRef.current = runId;
                  setWebLogs([]);
                  setWebSrcDoc(buildWebSandboxDoc(bundle, runId));
                  setWebRenderKey((k) => k + 1);
                }}
                onJumpToLine={(line, col) => editorRef.current?.jumpToLine(line, col)}
                onNotify={(m) => notify(m, 'success')}
                workspaceId={activeWorkspace?.id}
                workspaceName={activeWorkspace?.name}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <CommandPalette
        open={paletteOpen}
        currentLanguage={activeLanguageId}
        currentTheme={settings.theme}
        currentAccent={settings.accent}
        onClose={() => setPaletteOpen(false)}
        onRun={() => void handleRun()}
        onSelectLanguage={setActiveLanguageId}
        onSelectTheme={(theme: ThemeId) => updateSettings({ theme })}
        onSelectAccent={(accent: AccentId) => updateSettings({ accent })}
        onToggleLayout={() =>
          updateSettings({
            layout: settings.layout === 'horizontal' ? 'vertical' : 'horizontal',
          })
        }
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
        onToggleAutoRun={() => updateSettings({ autoRun: !settings.autoRun })}
        onToggleVim={() => updateEditorSettings({ vimMode: !settings.editor.vimMode })}
        onFormat={() => editorRef.current?.formatDocument()}
        onShare={() => void handleShare()}
        onResetTemplate={handleResetTemplate}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        capabilities={capabilities}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onUpdateEditorSettings={updateEditorSettings}
        onRefreshCapabilities={() => void fetchCapabilities(true)}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
