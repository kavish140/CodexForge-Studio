import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sanitizeCompilerFlags } from '../languages.js';
import type { RunRequest, RunResponse } from '../types.js';
import { registerActiveRun, unregisterActiveRun } from './activeRuns.js';
import { parseDiagnostics } from './diagnostics.js';

const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB cap per stream

interface ExecOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  truncated: boolean;
  durationMs: number;
  spawnError?: string;
}

function killProcessTree(child: ChildProcess): void {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child.kill('SIGKILL');
    }
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // Ignore already exited processes
    }
  }
}

async function runProcess(
  command: string,
  args: string[],
  options: {
    cwd: string;
    stdin?: string;
    timeoutMs: number;
    env?: NodeJS.ProcessEnv;
    runId: string;
  },
): Promise<ExecOutput> {
  const startTime = performance.now();

  return new Promise((resolve) => {
    let stdoutChunks: Buffer[] = [];
    let stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let truncated = false;
    let timedOut = false;
    let cancelled = false;
    let settled = false;

    let child: ChildProcess;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      resolve({
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        cancelled: false,
        truncated: false,
        durationMs: Math.round(performance.now() - startTime),
        spawnError: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    const finish = (exitCode: number | null, spawnError?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unregisterActiveRun(options.runId);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        exitCode,
        timedOut,
        cancelled,
        truncated,
        durationMs: Math.round(performance.now() - startTime),
        spawnError,
      });
    };

    registerActiveRun(options.runId, {
      cancel: () => {
        cancelled = true;
        killProcessTree(child);
      },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, options.timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBytes >= MAX_OUTPUT_BYTES) {
        truncated = true;
        return;
      }
      const remaining = MAX_OUTPUT_BYTES - stdoutBytes;
      const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
      if (chunk.length > remaining) truncated = true;
      stdoutChunks.push(slice);
      stdoutBytes += slice.length;
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrBytes >= MAX_OUTPUT_BYTES) {
        truncated = true;
        return;
      }
      const remaining = MAX_OUTPUT_BYTES - stderrBytes;
      const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
      if (chunk.length > remaining) truncated = true;
      stderrChunks.push(slice);
      stderrBytes += slice.length;
    });

    child.on('error', (err) => {
      finish(null, err.message);
    });

    child.on('close', (code) => {
      finish(code);
    });

    if (child.stdin) {
      child.stdin.on('error', () => {
        // Ignore EPIPE if process exits before reading stdin
      });
      if (options.stdin && options.stdin.length > 0) {
        child.stdin.write(options.stdin);
      }
      child.stdin.end();
    }
  });
}

async function cleanupDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 120 });
  } catch {
    // Best-effort cleanup
  }
}

export async function executeLocal(
  req: RunRequest,
  runtimeVersion?: string | null,
): Promise<RunResponse> {
  const timeoutMs = Math.min(Math.max(req.timeoutMs ?? 10000, 1000), 30000);
  const safeId = req.runId.replace(/[^a-zA-Z0-9_-]/g, '') || String(Date.now());
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `codexforge-${safeId}-`));

  try {
    const { language, code, stdin = '' } = req;

    if (language === 'c' || language === 'cpp') {
      const isCpp = language === 'cpp';
      const sourceFile = isCpp ? 'main.cpp' : 'main.c';
      const exeFile = process.platform === 'win32' ? 'main.exe' : './main';
      const compiler = isCpp ? 'g++' : 'gcc';
      const sourcePath = path.join(workDir, sourceFile);
      const exePath = path.join(workDir, exeFile);

      await fs.writeFile(sourcePath, code, 'utf8');

      const sanitizedFlags = sanitizeCompilerFlags(language, req.flags);
      const defaultStd = isCpp ? '-std=c++20' : '-std=c17';
      const hasStd = sanitizedFlags.some((f) => f.startsWith('-std='));
      const compileArgs = [
        ...(hasStd ? [] : [defaultStd]),
        '-fdiagnostics-color=always',
        ...sanitizedFlags,
        sourceFile,
        '-o',
        exeFile,
      ];

      const compileRes = await runProcess(compiler, compileArgs, {
        cwd: workDir,
        timeoutMs: Math.max(timeoutMs, 20000),
        runId: req.runId,
      });

      if (compileRes.spawnError) {
        return {
          runId: req.runId,
          status: 'error',
          engine: 'local',
          stdout: '',
          stderr: `Failed to start ${compiler}: ${compileRes.spawnError}`,
          compilerOutput: '',
          exitCode: null,
          compileTimeMs: compileRes.durationMs,
          runTimeMs: 0,
          diagnostics: [],
          runtimeVersion: runtimeVersion ?? undefined,
        };
      }

      if (compileRes.cancelled) {
        return {
          runId: req.runId,
          status: 'cancelled',
          engine: 'local',
          stdout: compileRes.stdout,
          stderr: compileRes.stderr || 'Compilation cancelled by user.',
          compilerOutput: compileRes.stderr,
          exitCode: compileRes.exitCode,
          compileTimeMs: compileRes.durationMs,
          runTimeMs: 0,
          diagnostics: [],
          runtimeVersion: runtimeVersion ?? undefined,
        };
      }

      const compileDiagnostics = parseDiagnostics(language, compileRes.stderr);

      if (compileRes.timedOut) {
        return {
          runId: req.runId,
          status: 'timeout',
          engine: 'local',
          stdout: '',
          stderr: `Compilation timed out after ${timeoutMs}ms.\n${compileRes.stderr}`,
          compilerOutput: compileRes.stderr,
          exitCode: null,
          compileTimeMs: compileRes.durationMs,
          runTimeMs: 0,
          diagnostics: compileDiagnostics,
          runtimeVersion: runtimeVersion ?? undefined,
        };
      }

      if (compileRes.exitCode !== 0) {
        return {
          runId: req.runId,
          status: 'compile_error',
          engine: 'local',
          stdout: compileRes.stdout,
          stderr: compileRes.stderr,
          compilerOutput: compileRes.stderr,
          exitCode: compileRes.exitCode,
          compileTimeMs: compileRes.durationMs,
          runTimeMs: 0,
          diagnostics: compileDiagnostics,
          runtimeVersion: runtimeVersion ?? undefined,
        };
      }

      const runRes = await runProcess(exePath, [], {
        cwd: workDir,
        stdin,
        timeoutMs,
        runId: req.runId,
      });

      const status = runRes.cancelled
        ? 'cancelled'
        : runRes.timedOut
          ? 'timeout'
          : runRes.exitCode === 0
            ? 'success'
            : 'runtime_error';

      return {
        runId: req.runId,
        status,
        engine: 'local',
        stdout: runRes.stdout,
        stderr: runRes.timedOut
          ? `${runRes.stderr ? runRes.stderr + '\n' : ''}Execution timed out after ${timeoutMs}ms.`
          : runRes.cancelled
            ? `${runRes.stderr ? runRes.stderr + '\n' : ''}Execution cancelled by user.`
            : runRes.stderr,
        compilerOutput: compileRes.stderr,
        exitCode: runRes.exitCode,
        compileTimeMs: compileRes.durationMs,
        runTimeMs: runRes.durationMs,
        diagnostics: compileDiagnostics,
        runtimeVersion: runtimeVersion ?? undefined,
        truncated: runRes.truncated,
      };
    }

    if (language === 'python') {
      const sourcePath = path.join(workDir, 'main.py');
      await fs.writeFile(sourcePath, code, 'utf8');

      const runRes = await runProcess('python', ['-u', 'main.py'], {
        cwd: workDir,
        stdin,
        timeoutMs,
        env: { PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        runId: req.runId,
      });

      if (runRes.spawnError) {
        return {
          runId: req.runId,
          status: 'error',
          engine: 'local',
          stdout: '',
          stderr: `Failed to start python: ${runRes.spawnError}`,
          compilerOutput: '',
          exitCode: null,
          compileTimeMs: null,
          runTimeMs: runRes.durationMs,
          diagnostics: [],
          runtimeVersion: runtimeVersion ?? undefined,
        };
      }

      const status = runRes.cancelled
        ? 'cancelled'
        : runRes.timedOut
          ? 'timeout'
          : runRes.exitCode === 0
            ? 'success'
            : 'runtime_error';

      return {
        runId: req.runId,
        status,
        engine: 'local',
        stdout: runRes.stdout,
        stderr: runRes.timedOut
          ? `${runRes.stderr ? runRes.stderr + '\n' : ''}Execution timed out after ${timeoutMs}ms.`
          : runRes.cancelled
            ? `${runRes.stderr ? runRes.stderr + '\n' : ''}Execution cancelled by user.`
            : runRes.stderr,
        compilerOutput: '',
        exitCode: runRes.exitCode,
        compileTimeMs: null,
        runTimeMs: runRes.durationMs,
        diagnostics: parseDiagnostics('python', runRes.stderr),
        runtimeVersion: runtimeVersion ?? undefined,
        truncated: runRes.truncated,
      };
    }

    if (language === 'javascript' || language === 'typescript') {
      const filename = language === 'typescript' ? 'main.ts' : 'main.js';
      const sourcePath = path.join(workDir, filename);
      await fs.writeFile(sourcePath, code, 'utf8');

      const runRes = await runProcess('node', [filename], {
        cwd: workDir,
        stdin,
        timeoutMs,
        env: { FORCE_COLOR: '1' },
        runId: req.runId,
      });

      if (runRes.spawnError) {
        return {
          runId: req.runId,
          status: 'error',
          engine: 'local',
          stdout: '',
          stderr: `Failed to start node: ${runRes.spawnError}`,
          compilerOutput: '',
          exitCode: null,
          compileTimeMs: null,
          runTimeMs: runRes.durationMs,
          diagnostics: [],
          runtimeVersion: runtimeVersion ?? undefined,
        };
      }

      const status = runRes.cancelled
        ? 'cancelled'
        : runRes.timedOut
          ? 'timeout'
          : runRes.exitCode === 0
            ? 'success'
            : 'runtime_error';

      return {
        runId: req.runId,
        status,
        engine: 'local',
        stdout: runRes.stdout,
        stderr: runRes.timedOut
          ? `${runRes.stderr ? runRes.stderr + '\n' : ''}Execution timed out after ${timeoutMs}ms.`
          : runRes.cancelled
            ? `${runRes.stderr ? runRes.stderr + '\n' : ''}Execution cancelled by user.`
            : runRes.stderr,
        compilerOutput: '',
        exitCode: runRes.exitCode,
        compileTimeMs: null,
        runTimeMs: runRes.durationMs,
        diagnostics: parseDiagnostics(language, runRes.stderr),
        runtimeVersion: runtimeVersion ?? undefined,
        truncated: runRes.truncated,
      };
    }

    return {
      runId: req.runId,
      status: 'error',
      engine: 'local',
      stdout: '',
      stderr: `Unsupported local language: ${language}`,
      compilerOutput: '',
      exitCode: null,
      compileTimeMs: null,
      runTimeMs: 0,
      diagnostics: [],
    };
  } finally {
    await cleanupDir(workDir);
  }
}
