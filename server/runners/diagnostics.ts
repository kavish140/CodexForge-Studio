import type { Diagnostic, DiagnosticSeverity } from '../types.js';

function normalizeSeverity(raw: string): DiagnosticSeverity {
  const lower = raw.toLowerCase();
  if (lower.includes('warn')) return 'warning';
  if (lower.includes('note') || lower.includes('info') || lower.includes('help')) return 'info';
  return 'error';
}

// Strip ANSI CSI escape sequences (including GCC's \x1b[K erase-line codes) before parsing
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

export function parseDiagnostics(language: string, rawText: string): Diagnostic[] {
  const text = stripAnsi(rawText);
  if (!text.trim()) return [];

  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();

  const pushUnique = (d: Diagnostic) => {
    if (!Number.isFinite(d.line) || d.line < 1) return;
    const col = Number.isFinite(d.column) && d.column >= 1 ? d.column : 1;
    const key = `${d.line}:${col}:${d.severity}:${d.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    diagnostics.push({ ...d, column: col });
  };

  const lines = text.split(/\r?\n/);

  if (language === 'c' || language === 'cpp') {
    // e.g. main.cpp:12:5: error: expected ';' before '}' token
    const gccRegex = /main\.(?:c|cpp):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.+)$/i;
    for (const line of lines) {
      const m = line.match(gccRegex);
      if (m) {
        pushUnique({
          line: Number(m[1]),
          column: m[2] ? Number(m[2]) : 1,
          severity: normalizeSeverity(m[3]),
          message: m[4].trim(),
          source: language === 'c' ? 'gcc' : 'g++',
        });
      }
    }
    return diagnostics;
  }

  if (language === 'rust') {
    // Rust format:
    // error[E0308]: mismatched types
    //  --> prog.rs:12:5
    let pendingMessage = '';
    let pendingSeverity: DiagnosticSeverity = 'error';
    for (const line of lines) {
      const headerMatch = line.match(/^(error(?:\[[^\]]+\])?|warning(?:\[[^\]]+\])?|note|help):\s*(.+)$/i);
      if (headerMatch) {
        pendingSeverity = normalizeSeverity(headerMatch[1]);
        pendingMessage = headerMatch[2].trim();
        continue;
      }
      const locMatch = line.match(/-->\s*[^:\s]+:(\d+):(\d+)/);
      if (locMatch) {
        pushUnique({
          line: Number(locMatch[1]),
          column: Number(locMatch[2]),
          severity: pendingSeverity,
          message: pendingMessage || 'Compiler diagnostic',
          source: 'rustc',
        });
        pendingMessage = '';
      }
    }
    return diagnostics;
  }

  if (language === 'go') {
    // ./prog.go:12:5: undefined: foo
    const goRegex = /(?:\.\/)?(?:prog|main)\.go:(\d+):(?:(\d+):)?\s*(.+)$/;
    for (const line of lines) {
      const m = line.match(goRegex);
      if (m) {
        pushUnique({
          line: Number(m[1]),
          column: m[2] ? Number(m[2]) : 1,
          severity: 'error',
          message: m[3].trim(),
          source: 'go',
        });
      }
    }
    return diagnostics;
  }

  if (language === 'java') {
    // prog.java:12: error: ';' expected
    const javaRegex = /(?:prog|Main)\.java:(\d+):\s*(error|warning|note):\s*(.+)$/i;
    for (const line of lines) {
      const m = line.match(javaRegex);
      if (m) {
        pushUnique({
          line: Number(m[1]),
          column: 1,
          severity: normalizeSeverity(m[2]),
          message: m[3].trim(),
          source: 'javac',
        });
      }
    }
    return diagnostics;
  }

  if (language === 'csharp') {
    // prog.cs(12,5): error CS1002: ; expected
    const csRegex = /prog\.cs\((\d+),(\d+)\):\s*(error|warning)\s+([A-Z0-9]+):\s*(.+)$/i;
    for (const line of lines) {
      const m = line.match(csRegex);
      if (m) {
        pushUnique({
          line: Number(m[1]),
          column: Number(m[2]),
          severity: normalizeSeverity(m[3]),
          message: `${m[4]}: ${m[5].trim()}`,
          source: 'dotnet',
        });
      }
    }
    return diagnostics;
  }

  if (language === 'python') {
    // File ".../main.py", line 12
    const pyFileRegex = /File\s+"[^"]*main\.py",\s*line\s+(\d+)/i;
    const matchedLines: number[] = [];
    for (const line of lines) {
      const m = line.match(pyFileRegex);
      if (m) matchedLines.push(Number(m[1]));
    }
    if (matchedLines.length > 0) {
      const lastNonEmpty = [...lines].reverse().find((l) => l.trim().length > 0) || 'Python error';
      // Prefer the deepest user-code line in main.py
      const lineNum = matchedLines[matchedLines.length - 1];
      pushUnique({
        line: lineNum,
        column: 1,
        severity: 'error',
        message: lastNonEmpty.trim(),
        source: 'python',
      });
    }
    return diagnostics;
  }

  if (language === 'javascript' || language === 'typescript') {
    // Look for main.js:12 or main.ts:12:5 and error description
    const nodeLocRegex = /(?:main\.(?:js|ts)):(\d+)(?::(\d+))?/;
    const errorMsgLine = lines.find((l) =>
      /^(SyntaxError|TypeError|ReferenceError|RangeError|Error|ERR_[A-Z_]+):/.test(l.trim()),
    );
    for (const line of lines) {
      const m = line.match(nodeLocRegex);
      if (m) {
        pushUnique({
          line: Number(m[1]),
          column: m[2] ? Number(m[2]) : 1,
          severity: 'error',
          message: errorMsgLine?.trim() || 'Runtime / syntax error',
          source: 'node',
        });
        break;
      }
    }
    return diagnostics;
  }

  if (language === 'ruby') {
    const rbRegex = /prog\.rb:(\d+):\s*(.+)$/;
    for (const line of lines) {
      const m = line.match(rbRegex);
      if (m) {
        pushUnique({
          line: Number(m[1]),
          column: 1,
          severity: 'error',
          message: m[2].trim(),
          source: 'ruby',
        });
      }
    }
    return diagnostics;
  }

  if (language === 'php') {
    const phpRegex = /(?:Fatal error|Parse error|Warning|Notice):\s*(.+?)\s+in\s+\S+\s+on\s+line\s+(\d+)/i;
    for (const line of lines) {
      const m = line.match(phpRegex);
      if (m) {
        pushUnique({
          line: Number(m[2]),
          column: 1,
          severity: normalizeSeverity(line),
          message: m[1].trim(),
          source: 'php',
        });
      }
    }
    return diagnostics;
  }

  if (language === 'bash') {
    const bashRegex = /line\s+(\d+):\s*(.+)$/i;
    for (const line of lines) {
      const m = line.match(bashRegex);
      if (m) {
        pushUnique({
          line: Number(m[1]),
          column: 1,
          severity: 'error',
          message: m[2].trim(),
          source: 'bash',
        });
      }
    }
    return diagnostics;
  }

  return diagnostics;
}
