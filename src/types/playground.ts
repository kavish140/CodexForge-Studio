export type LanguageId =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'cpp'
  | 'c'
  | 'turbo-cpp'
  | 'web'
  | 'sql'
  | 'rust'
  | 'go'
  | 'java'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'bash'
  | 'pascal'
  | 'haskell'
  | 'lua'
  | 'r'
  | 'kotlin'
  | 'scala'
  | 'swift'
  | 'dart'
  | 'perl'
  | 'fortran'
  | 'prolog'
  | 'cobol'
  | 'erlang'
  | 'elixir'
  | 'clojure';

export type CompilerMode = 'auto' | 'manual';

export type CompilerVariant = {
  id: string;
  label: string;
  description: string;
  engine: LanguageEngine;
  cloudCompiler?: string;
};

export type LanguageEngine = 'local' | 'browser' | 'cloud';

export type ThemeId = 'obsidian' | 'midnight' | 'daylight' | 'high-contrast';

export type AccentId = 'indigo' | 'emerald' | 'cyan' | 'amber' | 'rose';

export type LayoutMode = 'horizontal' | 'vertical';

export type WebTabId = 'html' | 'css' | 'js';

export type OutputTabId = 'console' | 'preview' | 'tables';

export type SidebarTabId = 'templates' | 'saved' | 'history';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: DiagnosticSeverity;
  message: string;
  source?: string;
}

export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'cancelled'
  | 'error';

export interface SqlTableResult {
  columns: string[];
  values: (string | number | null | Uint8Array)[][];
  rowCount: number;
}

export interface WebCodeBundle {
  html: string;
  css: string;
  js: string;
}

export interface ExecutionResult {
  runId: string;
  status: ExecutionStatus;
  engine: LanguageEngine;
  stdout: string;
  stderr: string;
  compilerOutput: string;
  exitCode: number | null;
  compileTimeMs: number | null;
  runTimeMs: number;
  diagnostics: Diagnostic[];
  runtimeVersion?: string;
  truncated?: boolean;
  sqlTables?: SqlTableResult[];
  timestamp: number;
}

export interface LanguageTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  webCode?: WebCodeBundle;
  stdin?: string;
}

export interface FlagOption {
  label: string;
  flag: string;
  group: 'standard' | 'optimization' | 'warnings';
}

export interface LanguageDefinition {
  id: LanguageId;
  name: string;
  shortName: string;
  monacoLanguage: string;
  extension: string;
  filename: string;
  engine: LanguageEngine;
  defaultVersion: string;
  accentHex: string;
  supportsStdin: boolean;
  supportsFlags?: boolean;
  flagOptions?: FlagOption[];
  defaultFlags?: string[];
  templates: LanguageTemplate[];
  /** Educational / legacy tag shown in picker */
  category?: 'modern' | 'systems' | 'web' | 'data' | 'educational' | 'functional' | 'scripting';
  /** Alternate compiler variants for this language */
  compilerVariants?: CompilerVariant[];
}

export interface RuntimeCapability {
  id: string;
  available: boolean;
  version: string | null;
  engine: LanguageEngine;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  fontFamily: 'jetbrains' | 'fira';
  ligatures: boolean;
  wordWrap: boolean;
  minimap: boolean;
  vimMode: boolean;
  lineNumbers: boolean;
}

export interface StudioSettings {
  theme: ThemeId;
  accent: AccentId;
  layout: LayoutMode;
  autoRun: boolean;
  timeoutMs: number;
  remoteApiUrl: string;
  editor: EditorSettings;
  compilerMode: CompilerMode;
}

export interface SavedSnippet {
  id: string;
  name: string;
  language: LanguageId;
  code: string;
  webCode?: WebCodeBundle;
  stdin: string;
  createdAt: number;
  updatedAt: number;
}

export interface RunHistoryEntry {
  id: string;
  language: LanguageId;
  code: string;
  webCode?: WebCodeBundle;
  stdin: string;
  status: ExecutionStatus;
  runTimeMs: number;
  compileTimeMs: number | null;
  exitCode: number | null;
  stdoutPreview: string;
  timestamp: number;
}

export interface ConsoleLogMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  args: string[];
  timestamp: number;
}
