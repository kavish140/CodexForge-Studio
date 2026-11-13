/**
 * autoDetect.ts
 * Analyzes code snippets and returns the most likely LanguageId using
 * weighted pattern scoring across syntax signatures.
 */

import type { LanguageId } from '../types/playground';

interface LangRule {
  id: LanguageId;
  patterns: Array<{ re: RegExp; weight: number }>;
  antiPatterns?: Array<{ re: RegExp; penalty: number }>;
}

const RULES: LangRule[] = [
  // ── Web / HTML ────────────────────────────────────────────────────────────
  {
    id: 'web',
    patterns: [
      { re: /^\s*<!doctype\s+html/i, weight: 100 },
      { re: /<html[\s>]/i, weight: 80 },
      { re: /<(head|body|div|span|p|h[1-6]|script|style|link)[^>]*>/i, weight: 20 },
      { re: /<!--[\s\S]*?-->/, weight: 10 },
    ],
  },

  // ── SQL ───────────────────────────────────────────────────────────────────
  {
    id: 'sql',
    patterns: [
      { re: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE)\b/i, weight: 50 },
      { re: /\bFROM\s+\w+/i, weight: 20 },
      { re: /\bWHERE\b/i, weight: 10 },
      { re: /\bJOIN\b/i, weight: 15 },
      { re: /\bGROUP\s+BY\b/i, weight: 15 },
      { re: /;/, weight: 5 },
    ],
  },

  // ── Turbo C++ (must come before generic C++) ──────────────────────────────
  {
    id: 'turbo-cpp',
    patterns: [
      { re: /#include\s*<(conio|dos|graphics|bios)\.h>/i, weight: 100 },
      { re: /\bgetch\(\)|clrscr\(\)|gotoxy\(\)|textcolor\(/i, weight: 80 },
      { re: /\bvoid\s+main\s*\(\s*(void)?\s*\)/i, weight: 60 },
      { re: /\bcout\s*<<.*?endl/i, weight: 10 },
    ],
  },

  // ── C++ ───────────────────────────────────────────────────────────────────
  {
    id: 'cpp',
    patterns: [
      { re: /#include\s*<(iostream|vector|string|algorithm|map|set|queue|stack|deque|memory|functional|numeric|cmath|cstdlib|cstring|climits|cassert|thread|mutex|chrono|filesystem|ranges|concepts|span|format)>/, weight: 40 },
      { re: /\bstd\s*::\s*(cout|cin|vector|string|endl|map|set|pair|make_pair|sort|find|begin|end|move|forward|unique_ptr|shared_ptr)/, weight: 35 },
      { re: /\btemplate\s*</, weight: 30 },
      { re: /\bclass\s+\w+\s*(:\s*(public|private|protected))?[^;]*\{/, weight: 20 },
      { re: /\b(namespace|using|auto|nullptr|constexpr|decltype|override|final|noexcept|static_assert)\b/, weight: 15 },
      { re: /\b(int|void|char|double|float|bool|long|short|unsigned)\s+main\s*\(/, weight: 15 },
    ],
    antiPatterns: [
      { re: /#include\s*<(conio|dos|graphics|bios)\.h>/i, penalty: 60 },
    ],
  },

  // ── C ─────────────────────────────────────────────────────────────────────
  {
    id: 'c',
    patterns: [
      { re: /#include\s*<(stdio|stdlib|string|math|time|ctype|errno|limits|stdint|stdbool|stdarg|assert|signal|setjmp|locale|wchar)\.h>/, weight: 40 },
      { re: /\bprintf\s*\(|scanf\s*\(|fprintf\s*\(|fgets\s*\(|malloc\s*\(|free\s*\(|calloc\s*\(|realloc\s*\(/, weight: 30 },
      { re: /\btypedef\s+struct\s*\{?/, weight: 20 },
      { re: /\bvoid\s*\*\s+\w+/, weight: 10 },
      { re: /int\s+main\s*\(\s*(void|int\s+argc)/, weight: 15 },
    ],
    antiPatterns: [
      { re: /std::/, penalty: 40 },
      { re: /\btemplate\s*</, penalty: 50 },
    ],
  },

  // ── Python ────────────────────────────────────────────────────────────────
  {
    id: 'python',
    patterns: [
      { re: /^\s*def\s+\w+\s*\([^)]*\)\s*(->\s*\w+)?\s*:/m, weight: 50 },
      { re: /^\s*class\s+\w+(\s*\(.*?\))?\s*:/m, weight: 40 },
      { re: /^\s*(import|from)\s+\w+/m, weight: 20 },
      { re: /\bprint\s*\(/, weight: 15 },
      { re: /\bif\s+__name__\s*==\s*['"]__main__['"]\s*:/m, weight: 50 },
      { re: /\b(elif|lambda|yield|self\.|@\w+)\b/, weight: 15 },
      { re: /#\s.*$/, weight: 5 },
      { re: /f['"].*\{.*?\}.*['"]/, weight: 20 },
    ],
  },

  // ── TypeScript ────────────────────────────────────────────────────────────
  {
    id: 'typescript',
    patterns: [
      { re: /:\s*(string|number|boolean|void|any|never|unknown|object|symbol)\b/, weight: 40 },
      { re: /\binterface\s+\w+/, weight: 50 },
      { re: /\btype\s+\w+\s*=/, weight: 40 },
      { re: /\benum\s+\w+/, weight: 35 },
      { re: /<\w+(\s*,\s*\w+)*>/, weight: 15 },
      { re: /as\s+(string|number|boolean|any|\w+)/, weight: 20 },
      { re: /readonly\s+\w+/, weight: 20 },
      { re: /import\s+.*\s+from\s+['"]/, weight: 15 },
    ],
  },

  // ── JavaScript ────────────────────────────────────────────────────────────
  {
    id: 'javascript',
    patterns: [
      { re: /\b(const|let|var)\s+\w+\s*=\s*(require\s*\(|async|function|\[|\{|'|"|`)/, weight: 25 },
      { re: /\b(async\s+function|async\s+\(|await\s+)/, weight: 20 },
      { re: /=>\s*\{|=>\s*\w/, weight: 15 },
      { re: /\bconsole\.(log|error|warn|info)\s*\(/, weight: 20 },
      { re: /require\s*\(['"]/, weight: 25 },
      { re: /module\.exports/, weight: 30 },
      { re: /\bPromise\s*\(|\.then\s*\(|\.catch\s*\(/, weight: 15 },
      { re: /\bdocument\.(getElementById|querySelector)/, weight: 20 },
    ],
    antiPatterns: [
      { re: /:\s*(string|number|boolean|void)\b/, penalty: 30 },
      { re: /\binterface\s+\w+/, penalty: 40 },
    ],
  },

  // ── Java ──────────────────────────────────────────────────────────────────
  {
    id: 'java',
    patterns: [
      { re: /\bpublic\s+class\s+\w+/, weight: 60 },
      { re: /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*\w+\s*\)/, weight: 80 },
      { re: /\bSystem\.(out|err)\.(println|print)\s*\(/, weight: 40 },
      { re: /import\s+java\./, weight: 40 },
      { re: /\b(extends|implements|@Override|@FunctionalInterface)\b/, weight: 20 },
    ],
  },

  // ── C# ────────────────────────────────────────────────────────────────────
  {
    id: 'csharp',
    patterns: [
      { re: /\busing\s+System/, weight: 50 },
      { re: /\bnamespace\s+\w+/, weight: 40 },
      { re: /\bConsole\.(WriteLine|Write|ReadLine)\s*\(/, weight: 40 },
      { re: /\bpublic\s+(static\s+)?(class|void|int|string|bool|double|async)/, weight: 25 },
      { re: /\b(var|string|int|bool)\s+\w+\s*=\s*new\s+/, weight: 20 },
    ],
  },

  // ── Rust ──────────────────────────────────────────────────────────────────
  {
    id: 'rust',
    patterns: [
      { re: /\bfn\s+main\s*\(\s*\)\s*\{/, weight: 60 },
      { re: /\bprintln!\s*\(/, weight: 40 },
      { re: /\blet\s+(mut\s+)?\w+\s*(:\s*\w+)?\s*=/, weight: 20 },
      { re: /\b(Vec|HashMap|Option|Result|Box|Rc|Arc|String|str)\s*(<|::)/, weight: 30 },
      { re: /\bimpl\s+\w+(\s+for\s+\w+)?/, weight: 30 },
      { re: /\b(pub|mod|use|trait|enum|struct|match|if\s+let|while\s+let)\b/, weight: 15 },
    ],
  },

  // ── Go ────────────────────────────────────────────────────────────────────
  {
    id: 'go',
    patterns: [
      { re: /^package\s+\w+/m, weight: 70 },
      { re: /\bfunc\s+\w+\s*\(/, weight: 40 },
      { re: /\bfmt\.(Print|Println|Printf|Sprintf)\s*\(/, weight: 40 },
      { re: /\bimport\s+\([\s\S]*?\)|\bimport\s+"[^"]+"/m, weight: 20 },
      { re: /\b(goroutine|channel|chan|go\s+func|sync\.|make\s*\()/, weight: 20 },
      { re: /:=\s*/, weight: 20 },
    ],
  },

  // ── Ruby ──────────────────────────────────────────────────────────────────
  {
    id: 'ruby',
    patterns: [
      { re: /\bputs\s+["'\w]|puts\s+\(/, weight: 30 },
      { re: /\bdo\s*\|.*?\|/, weight: 30 },
      { re: /\bend\s*$/m, weight: 10 },
      { re: /\battr_(accessor|reader|writer)\s*:/, weight: 40 },
      { re: /\bdef\s+\w+(\s*\(.*?\))?\s*$/m, weight: 20 },
      { re: /\%w\[/, weight: 25 },
    ],
  },

  // ── PHP ───────────────────────────────────────────────────────────────────
  {
    id: 'php',
    patterns: [
      { re: /<\?php/i, weight: 100 },
      { re: /\$\w+\s*=/, weight: 30 },
      { re: /\becho\s+(["']|\$|\w)/, weight: 30 },
      { re: /\b(function|class|interface|trait)\s+\w+/i, weight: 15 },
      { re: /\barray\s*\(|=>\s*/, weight: 20 },
    ],
  },

  // ── Bash ──────────────────────────────────────────────────────────────────
  {
    id: 'bash',
    patterns: [
      { re: /^#!\s*\/bin\/(bash|sh)|^#!\s*\/usr\/bin\/env\s+(bash|sh)/m, weight: 100 },
      { re: /\becho\s+"/, weight: 20 },
      { re: /\bgrep\s+|awk\s+|sed\s+|cut\s+|tr\s+/, weight: 20 },
      { re: /\$\{?\w+\}?/, weight: 10 },
      { re: /\[\[\s+.*\s+\]\]/, weight: 25 },
      { re: /\bfor\s+\w+\s+in\s+/, weight: 20 },
    ],
    antiPatterns: [
      { re: /<\?php/i, penalty: 50 },
    ],
  },

  // ── Haskell ───────────────────────────────────────────────────────────────
  {
    id: 'haskell',
    patterns: [
      { re: /^module\s+\w+/m, weight: 60 },
      { re: /\bmain\s*::\s*IO\s*\(\)/m, weight: 70 },
      { re: /\bputStrLn\s*\(|print\s+\w+/, weight: 30 },
      { re: /\b(where|let\s+\w+\s+=|data\s+\w+|type\s+\w+|newtype\s+)\b/, weight: 25 },
      { re: /::\s*\w+(\s+->\s*\w+)+/, weight: 30 },
      { re: /\|.*->/, weight: 15 },
    ],
  },

  // ── Lua ───────────────────────────────────────────────────────────────────
  {
    id: 'lua',
    patterns: [
      { re: /\bprint\s*\(/, weight: 15 },
      { re: /\blocal\s+\w+\s*=/, weight: 30 },
      { re: /\bfunction\s+\w+\s*\(/, weight: 25 },
      { re: /\bthen\b|\belseif\b|\bend\b/, weight: 20 },
      { re: /--\s*/, weight: 10 },
      { re: /\brepeat\s+.*\s+until\b/s, weight: 30 },
    ],
  },

  // ── R ─────────────────────────────────────────────────────────────────────
  {
    id: 'r',
    patterns: [
      { re: /<-\s*/, weight: 50 },
      { re: /\bcat\s*\(|print\s*\(|sprintf\s*\(/, weight: 15 },
      { re: /\bc\s*\(.*?,.*?\)/, weight: 20 },
      { re: /\bggplot\s*\(|dplyr::|tidyr::/, weight: 50 },
      { re: /\bfunction\s*\(/, weight: 15 },
      { re: /\blibrary\s*\(/, weight: 30 },
    ],
  },

  // ── Kotlin ────────────────────────────────────────────────────────────────
  {
    id: 'kotlin',
    patterns: [
      { re: /\bfun\s+main\s*\(/, weight: 70 },
      { re: /\bprintln\s*\(/, weight: 30 },
      { re: /\bval\s+\w+\s*[:=]|var\s+\w+\s*[:=]/, weight: 25 },
      { re: /\bdata\s+class\s+\w+/, weight: 50 },
      { re: /\bwhen\s*\(/, weight: 30 },
      { re: /\blistOf\s*\(|mapOf\s*\(|setOf\s*\(/, weight: 30 },
    ],
  },

  // ── Scala ────────────────────────────────────────────────────────────────
  {
    id: 'scala',
    patterns: [
      { re: /\bobject\s+\w+\s*(extends\s+App)?/, weight: 50 },
      { re: /\bprintln\s*\(/, weight: 15 },
      { re: /\bdef\s+\w+\s*\(/, weight: 20 },
      { re: /\bcase\s+class\s+\w+/, weight: 50 },
      { re: /\bval\s+\w+\s*[:=]/, weight: 20 },
      { re: /\bList\s*\(|Vector\s*\(|Map\s*\(/, weight: 20 },
    ],
  },

  // ── Swift ────────────────────────────────────────────────────────────────
  {
    id: 'swift',
    patterns: [
      { re: /\bprint\s*\(/, weight: 10 },
      { re: /\bvar\s+\w+\s*:\s*\w+|let\s+\w+\s*:\s*\w+/, weight: 25 },
      { re: /\bfunc\s+\w+\s*\(/, weight: 20 },
      { re: /\bguard\s+.*\s+else\s*\{/s, weight: 40 },
      { re: /\bimport\s+Foundation|\bimport\s+UIKit|\bimport\s+SwiftUI/, weight: 50 },
      { re: /\boptional\s+|\?\.|if\s+let\s+\w+\s*=/, weight: 20 },
    ],
  },

  // ── Dart ─────────────────────────────────────────────────────────────────
  {
    id: 'dart',
    patterns: [
      { re: /\bvoid\s+main\s*\(\s*\)\s*\{/, weight: 50 },
      { re: /\bprint\s*\(/, weight: 15 },
      { re: /\bfinal\s+\w+\s*=|var\s+\w+\s*=/, weight: 15 },
      { re: /\bList<|Map<|Set</, weight: 30 },
      { re: /\basync\s*\{|\bawait\s+/, weight: 15 },
      { re: /\bdart:\w+/, weight: 40 },
    ],
  },

  // ── Perl ─────────────────────────────────────────────────────────────────
  {
    id: 'perl',
    patterns: [
      { re: /^#!\s*\/usr\/bin\/perl|^#!\s*\/usr\/bin\/env\s+perl/m, weight: 100 },
      { re: /\bmy\s+\$\w+\s*=/, weight: 40 },
      { re: /\bprint\s+"/, weight: 15 },
      { re: /\buse\s+strict|use\s+warnings/, weight: 40 },
      { re: /\$_/, weight: 20 },
      { re: /=~\s*\//, weight: 30 },
    ],
  },

  // ── Pascal ────────────────────────────────────────────────────────────────
  {
    id: 'pascal',
    patterns: [
      { re: /\bprogram\s+\w+\s*;/i, weight: 80 },
      { re: /\bbegin\b.*\bend\b/is, weight: 30 },
      { re: /\bwriteln\s*\(/i, weight: 40 },
      { re: /\bvar\s+\w+\s*:\s*(integer|real|string|char|boolean)/i, weight: 50 },
      { re: /\bprocedure\s+\w+|function\s+\w+.*:\s*\w+\s*;/i, weight: 30 },
    ],
  },

  // ── Fortran ───────────────────────────────────────────────────────────────
  {
    id: 'fortran',
    patterns: [
      { re: /^\s*program\s+\w+/im, weight: 80 },
      { re: /^\s*subroutine\s+\w+/im, weight: 60 },
      { re: /^\s*write\s*\(\*,\s*\*\)/im, weight: 40 },
      { re: /^\s*(integer|real|double precision|character|logical)\s+::\s*\w+/im, weight: 40 },
      { re: /\bend\s+program\b/i, weight: 50 },
    ],
  },

  // ── Prolog ────────────────────────────────────────────────────────────────
  {
    id: 'prolog',
    patterns: [
      { re: /\b:- module\s*\(/, weight: 60 },
      { re: /\b:- use_module\s*\(/, weight: 40 },
      { re: /\?\-/, weight: 30 },
      { re: /\w+\s*:-\s*\w+/, weight: 30 },
      { re: /\bwriteln\s*\(/, weight: 20 },
    ],
  },

  // ── COBOL ────────────────────────────────────────────────────────────────
  {
    id: 'cobol',
    patterns: [
      { re: /^\s*IDENTIFICATION\s+DIVISION\s*\./im, weight: 100 },
      { re: /^\s*PROGRAM-ID\./im, weight: 80 },
      { re: /^\s*DATA\s+DIVISION/im, weight: 60 },
      { re: /^\s*PROCEDURE\s+DIVISION/im, weight: 60 },
      { re: /^\s*DISPLAY\s+['"]/, weight: 30 },
    ],
  },

  // ── Erlang ────────────────────────────────────────────────────────────────
  {
    id: 'erlang',
    patterns: [
      { re: /^\s*-module\s*\(/m, weight: 80 },
      { re: /^\s*-export\s*\(/m, weight: 60 },
      { re: /\bio:format\s*\(/, weight: 40 },
      { re: /\b(receive|spawn|self\(\)|!)/, weight: 30 },
    ],
  },

  // ── Elixir ────────────────────────────────────────────────────────────────
  {
    id: 'elixir',
    patterns: [
      { re: /\bdefmodule\s+\w+/, weight: 80 },
      { re: /\bdef\s+\w+\s*\(.*\)\s*do\b/, weight: 50 },
      { re: /\bIO\.puts\s+|IO\.inspect\s+/, weight: 40 },
      { re: /\b(|>|Enum\.|Stream\.|String\.|Map\.|List\.)/, weight: 20 },
    ],
  },

  // ── Clojure ───────────────────────────────────────────────────────────────
  {
    id: 'clojure',
    patterns: [
      { re: /^\s*\(ns\s+\w+/m, weight: 80 },
      { re: /\(defn\s+\w+/, weight: 60 },
      { re: /\(println\s+/, weight: 30 },
      { re: /\(def\s+\w+/, weight: 20 },
    ],
  },
];

export interface DetectResult {
  languageId: LanguageId;
  confidence: number; // 0-100
  scores: Array<{ id: LanguageId; score: number }>;
}

/**
 * Detects the most likely programming language from a code snippet.
 * Returns the best match and a confidence score (0-100).
 */
export function detectLanguage(code: string): DetectResult {
  if (!code || code.trim().length < 3) {
    return { languageId: 'python', confidence: 0, scores: [] };
  }

  const scores = RULES.map((rule) => {
    let score = 0;
    for (const { re, weight } of rule.patterns) {
      const matches = code.match(re);
      if (matches) {
        score += weight * (matches.length > 1 ? Math.min(matches.length * 0.4, 2.0) : 1);
      }
    }
    for (const { re, penalty } of rule.antiPatterns ?? []) {
      if (re.test(code)) {
        score -= penalty;
      }
    }
    return { id: rule.id, score: Math.max(0, score) };
  });

  scores.sort((a, b) => b.score - a.score);

  const topScore = scores[0]?.score ?? 0;
  const totalScore = scores.reduce((s, x) => s + x.score, 0) || 1;

  // Confidence = how dominant is the top match (0-100)
  const confidence = topScore === 0 ? 0 : Math.min(100, Math.round((topScore / totalScore) * 150));

  return {
    languageId: topScore > 0 ? scores[0].id : 'python',
    confidence,
    scores,
  };
}
