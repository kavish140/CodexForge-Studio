import type { WebCodeBundle } from '../types/playground';

export interface SandboxConsolePayload {
  source: 'codexforge-sandbox';
  runId: string;
  level: 'log' | 'info' | 'warn' | 'error';
  args: string[];
  line?: number;
}

export function buildWebSandboxDoc(bundle: WebCodeBundle, runId: string): string {
  const safeJs = bundle.js.replace(/<\/script>/gi, '<\\/script>');
  const safeCss = bundle.css.replace(/<\/style>/gi, '<\\/style>');

  const bridgeScript = `
<script>
(function() {
  var RUN_ID = ${JSON.stringify(runId)};
  function formatArg(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return val;
    if (val instanceof Error) return val.stack || val.message || String(val);
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch (e) {
        return String(val);
      }
    }
    return String(val);
  }
  function post(level, args, line) {
    try {
      window.parent.postMessage({
        source: 'codexforge-sandbox',
        runId: RUN_ID,
        level: level,
        args: Array.prototype.map.call(args, formatArg),
        line: line
      }, '*');
    } catch (_) {}
  }
  ['log', 'info', 'warn', 'error'].forEach(function(level) {
    var orig = console[level];
    console[level] = function() {
      post(level, arguments);
      if (orig) orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function(event) {
    post('error', [event.message || 'Uncaught script error'], event.lineno || undefined);
  });
  window.addEventListener('unhandledrejection', function(event) {
    post('error', ['Unhandled Promise Rejection:', event.reason]);
  });
})();
</script>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${safeCss}</style>
${bridgeScript}
</head>
<body>
${bundle.html}
<script>
try {
${safeJs}
} catch (err) {
  console.error(err);
}
</script>
</body>
</html>`;
}
