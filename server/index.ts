import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CLOUD_COMPILERS, detectRuntimeCapabilities } from './languages.js';
import { cancelActiveRun } from './runners/activeRuns.js';
import { executeLocal } from './runners/localRunner.js';
import { executeCloud } from './runners/wandboxRunner.js';
import type { RunRequest } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const workspaceRoot = path.join(os.tmpdir(), 'codexforge-workspaces');
const workspaceCwds = new Map<string, string>();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const LOCAL_LANGUAGES = new Set(['c', 'cpp', 'python', 'javascript', 'typescript']);

app.get('/api/health', async (_req, res) => {
  const capabilities = await detectRuntimeCapabilities();
  res.json({ ok: true, capabilities });
});

app.get('/api/languages', async (req, res) => {
  const refresh = req.query.refresh === '1';
  const capabilities = await detectRuntimeCapabilities(refresh);
  res.json({ capabilities });
});

function workspaceDir(workspaceId: string): string {
  const safeId = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!safeId) throw new Error('Invalid workspace id');
  return path.join(workspaceRoot, safeId);
}

app.post('/api/workspaces/:workspaceId/files', async (req, res) => {
  const body = req.body as { files?: Array<{ path: string; content: string }> };
  if (!Array.isArray(body.files)) {
    res.status(400).json({ error: 'files must be an array.' });
    return;
  }

  try {
    const dir = workspaceDir(req.params.workspaceId);
    await fs.promises.mkdir(dir, { recursive: true });
    for (const file of body.files) {
      if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') continue;
      const relative = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!relative || relative.split('/').includes('..') || relative.includes('\0')) continue;
      const target = path.resolve(dir, relative);
      if (target !== dir && !target.startsWith(`${dir}${path.sep}`)) continue;
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.writeFile(target, file.content, 'utf8');
    }
    if (!workspaceCwds.has(req.params.workspaceId)) {
      workspaceCwds.set(req.params.workspaceId, dir);
    }
    res.json({ ok: true, cwd: dir });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to sync workspace.' });
  }
});

app.post('/api/workspaces/:workspaceId/terminal', async (req, res) => {
  const body = req.body as { command?: string; timeoutMs?: number };
  const command = typeof body.command === 'string' ? body.command.trim() : '';
  if (!command) {
    res.status(400).json({ error: 'Terminal command is required.' });
    return;
  }

  try {
    const dir = workspaceDir(req.params.workspaceId);
    await fs.promises.mkdir(dir, { recursive: true });
    let cwd = workspaceCwds.get(req.params.workspaceId) ?? dir;
    if (cwd !== dir && !cwd.startsWith(`${dir}${path.sep}`)) cwd = dir;

    const cdMatch = command.match(/^cd(?:\s+(.+))?$/i);
    if (cdMatch) {
      const rawTarget = (cdMatch[1] ?? (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME) ?? '').replace(/^(['"])(.*)\1$/, '$2');
      const target = path.isAbsolute(rawTarget) ? path.resolve(rawTarget) : path.resolve(cwd, rawTarget);
      if (target !== dir && !target.startsWith(`${dir}${path.sep}`)) {
        res.status(403).json({ error: 'Terminal access is restricted to this workspace.' });
        return;
      }
      try {
        const stat = await fs.promises.stat(target);
        if (!stat.isDirectory()) throw new Error();
        cwd = target;
        workspaceCwds.set(req.params.workspaceId, cwd);
        res.json({ stdout: '', stderr: '', cwd: path.relative(dir, cwd) || '.', exitCode: 0 });
      } catch {
        res.status(400).json({ error: `Directory not found: ${rawTarget}` });
      }
      return;
    }

    const timeoutMs = Math.min(Math.max(typeof body.timeoutMs === 'number' ? body.timeoutMs : 10000, 1000), 30000);
    const child = process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', command], {
          cwd,
          windowsHide: true,
          env: { ...process.env, FORCE_COLOR: '1' },
        })
      : spawn('/bin/sh', ['-lc', command], {
          cwd,
          env: { ...process.env, FORCE_COLOR: '1' },
        });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      } else {
        child.kill('SIGKILL');
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (timedOut) stderr = `${stderr}${stderr ? '\n' : ''}Command timed out after ${timeoutMs}ms.`;
      res.json({ stdout, stderr, cwd: path.relative(dir, cwd) || '.', exitCode: exitCode ?? null });
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to execute terminal command.' });
  }
});

app.post('/api/run', async (req, res) => {
  const body = req.body as Partial<RunRequest>;
  if (!body || typeof body.language !== 'string' || typeof body.code !== 'string') {
    res.status(400).json({ error: 'Invalid request body: language and code are required.' });
    return;
  }

  const runReq: RunRequest = {
    runId: typeof body.runId === 'string' && body.runId.trim() ? body.runId : `run-${Date.now()}`,
    language: body.language,
    code: body.code,
    stdin: typeof body.stdin === 'string' ? body.stdin : '',
    flags: Array.isArray(body.flags) ? body.flags : [],
    timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : 10000,
    remoteApiUrl: typeof body.remoteApiUrl === 'string' ? body.remoteApiUrl : undefined,
    entryFile: typeof body.entryFile === 'string' ? body.entryFile : undefined,
    files: Array.isArray(body.files)
      ? body.files
          .filter((file) => file && typeof file.path === 'string' && typeof file.content === 'string')
      : undefined,
  };

  const capabilities = await detectRuntimeCapabilities();
  const cap = capabilities.find((c) => c.id === runReq.language);

  if (LOCAL_LANGUAGES.has(runReq.language)) {
    if (cap && !cap.available) {
      res.status(400).json({
        runId: runReq.runId,
        status: 'error',
        engine: 'local',
        stdout: '',
        stderr: `Local runtime for "${runReq.language}" was not detected on this server.`,
        compilerOutput: '',
        exitCode: null,
        compileTimeMs: null,
        runTimeMs: 0,
        diagnostics: [],
      });
      return;
    }
    const result = await executeLocal(runReq, cap?.version);
    res.json(result);
    return;
  }

  if (runReq.language in CLOUD_COMPILERS) {
    const result = await executeCloud(runReq);
    res.json(result);
    return;
  }

  res.status(400).json({
    runId: runReq.runId,
    status: 'error',
    engine: 'local',
    stdout: '',
    stderr: `Language "${runReq.language}" is handled client-side or is unsupported.`,
    compilerOutput: '',
    exitCode: null,
    compileTimeMs: null,
    runTimeMs: 0,
    diagnostics: [],
  });
});

app.post('/api/stop/:runId', (req, res) => {
  const stopped = cancelActiveRun(req.params.runId);
  res.json({ stopped });
});

// Serve built frontend in production
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[CodexForge API] Listening on http://localhost:${PORT}`);
  void detectRuntimeCapabilities().then((caps) => {
    const localSummary = caps
      .filter((c) => c.engine === 'local')
      .map((c) => `${c.id}:${c.available ? c.version : 'missing'}`)
      .join(', ');
    console.log(`[CodexForge API] Local runtimes -> ${localSummary}`);
  });
});
