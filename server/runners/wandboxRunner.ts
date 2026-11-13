import { CLOUD_COMPILERS, type CloudLanguageConfig } from '../languages.js';
import type { RunRequest, RunResponse } from '../types.js';
import { registerActiveRun, unregisterActiveRun } from './activeRuns.js';
import { parseDiagnostics } from './diagnostics.js';

interface WandboxResponse {
  status?: string;
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  compiler_message?: string;
  program_output?: string;
  program_error?: string;
  program_message?: string;
}

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  exit_code?: number | null;
  time?: string | null;
  status?: { id: number; description: string };
}

const DEFAULT_WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const DEFAULT_JUDGE0_URL = 'https://ce.judge0.com/submissions/?base64_encoded=false&wait=true';

/**
 * Preprocess source code for classic/educational languages to improve compatibility with modern cloud backends.
 * For Turbo C++, shims <iostream.h>, <conio.h>, and void main() so typical school lab code compiles cleanly.
 */
function preprocessCodeForCloud(language: string, code: string): string {
  if (language === 'turbo-cpp') {
    let processed = code;
    const hasConio = /#include\s*<conio\.h>/i.test(processed);
    const hasIostreamH = /#include\s*<iostream\.h>/i.test(processed);

    let shim = '';
    if (hasConio) {
      processed = processed.replace(/#include\s*<conio\.h>/gi, '/* [Turbo C++ compat shim: conio.h] */');
      shim += `
#include <cstdio>
#include <cstdlib>
inline void clrscr() { /* simulated clrscr */ }
inline int getch() { return 0; }
inline int getche() { return 0; }
inline int kbhit() { return 0; }
`;
    }
    if (hasIostreamH) {
      processed = processed.replace(/#include\s*<iostream\.h>/gi, '#include <iostream>\nusing namespace std;');
    }
    processed = processed.replace(/\bvoid\s+main\s*\(\s*(void)?\s*\)/g, 'int main()');
    return shim ? shim + '\n' + processed : processed;
  }
  return code;
}

async function callWandbox(
  endpoint: string,
  cfg: CloudLanguageConfig,
  req: RunRequest,
  signal: AbortSignal,
): Promise<RunResponse> {
  const codeToCompile = preprocessCodeForCloud(req.language, req.code);
  const start = performance.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: cfg.compiler,
      code: codeToCompile,
      stdin: req.stdin ?? '',
    }),
    signal,
  });

  const elapsed = Math.round(performance.now() - start);
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as WandboxResponse;
  const compilerError = data.compiler_error || '';
  const compilerOut = data.compiler_message || data.compiler_output || compilerError;
  const stdout = data.program_output || '';
  const programStderr = data.program_error || '';
  const exitCode = data.status !== undefined && data.status !== '' ? Number(data.status) : null;

  const hasCompileFailure =
    Boolean(compilerError.trim()) && !stdout && !programStderr && exitCode !== 0;

  const status = hasCompileFailure
    ? 'compile_error'
    : exitCode === 0
      ? 'success'
      : 'runtime_error';

  const combinedDiagnosticSource = [compilerOut, programStderr].filter(Boolean).join('\n');
  return {
    runId: req.runId,
    status,
    engine: 'cloud',
    stdout,
    stderr: hasCompileFailure ? compilerError : programStderr,
    compilerOutput: compilerOut,
    exitCode: Number.isFinite(exitCode) ? exitCode : null,
    compileTimeMs: null,
    runTimeMs: elapsed,
    diagnostics: parseDiagnostics(req.language, combinedDiagnosticSource),
    runtimeVersion: cfg.displayVersion,
  };
}

async function callJudge0(
  endpoint: string,
  cfg: CloudLanguageConfig,
  req: RunRequest,
  signal: AbortSignal,
): Promise<RunResponse> {
  const codeToCompile = preprocessCodeForCloud(req.language, req.code);
  const start = performance.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language_id: cfg.judge0Id,
      source_code: codeToCompile,
      stdin: req.stdin ?? '',
    }),
    signal,
  });

  const elapsed = Math.round(performance.now() - start);
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Judge0 HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as Judge0Response;
  const statusId = data.status?.id ?? 0;
  const compileOutput = data.compile_output ?? '';
  const stderr = data.stderr ?? data.message ?? '';
  const stdout = data.stdout ?? '';

  // Judge0 status IDs: 3 = Accepted, 5 = Time Limit Exceeded, 6 = Compilation Error
  const status =
    statusId === 3
      ? 'success'
      : statusId === 6
        ? 'compile_error'
        : statusId === 5
          ? 'timeout'
          : 'runtime_error';

  const combinedDiagnosticSource = [compileOutput, stderr].filter(Boolean).join('\n');
  return {
    runId: req.runId,
    status,
    engine: 'cloud',
    stdout,
    stderr: status === 'compile_error' ? compileOutput : stderr || compileOutput,
    compilerOutput: compileOutput,
    exitCode: status === 'success' ? 0 : (data.exit_code ?? 1),
    compileTimeMs: null,
    runTimeMs: elapsed,
    diagnostics: parseDiagnostics(req.language, combinedDiagnosticSource),
    runtimeVersion: cfg.displayVersion,
  };
}

export async function executeCloud(req: RunRequest): Promise<RunResponse> {
  const cfg = CLOUD_COMPILERS[req.language];
  if (!cfg) {
    return {
      runId: req.runId,
      status: 'error',
      engine: 'cloud',
      stdout: '',
      stderr: `Unsupported cloud language: ${req.language}`,
      compilerOutput: '',
      exitCode: null,
      compileTimeMs: null,
      runTimeMs: 0,
      diagnostics: [],
    };
  }

  const customUrl = req.remoteApiUrl?.trim();
  const timeoutMs = Math.min(Math.max(req.timeoutMs ?? 28000, 28000), 45000);
  const controller = new AbortController();
  let cancelledByUser = false;
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  registerActiveRun(req.runId, {
    cancel: () => {
      cancelledByUser = true;
      controller.abort();
    },
  });

  const start = performance.now();

  try {
    if (customUrl) {
      if (customUrl.includes('judge0') || customUrl.includes('submissions')) {
        return await callJudge0(customUrl, cfg, req, controller.signal);
      }
      return await callWandbox(customUrl, cfg, req, controller.signal);
    }

    if (cfg.preferredProvider === 'judge0') {
      try {
        return await callJudge0(DEFAULT_JUDGE0_URL, cfg, req, controller.signal);
      } catch (err) {
        if (cancelledByUser || timedOut) throw err;
        return await callWandbox(DEFAULT_WANDBOX_URL, cfg, req, controller.signal);
      }
    }

    try {
      // Give primary Wandbox up to 9s, then seamlessly fall back to Judge0 CE if slow/unreachable
      const primaryController = new AbortController();
      const onParentAbort = () => primaryController.abort();
      controller.signal.addEventListener('abort', onParentAbort, { once: true });
      const primaryTimer = setTimeout(() => primaryController.abort(), 9000);
      try {
        return await callWandbox(DEFAULT_WANDBOX_URL, cfg, req, primaryController.signal);
      } finally {
        clearTimeout(primaryTimer);
        controller.signal.removeEventListener('abort', onParentAbort);
      }
    } catch (err) {
      if (cancelledByUser || timedOut) throw err;
      return await callJudge0(DEFAULT_JUDGE0_URL, cfg, req, controller.signal);
    }
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    if (cancelledByUser) {
      return {
        runId: req.runId,
        status: 'cancelled',
        engine: 'cloud',
        stdout: '',
        stderr: 'Cloud execution cancelled by user.',
        compilerOutput: '',
        exitCode: null,
        compileTimeMs: null,
        runTimeMs: elapsed,
        diagnostics: [],
        runtimeVersion: cfg.displayVersion,
      };
    }
    if (timedOut) {
      return {
        runId: req.runId,
        status: 'timeout',
        engine: 'cloud',
        stdout: '',
        stderr: `Cloud compiler request timed out after ${timeoutMs}ms.`,
        compilerOutput: '',
        exitCode: null,
        compileTimeMs: null,
        runTimeMs: elapsed,
        diagnostics: [],
        runtimeVersion: cfg.displayVersion,
      };
    }
    return {
      runId: req.runId,
      status: 'error',
      engine: 'cloud',
      stdout: '',
      stderr: `Cloud execution failed: ${err instanceof Error ? err.message : String(err)}`,
      compilerOutput: '',
      exitCode: null,
      compileTimeMs: null,
      runTimeMs: elapsed,
      diagnostics: [],
      runtimeVersion: cfg.displayVersion,
    };
  } finally {
    clearTimeout(timer);
    unregisterActiveRun(req.runId);
  }
}
