export type LanguageEngine = 'local' | 'browser' | 'cloud';

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

export interface RunRequest {
  runId: string;
  language: string;
  code: string;
  stdin?: string;
  flags?: string[];
  timeoutMs?: number;
  remoteApiUrl?: string;
}

export type ExecutionStatus =
  | 'success'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'cancelled'
  | 'error';

export interface RunResponse {
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
}

export interface RuntimeCapability {
  id: string;
  available: boolean;
  version: string | null;
  engine: LanguageEngine;
}
