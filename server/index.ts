import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
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
