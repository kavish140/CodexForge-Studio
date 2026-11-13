import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { RuntimeCapability } from './types.js';

const execFileAsync = promisify(execFile);

export interface CloudLanguageConfig {
  compiler: string;
  judge0Id: number;
  preferredProvider: 'wandbox' | 'judge0';
  displayVersion: string;
}

export const CLOUD_COMPILERS: Record<string, CloudLanguageConfig> = {
  rust: {
    compiler: 'rust-1.82.0',
    judge0Id: 108,
    preferredProvider: 'wandbox',
    displayVersion: 'Rust 1.82',
  },
  go: {
    compiler: 'go-1.23.2',
    judge0Id: 107,
    preferredProvider: 'judge0',
    displayVersion: 'Go 1.23.5',
  },
  java: {
    compiler: 'openjdk-jdk-22+36',
    judge0Id: 62,
    preferredProvider: 'judge0',
    displayVersion: 'OpenJDK',
  },
  csharp: {
    compiler: 'mono-6.12.0.199',
    judge0Id: 51,
    preferredProvider: 'wandbox',
    displayVersion: 'C# Mono 6.12',
  },
  ruby: {
    compiler: 'ruby-3.4.9',
    judge0Id: 72,
    preferredProvider: 'wandbox',
    displayVersion: 'Ruby 3.4',
  },
  php: {
    compiler: 'php-8.3.12',
    judge0Id: 98,
    preferredProvider: 'wandbox',
    displayVersion: 'PHP 8.3',
  },
  bash: {
    compiler: 'bash',
    judge0Id: 46,
    preferredProvider: 'wandbox',
    displayVersion: 'GNU Bash',
  },
  // ── Educational / Classic languages ──────────────────────────────────────
  'turbo-cpp': {
    // Emulate classic Turbo C++ feel via old GCC with C++98 on Wandbox
    compiler: 'gcc-4.9.3',
    judge0Id: 54,
    preferredProvider: 'wandbox',
    displayVersion: 'Turbo C++ (GCC 4.9 / C++98)',
  },
  pascal: {
    compiler: 'fpc-3.0.2',
    judge0Id: 161,
    preferredProvider: 'wandbox',
    displayVersion: 'Free Pascal 3.0',
  },
  haskell: {
    compiler: 'ghc-9.8.1',
    judge0Id: 61,
    preferredProvider: 'wandbox',
    displayVersion: 'GHC 9.8',
  },
  lua: {
    compiler: 'lua-5.4.6',
    judge0Id: 64,
    preferredProvider: 'wandbox',
    displayVersion: 'Lua 5.4',
  },
  r: {
    compiler: 'r-4.3.3',
    judge0Id: 99,
    preferredProvider: 'wandbox',
    displayVersion: 'R 4.3',
  },
  kotlin: {
    compiler: 'kotlin-2.0.20',
    judge0Id: 78,
    preferredProvider: 'wandbox',
    displayVersion: 'Kotlin 2.0',
  },
  scala: {
    compiler: 'scala-3.3.1',
    judge0Id: 81,
    preferredProvider: 'wandbox',
    displayVersion: 'Scala 3.3',
  },
  swift: {
    compiler: 'swift-5.10',
    judge0Id: 83,
    preferredProvider: 'wandbox',
    displayVersion: 'Swift 5.10',
  },
  dart: {
    compiler: 'dart-3.4.4',
    judge0Id: 90,
    preferredProvider: 'wandbox',
    displayVersion: 'Dart 3.4',
  },
  perl: {
    compiler: 'perl-5.38.0',
    judge0Id: 85,
    preferredProvider: 'wandbox',
    displayVersion: 'Perl 5.38',
  },
  fortran: {
    compiler: 'gfortran-head',
    judge0Id: 59,
    preferredProvider: 'wandbox',
    displayVersion: 'GFortran (Latest)',
  },
  prolog: {
    compiler: 'swiprolog-8.4.3',
    judge0Id: 109,
    preferredProvider: 'wandbox',
    displayVersion: 'SWI-Prolog 8.4',
  },
  cobol: {
    compiler: 'cobol-gnucobol-3.1.2',
    judge0Id: 77,
    preferredProvider: 'wandbox',
    displayVersion: 'GnuCOBOL 3.1',
  },
  erlang: {
    compiler: 'erlang-26.0.2',
    judge0Id: 58,
    preferredProvider: 'wandbox',
    displayVersion: 'Erlang 26.0',
  },
  elixir: {
    compiler: 'elixir-1.17.2',
    judge0Id: 57,
    preferredProvider: 'wandbox',
    displayVersion: 'Elixir 1.17',
  },
  clojure: {
    compiler: 'clojure-1.11.1',
    judge0Id: 86,
    preferredProvider: 'wandbox',
    displayVersion: 'Clojure 1.11',
  },
};

const SAFE_C_CPP_FLAG = /^-(std=[a-z0-9+]+|O[0-3s]|Wall|Wextra|Werror|Wpedantic|g|lm|pthread)$/i;

export function sanitizeCompilerFlags(language: string, flags?: string[]): string[] {
  if (!Array.isArray(flags)) return [];
  if (language === 'c' || language === 'cpp') {
    return flags
      .map((f) => f.trim())
      .filter((f) => SAFE_C_CPP_FLAG.test(f))
      .slice(0, 10);
  }
  return [];
}

async function probeVersion(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { timeout: 3000 });
    const text = (stdout || stderr || '').trim();
    const firstLine = text.split(/\r?\n/)[0]?.trim() || null;
    return firstLine;
  } catch {
    return null;
  }
}

let cachedCapabilities: RuntimeCapability[] | null = null;

export async function detectRuntimeCapabilities(forceRefresh = false): Promise<RuntimeCapability[]> {
  if (cachedCapabilities && !forceRefresh) {
    return cachedCapabilities;
  }

  const [gccVer, gppVer, pyVer, nodeVer] = await Promise.all([
    probeVersion('gcc', ['--version']),
    probeVersion('g++', ['--version']),
    probeVersion('python', ['--version']),
    probeVersion('node', ['--version']),
  ]);

  const extractSemver = (raw: string | null, fallbackPrefix = ''): string | null => {
    if (!raw) return null;
    const match = raw.match(/\d+\.\d+(\.\d+)?/);
    return match ? `${fallbackPrefix}${match[0]}` : raw;
  };

  const capabilities: RuntimeCapability[] = [
    {
      id: 'c',
      available: Boolean(gccVer),
      version: extractSemver(gccVer, 'gcc '),
      engine: 'local',
    },
    {
      id: 'cpp',
      available: Boolean(gppVer),
      version: extractSemver(gppVer, 'g++ '),
      engine: 'local',
    },
    {
      id: 'python',
      available: Boolean(pyVer),
      version: extractSemver(pyVer, 'Python '),
      engine: 'local',
    },
    {
      id: 'javascript',
      available: Boolean(nodeVer),
      version: extractSemver(nodeVer, 'Node '),
      engine: 'local',
    },
    {
      id: 'typescript',
      available: Boolean(nodeVer),
      version: extractSemver(nodeVer, 'Node '),
      engine: 'local',
    },
    {
      id: 'web',
      available: true,
      version: 'Browser Sandbox',
      engine: 'browser',
    },
    {
      id: 'sql',
      available: true,
      version: 'SQLite WASM',
      engine: 'browser',
    },
    ...Object.entries(CLOUD_COMPILERS).map(([id, cfg]) => ({
      id,
      available: true,
      version: cfg.displayVersion,
      engine: 'cloud' as const,
    })),
  ];

  cachedCapabilities = capabilities;
  return capabilities;
}
