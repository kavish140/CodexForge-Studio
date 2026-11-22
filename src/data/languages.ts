import type { LanguageDefinition, LanguageId } from '../types/playground';

export const LANGUAGES: LanguageDefinition[] = [
  {
    id: 'python',
    name: 'Python',
    shortName: 'PY',
    monacoLanguage: 'python',
    extension: 'py',
    filename: 'main.py',
    engine: 'local',
    defaultVersion: 'Python 3.14',
    accentHex: '#3B82F6',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'py-showcase',
        name: 'Quick Showcase',
        description: 'F-strings, dataclasses & algorithm timing',
        code: `from dataclasses import dataclass
import sys
import time

@dataclass
class Benchmark:
    label: str
    value: int

def fibonacci(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

start = time.perf_counter()
results = [Benchmark(f"F({i})", fibonacci(i)) for i in (10, 20, 35)]
elapsed = (time.perf_counter() - start) * 1000

print(f"Python {sys.version.split()[0]} ready!")
for item in results:
    print(f"  {item.label:>6} = {item.value:,}")
print(f"Computed in {elapsed:.3f} ms")
`,
        stdin: '',
      },
      {
        id: 'py-stdin',
        name: 'Stdin Reader & Sum',
        description: 'Reads space-separated numbers from Standard Input',
        code: `import sys

tokens = sys.stdin.read().split()
if not tokens:
    print("Provide numbers in the Stdin panel ->")
else:
    nums = [float(x) for x in tokens]
    print(f"Count : {len(nums)}")
    print(f"Sum   : {sum(nums):g}")
    print(f"Min   : {min(nums):g}")
    print(f"Max   : {max(nums):g}")
`,
        stdin: '12 45 7 89 23 16',
      },
      {
        id: 'py-graph',
        name: 'Dijkstra Shortest Path',
        description: 'Weighted graph shortest path using heapq',
        code: `import heapq

def dijkstra(graph: dict[str, list[tuple[str, int]]], start: str) -> dict[str, int]:
    dist = {node: float("inf") for node in graph}
    dist[start] = 0
    pq = [(0, start)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(pq, (dist[v], v))
    return dist

network = {
    "A": [("B", 4), ("C", 2)],
    "B": [("C", 1), ("D", 5)],
    "C": [("D", 8), ("E", 10)],
    "D": [("E", 2)],
    "E": [],
}

print("Shortest distances from A:")
for node, distance in dijkstra(network, "A").items():
    print(f"  A -> {node}: {distance}")
`,
        stdin: '',
      },
    ],
  },
  {
    id: 'cpp',
    name: 'C++',
    shortName: 'C++',
    monacoLanguage: 'cpp',
    extension: 'cpp',
    filename: 'main.cpp',
    engine: 'local',
    defaultVersion: 'g++ 16 (C++20)',
    accentHex: '#6366F1',
    category: 'systems',
    supportsStdin: true,
    supportsFlags: true,
    defaultFlags: ['-std=c++20', '-O2', '-Wall'],
    flagOptions: [
      { label: 'C++17', flag: '-std=c++17', group: 'standard' },
      { label: 'C++20', flag: '-std=c++20', group: 'standard' },
      { label: 'C++23', flag: '-std=c++23', group: 'standard' },
      { label: '-O0', flag: '-O0', group: 'optimization' },
      { label: '-O2', flag: '-O2', group: 'optimization' },
      { label: '-O3', flag: '-O3', group: 'optimization' },
      { label: '-Wall', flag: '-Wall', group: 'warnings' },
      { label: '-Wextra', flag: '-Wextra', group: 'warnings' },
    ],
    templates: [
      {
        id: 'cpp-modern',
        name: 'Modern C++20 Showcase',
        description: 'Ranges, structured bindings & vector transforms',
        code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> values = {14, 3, 27, 8, 42, 19, 5};
    std::ranges::sort(values);

    std::cout << "Sorted: ";
    for (int v : values) std::cout << v << ' ';
    std::cout << '\\n';

    int total = std::accumulate(values.begin(), values.end(), 0);
    std::cout << "Sum: " << total << " | Max: " << values.back() << '\\n';
    return 0;
}
`,
        stdin: '',
      },
      {
        id: 'cpp-stdin',
        name: 'Competitive Stdin & Fast I/O',
        description: 'Reads N followed by N integers from Stdin',
        code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n;
    if (!(std::cin >> n)) {
        std::cout << "Enter N followed by N integers in Stdin.\\n";
        return 0;
    }

    std::vector<long long> a(n);
    for (int i = 0; i < n; ++i) std::cin >> a[i];

    auto [mn, mx] = std::minmax_element(a.begin(), a.end());
    std::cout << "Read " << n << " numbers\\n";
    std::cout << "Min = " << *mn << ", Max = " << *mx << '\\n';
    return 0;
}
`,
        stdin: '5\n10 42 -3 99 18',
      },
    ],
  },
  {
    id: 'c',
    name: 'C',
    shortName: 'C',
    monacoLanguage: 'c',
    extension: 'c',
    filename: 'main.c',
    engine: 'local',
    defaultVersion: 'gcc 16 (C17)',
    accentHex: '#0EA5E9',
    category: 'systems',
    supportsStdin: true,
    supportsFlags: true,
    defaultFlags: ['-std=c17', '-O2', '-Wall'],
    flagOptions: [
      { label: 'C11', flag: '-std=c11', group: 'standard' },
      { label: 'C17', flag: '-std=c17', group: 'standard' },
      { label: 'C23', flag: '-std=c23', group: 'standard' },
      { label: '-O0', flag: '-O0', group: 'optimization' },
      { label: '-O2', flag: '-O2', group: 'optimization' },
      { label: '-O3', flag: '-O3', group: 'optimization' },
      { label: '-Wall', flag: '-Wall', group: 'warnings' },
      { label: '-Wextra', flag: '-Wextra', group: 'warnings' },
    ],
    templates: [
      {
        id: 'c-hello',
        name: 'Structs & Pointers',
        description: 'Clean C17 struct manipulation and formatted output',
        code: `#include <stdio.h>

typedef struct {
    const char *name;
    int score;
} Entry;

int main(void) {
    Entry board[] = {
        {"Ada", 98},
        {"Linus", 94},
        {"Grace", 99},
    };
    int count = (int)(sizeof(board) / sizeof(board[0]));

    for (int i = 0; i < count; ++i) {
        printf("%-8s -> %d pts\\n", board[i].name, board[i].score);
    }
    return 0;
}
`,
        stdin: '',
      },
      {
        id: 'c-stdin',
        name: 'Stdin Frequency Counter',
        description: 'Counts characters and lines from Standard Input',
        code: `#include <stdio.h>

int main(void) {
    int ch, chars = 0, lines = 0;
    while ((ch = getchar()) != EOF) {
        chars++;
        if (ch == '\\n') lines++;
    }
    printf("Characters: %d\\nLines: %d\\n", chars, lines);
    return 0;
}
`,
        stdin: 'Hello C17!\nPrecision Studio\n',
      },
    ],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    shortName: 'TS',
    monacoLanguage: 'typescript',
    extension: 'ts',
    filename: 'main.ts',
    engine: 'local',
    defaultVersion: 'Node 24 Native TS',
    accentHex: '#3178C6',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'ts-generics',
        name: 'Typed Data Pipeline',
        description: 'Discriminated unions, generics & Node 24 native TS',
        code: `interface Task {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
}

function summarize<T extends { priority: Task['priority']; done: boolean }>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = \`\${item.priority}:\${item.done ? 'done' : 'open'}\`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

const tasks: Task[] = [
  { id: 1, title: 'Design split-pane shell', priority: 'high', done: true },
  { id: 2, title: 'Wire local compiler runner', priority: 'high', done: true },
  { id: 3, title: 'Polish ANSI console viewer', priority: 'medium', done: false },
];

console.log('Node version:', process.version);
console.table(summarize(tasks));
`,
        stdin: '',
      },
      {
        id: 'ts-stdin',
        name: 'JSON Stdin Validator',
        description: 'Parses JSON payload from Stdin with typed formatting',
        code: `import fs from 'node:fs';

const raw = fs.readFileSync(0, 'utf8').trim();

interface UserPayload {
  name: string;
  roles: string[];
}

if (!raw) {
  console.log('Provide a JSON object in Stdin.');
} else {
  const data = JSON.parse(raw) as UserPayload;
  console.log(\`User: \${data.name}\`);
  console.log(\`Roles: \${data.roles.join(', ')}\`);
}
`,
        stdin: '{"name": "Ada Lovelace", "roles": ["admin", "compiler-architect"]}',
      },
    ],
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    shortName: 'JS',
    monacoLanguage: 'javascript',
    extension: 'js',
    filename: 'main.js',
    engine: 'local',
    defaultVersion: 'Node 24 ES2024',
    accentHex: '#FACC15',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'js-modern',
        name: 'ES2024 Object.groupBy & Async',
        description: 'Modern Node.js features & ANSI output',
        code: `const benchmarks = [
  { lang: 'C++', ms: 4, tier: 'native' },
  { lang: 'Rust', ms: 6, tier: 'native' },
  { lang: 'Python', ms: 28, tier: 'script' },
  { lang: 'Node', ms: 19, tier: 'script' },
];

const grouped = Object.groupBy(benchmarks, (b) => b.tier);
console.log('\\x1b[36mGrouped runtimes:\\x1b[0m');
console.log(JSON.stringify(grouped, null, 2));
`,
        stdin: '',
      },
      {
        id: 'js-stdin',
        name: 'Stdin Line Transformer',
        description: 'Reads lines from Stdin and outputs indexed summary',
        code: `import fs from 'node:fs';

const input = fs.readFileSync(0, 'utf8').trim();
const lines = input ? input.split(/\\r?\\n/) : [];

lines.forEach((line, idx) => {
  console.log(\`[\${idx + 1}] \${line.toUpperCase()}\`);
});
`,
        stdin: 'alpha\nbeta\ngamma',
      },
    ],
  },
  {
    id: 'web',
    name: 'Web (HTML/CSS/JS)',
    shortName: 'WEB',
    monacoLanguage: 'html',
    extension: 'html',
    filename: 'index.html',
    engine: 'browser',
    defaultVersion: 'Browser Sandbox',
    accentHex: '#EC4899',
    category: 'web',
    supportsStdin: false,
    templates: [
      {
        id: 'web-interactive',
        name: 'Interactive Studio Card',
        description: 'Live DOM + CSS animations + Console logging',
        code: '',
        webCode: {
          html: `<main class="card">
  <div class="badge">LIVE SANDBOX</div>
  <h1>Interactive Counter</h1>
  <p>Edit HTML, CSS, or JS tabs and watch the preview update.</p>
  <div class="counter-row">
    <button id="dec" type="button">−</button>
    <span id="count">0</span>
    <button id="inc" type="button">+</button>
  </div>
</main>`,
          css: `* {
  box-sizing: border-box;
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
}

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, #1e1b4b, #090b10 70%);
  color: #f8fafc;
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 360px;
  padding: 28px;
  border-radius: 16px;
  background: rgba(17, 21, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  text-align: center;
}

.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.14);
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 14px;
}

h1 {
  font-size: 20px;
  margin-bottom: 8px;
}

p {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 22px;
}

.counter-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

button {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #1e293b;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease;
}

button:hover {
  background: #6366f1;
}

button:active {
  transform: scale(0.94);
}

#count {
  font-size: 32px;
  font-weight: 700;
  min-width: 48px;
  font-variant-numeric: tabular-nums;
}`,
          js: `let count = 0;
const countEl = document.getElementById('count');

function update(delta) {
  count += delta;
  countEl.textContent = String(count);
  console.log('Counter updated ->', count);
}

document.getElementById('inc').addEventListener('click', () => update(1));
document.getElementById('dec').addEventListener('click', () => update(-1));
console.log('Web sandbox initialized!');`,
        },
      },
      {
        id: 'web-canvas',
        name: 'Animated Particle Canvas',
        description: '60fps HTML5 Canvas animation in the preview iframe',
        code: '',
        webCode: {
          html: `<canvas id="stage"></canvas>`,
          css: `html, body { margin: 0; overflow: hidden; background: #07090f; }
canvas { display: block; width: 100vw; height: 100vh; }`,
          js: `const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let w, h;
const dots = Array.from({ length: 38 }, () => ({
  x: Math.random(),
  y: Math.random(),
  vx: (Math.random() - 0.5) * 0.004,
  vy: (Math.random() - 0.5) * 0.004,
}));

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function tick() {
  ctx.fillStyle = 'rgba(7, 9, 15, 0.25)';
  ctx.fillRect(0, 0, w, h);
  for (const d of dots) {
    d.x = (d.x + d.vx + 1) % 1;
    d.y = (d.y + d.vy + 1) % 1;
    ctx.beginPath();
    ctx.arc(d.x * w, d.y * h, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#818cf8';
    ctx.fill();
  }
  requestAnimationFrame(tick);
}
tick();
console.log('Canvas animation running');`,
        },
      },
    ],
  },
  {
    id: 'sql',
    name: 'SQL (SQLite / MySQL)',
    shortName: 'SQL',
    monacoLanguage: 'sql',
    extension: 'sql',
    filename: 'query.sql',
    engine: 'browser',
    defaultVersion: 'SQLite WASM + MySQL user management',
    accentHex: '#10B981',
    category: 'data',
    supportsStdin: false,
    templates: [
      {
        id: 'sql-analytics',
        name: 'Schema, Joins & Window Ranking',
        description: 'Creates tables in SQLite WASM and renders result grids',
        code: `CREATE TABLE engineers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  commits INTEGER NOT NULL
);

INSERT INTO engineers (name, team, commits) VALUES
  ('Ada Lovelace', 'Compilers', 340),
  ('Grace Hopper', 'Compilers', 415),
  ('Alan Turing', 'Runtime', 290),
  ('Margaret Hamilton', 'Runtime', 380),
  ('Ken Thompson', 'Systems', 310);

SELECT
  name,
  team,
  commits,
  RANK() OVER (PARTITION BY team ORDER BY commits DESC) AS team_rank
FROM engineers
ORDER BY commits DESC;

SELECT
  team,
  COUNT(*) AS members,
  SUM(commits) AS total_commits,
  ROUND(AVG(commits), 1) AS avg_commits
FROM engineers
GROUP BY team
ORDER BY total_commits DESC;
`,
      },
      {
        id: 'sql-mysql-users',
        name: 'MySQL User Management',
        description: 'Demonstrates MySQL account, grant and role syntax in the browser',
        code: `CREATE USER kavya IDENTIFIED BY '123';
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'secure-password';

ALTER USER kavya IDENTIFIED BY 'new-password';

GRANT SELECT, INSERT ON app_db.* TO kavya;
SHOW GRANTS FOR kavya;
SELECT CURDATE() AS today, NOW() AS current_time, USER() AS current_user;

CREATE ROLE 'developer';
GRANT UPDATE ON app_db.* TO 'developer';

SHOW USERS;

REVOKE INSERT ON app_db.* FROM kavya;
DROP USER kavya;
`,
      },
      {
        id: 'sql-cte',
        name: 'Recursive Fibonacci CTE',
        description: 'Generates sequence with SQL Common Table Expressions',
        code: `WITH RECURSIVE fib(n, a, b) AS (
  SELECT 0, 0, 1
  UNION ALL
  SELECT n + 1, b, a + b
  FROM fib
  WHERE n < 12
)
SELECT n, a AS fibonacci_value FROM fib;
`,
      },
    ],
  },
  {
    id: 'rust',
    name: 'Rust',
    shortName: 'RS',
    monacoLanguage: 'rust',
    extension: 'rs',
    filename: 'main.rs',
    engine: 'cloud',
    defaultVersion: 'Rust 1.82',
    accentHex: '#F97316',
    category: 'systems',
    supportsStdin: true,
    templates: [
      {
        id: 'rs-showcase',
        name: 'Enums, Match & Iterators',
        description: 'Zero-cost iterator pipeline in Rust',
        code: `#[derive(Debug)]
enum Status {
    Ready(u32),
    Complete { items: usize },
}

fn main() {
    let primes: Vec<u32> = (2..30)
        .filter(|&n| (2..=((n as f64).sqrt() as u32)).all(|d| n % d != 0))
        .collect();

    let state = Status::Complete { items: primes.len() };
    println!("Primes under 30: {:?}", primes);
    println!("State: {:?}", state);
}
`,
        stdin: '',
      },
      {
        id: 'rs-stdin',
        name: 'Stdin Line Processor',
        description: 'Reads stdin lines and counts words',
        code: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let words: Vec<&str> = input.split_whitespace().collect();
    println!("Word count: {}", words.len());
    for (i, word) in words.iter().enumerate() {
        println!("  {}: {}", i + 1, word);
    }
}
`,
        stdin: 'rust ownership borrowing lifetimes',
      },
    ],
  },
  {
    id: 'go',
    name: 'Go',
    shortName: 'GO',
    monacoLanguage: 'go',
    extension: 'go',
    filename: 'main.go',
    engine: 'cloud',
    defaultVersion: 'Go 1.23.5',
    accentHex: '#06B6D4',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'go-channels',
        name: 'Goroutines & Channels',
        description: 'Concurrent worker fan-in using Go channels',
        code: `package main

import (
	"fmt"
	"sync"
)

func main() {
	jobs := []int{2, 4, 6, 8, 10}
	results := make(chan int, len(jobs))
	var wg sync.WaitGroup

	for _, n := range jobs {
		wg.Add(1)
		go func(val int) {
			defer wg.Done()
			results <- val * val
		}(n)
	}

	wg.Wait()
	close(results)

	fmt.Print("Squares: ")
	for r := range results {
		fmt.Printf("%d ", r)
	}
	fmt.Println()
}
`,
        stdin: '',
      },
      {
        id: 'go-stdin',
        name: 'Stdin Scanner',
        description: 'Reads lines from Stdin using bufio.Scanner',
        code: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	lineNo := 1
	for scanner.Scan() {
		fmt.Printf("%d: %s\\n", lineNo, strings.ToUpper(scanner.Text()))
		lineNo++
	}
}
`,
        stdin: 'hello go\nconcurrency made simple',
      },
    ],
  },
  {
    id: 'java',
    name: 'Java',
    shortName: 'JAVA',
    monacoLanguage: 'java',
    extension: 'java',
    filename: 'Main.java',
    engine: 'cloud',
    defaultVersion: 'OpenJDK',
    accentHex: '#EF4444',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'java-records',
        name: 'Java Streams & Collections',
        description: 'Clean Java streams and formatted timeline output',
        code: `import java.util.List;
import java.util.stream.Collectors;

public class Main {
    static class Lang {
        final String name;
        final int year;
        Lang(String name, int year) {
            this.name = name;
            this.year = year;
        }
    }

    public static void main(String[] args) {
        List<Lang> langs = List.of(
            new Lang("C", 1972),
            new Lang("Python", 1991),
            new Lang("Java", 1995),
            new Lang("Rust", 2010)
        );

        String formatted = langs.stream()
            .map(l -> l.name + " (" + l.year + ")")
            .collect(Collectors.joining(" -> "));

        System.out.println("Timeline: " + formatted);
    }
}
`,
        stdin: '',
      },
    ],
  },
  {
    id: 'csharp',
    name: 'C#',
    shortName: 'C#',
    monacoLanguage: 'csharp',
    extension: 'cs',
    filename: 'Program.cs',
    engine: 'cloud',
    defaultVersion: 'C# Mono 6.12',
    accentHex: '#8B5CF6',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'cs-linq',
        name: 'C# LINQ Pipeline',
        description: 'Clean LINQ aggregation and sorting',
        code: `using System;
using System.Linq;

class Metric
{
    public string Name { get; }
    public double LatencyMs { get; }
    public Metric(string name, double latencyMs)
    {
        Name = name;
        LatencyMs = latencyMs;
    }
}

class Program
{
    static void Main()
    {
        var metrics = new[]
        {
            new Metric("Compile", 18.4),
            new Metric("Link", 7.2),
            new Metric("Execute", 3.1),
        };

        var total = metrics.Sum(m => m.LatencyMs);
        foreach (var m in metrics.OrderByDescending(m => m.LatencyMs))
        {
            Console.WriteLine($"{m.Name,-10} {m.LatencyMs:F1} ms");
        }
        Console.WriteLine($"Total: {total:F1} ms");
    }
}
`,
        stdin: '',
      },
    ],
  },
  {
    id: 'ruby',
    name: 'Ruby',
    shortName: 'RB',
    monacoLanguage: 'ruby',
    extension: 'rb',
    filename: 'main.rb',
    engine: 'cloud',
    defaultVersion: 'Ruby 3.4',
    accentHex: '#E11D48',
    category: 'scripting',
    supportsStdin: true,
    templates: [
      {
        id: 'rb-enum',
        name: 'Enumerables & Blocks',
        description: 'Expressive Ruby tally & map blocks',
        code: `words = %w[ruby crystal elixir ruby gleam ruby]
counts = words.tally
counts.each { |lang, count| puts "#{lang.ljust(8)} => #{'*' * count} (#{count})" }
`,
        stdin: '',
      },
    ],
  },
  {
    id: 'php',
    name: 'PHP',
    shortName: 'PHP',
    monacoLanguage: 'php',
    extension: 'php',
    filename: 'main.php',
    engine: 'cloud',
    defaultVersion: 'PHP 8.3',
    accentHex: '#6366F1',
    category: 'scripting',
    supportsStdin: true,
    templates: [
      {
        id: 'php-typed',
        name: 'PHP 8.3 Typed Match',
        description: 'Match expressions & array_map',
        code: `<?php

declare(strict_types=1);

function classify(int $code): string {
    return match (true) {
        $code >= 200 && $code < 300 => 'Success',
        $code >= 400 && $code < 500 => 'Client Error',
        $code >= 500 => 'Server Error',
        default => 'Other',
    };
}

foreach ([200, 201, 404, 503] as $status) {
    echo "$status => " . classify($status) . PHP_EOL;
}
`,
        stdin: '',
      },
    ],
  },
  {
    id: 'bash',
    name: 'Bash',
    shortName: 'SH',
    monacoLanguage: 'shell',
    extension: 'sh',
    filename: 'script.sh',
    engine: 'cloud',
    defaultVersion: 'GNU Bash',
    accentHex: '#22C55E',
    category: 'scripting',
    supportsStdin: true,
    templates: [
      {
        id: 'sh-pipeline',
        name: 'Shell Text Pipeline',
        description: 'Processes Stdin lines with awk/sort',
        code: `#!/usr/bin/env bash
set -euo pipefail

echo "Processing input lines:"
nl -ba | awk '{printf "  Line %s -> %s\\n", $1, toupper($2)}'
`,
        stdin: 'compiler\ninterpreter\nsandbox',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  TURBO C++  (Educational / Classic — cloud via Wandbox GCC 4.9)
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'turbo-cpp',
    name: 'Turbo C++',
    shortName: 'TBC',
    monacoLanguage: 'cpp',
    extension: 'cpp',
    filename: 'main.cpp',
    engine: 'cloud',
    defaultVersion: 'GCC 4.9 / C++98 (Turbo C++ compat)',
    accentHex: '#A855F7',
    category: 'educational',
    supportsStdin: true,
    supportsFlags: true,
    defaultFlags: ['-std=c++98', '-O0'],
    flagOptions: [
      { label: 'C++98', flag: '-std=c++98', group: 'standard' },
      { label: 'C++03', flag: '-std=c++03', group: 'standard' },
      { label: 'C++11', flag: '-std=c++11', group: 'standard' },
      { label: '-O0', flag: '-O0', group: 'optimization' },
      { label: '-O1', flag: '-O1', group: 'optimization' },
      { label: '-Wall', flag: '-Wall', group: 'warnings' },
    ],
    templates: [
      {
        id: 'tbc-hello',
        name: 'Hello World (Turbo Style)',
        description: 'Classic Turbo C++ Hello World — works in C++98 mode',
        code: `#include <iostream>
using namespace std;

void main_prog() {
    cout << "Hello, World!" << endl;
    cout << "Welcome to Turbo C++ Playground" << endl;
    cout << "Classic C++98 is running!" << endl;
}

int main() {
    main_prog();
    return 0;
}
`,
        stdin: '',
      },
      {
        id: 'tbc-arrays',
        name: 'Arrays & Loops (Classic C++)',
        description: 'Classic C++98 array operations with cout',
        code: `#include <iostream>
using namespace std;

int main() {
    int arr[5] = {10, 30, 50, 20, 40};
    int n = 5;
    int temp, min_idx;

    // Selection sort
    for (int i = 0; i < n - 1; i++) {
        min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min_idx])
                min_idx = j;
        }
        temp = arr[min_idx];
        arr[min_idx] = arr[i];
        arr[i] = temp;
    }

    cout << "Sorted array: ";
    for (int i = 0; i < n; i++) {
        cout << arr[i];
        if (i < n - 1) cout << ", ";
    }
    cout << endl;
    return 0;
}
`,
        stdin: '',
      },
      {
        id: 'tbc-struct',
        name: 'Student Record (struct)',
        description: 'Classic C++98 struct-based student record',
        code: `#include <iostream>
#include <cstring>
using namespace std;

struct Student {
    char name[30];
    int roll;
    float marks;
};

void display(Student s) {
    cout << "Name : " << s.name << endl;
    cout << "Roll : " << s.roll << endl;
    cout << "Marks: " << s.marks << "%" << endl;
}

int main() {
    Student s;
    strcpy(s.name, "Ada Lovelace");
    s.roll = 42;
    s.marks = 98.5;
    display(s);
    return 0;
}
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  PASCAL
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'pascal',
    name: 'Pascal',
    shortName: 'PAS',
    monacoLanguage: 'pascal',
    extension: 'pas',
    filename: 'main.pas',
    engine: 'cloud',
    defaultVersion: 'Free Pascal 3.0',
    accentHex: '#10B981',
    category: 'educational',
    supportsStdin: true,
    templates: [
      {
        id: 'pas-hello',
        name: 'Hello World',
        description: 'Simple Pascal Hello World',
        code: `program HelloWorld;
begin
  writeln('Hello, World!');
  writeln('Pascal is alive!');
end.
`,
        stdin: '',
      },
      {
        id: 'pas-loop',
        name: 'Fibonacci Sequence',
        description: 'Fibonacci numbers using Pascal',
        code: `program Fibonacci;
var
  a, b, temp, n, i: Integer;
begin
  a := 0; b := 1; n := 15;
  write('Fibonacci: ');
  for i := 1 to n do
  begin
    write(a, ' ');
    temp := a + b;
    a := b;
    b := temp;
  end;
  writeln;
end.
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  HASKELL
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'haskell',
    name: 'Haskell',
    shortName: 'HS',
    monacoLanguage: 'haskell',
    extension: 'hs',
    filename: 'Main.hs',
    engine: 'cloud',
    defaultVersion: 'GHC 9.8',
    accentHex: '#8B5CF6',
    category: 'functional',
    supportsStdin: true,
    templates: [
      {
        id: 'hs-hello',
        name: 'Infinite Lists & Lazy Evaluation',
        description: 'Haskell lazy primes using the Sieve of Eratosthenes',
        code: `module Main where

sieve :: [Int] -> [Int]
sieve (p:xs) = p : sieve [x | x <- xs, x \`mod\` p /= 0]

primes :: [Int]
primes = sieve [2..]

main :: IO ()
main = do
  putStrLn "First 10 primes (lazy sieve):"
  print (take 10 primes)
  putStrLn $ "Sum of first 100 primes: " ++ show (sum (take 100 primes))
`,
        stdin: '',
      },
      {
        id: 'hs-monad',
        name: 'Maybe Monad Pipeline',
        description: 'Safe division and chaining with Maybe monad',
        code: `module Main where

safeDiv :: Int -> Int -> Maybe Int
safeDiv _ 0 = Nothing
safeDiv x y = Just (x \`div\` y)

pipeline :: Int -> Int -> Int -> Maybe Int
pipeline x y z = do
  r1 <- safeDiv x y
  r2 <- safeDiv r1 z
  return (r2 * 100)

main :: IO ()
main = do
  print (pipeline 1000 5 4)   -- Just 50
  print (pipeline 1000 0 4)   -- Nothing (div by zero)
  print (pipeline 1000 5 0)   -- Nothing (div by zero)
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  LUA
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'lua',
    name: 'Lua',
    shortName: 'LUA',
    monacoLanguage: 'lua',
    extension: 'lua',
    filename: 'main.lua',
    engine: 'cloud',
    defaultVersion: 'Lua 5.4',
    accentHex: '#3B82F6',
    category: 'scripting',
    supportsStdin: true,
    templates: [
      {
        id: 'lua-hello',
        name: 'Tables & Metatables',
        description: 'OOP via Lua metatables',
        code: `-- Class with metatables
local Animal = {}
Animal.__index = Animal

function Animal.new(name, sound)
  local self = setmetatable({}, Animal)
  self.name = name
  self.sound = sound
  return self
end

function Animal:speak()
  print(self.name .. " says " .. self.sound .. "!")
end

local animals = {
  Animal.new("Cat", "meow"),
  Animal.new("Dog", "woof"),
  Animal.new("Duck", "quack"),
}

for _, a in ipairs(animals) do
  a:speak()
end
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  R
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'r',
    name: 'R',
    shortName: 'R',
    monacoLanguage: 'r',
    extension: 'r',
    filename: 'main.r',
    engine: 'cloud',
    defaultVersion: 'R 4.3',
    accentHex: '#3B82F6',
    category: 'data',
    supportsStdin: false,
    templates: [
      {
        id: 'r-stats',
        name: 'Statistical Analysis',
        description: 'Descriptive statistics and simple linear regression in R',
        code: `# Generate sample data
set.seed(42)
x <- c(2, 4, 6, 8, 10, 12, 14, 16, 18, 20)
y <- 3.5 * x + rnorm(length(x), mean = 0, sd = 5)

# Descriptive statistics
cat("=== Descriptive Statistics ===\n")
cat(sprintf("Mean X : %.2f\n", mean(x)))
cat(sprintf("Mean Y : %.2f\n", mean(y)))
cat(sprintf("Corr   : %.4f\n", cor(x, y)))

# Linear regression
model <- lm(y ~ x)
cat("\n=== Linear Regression ===\n")
cat(sprintf("Intercept: %.4f\n", coef(model)[1]))
cat(sprintf("Slope    : %.4f\n", coef(model)[2]))
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  KOTLIN
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'kotlin',
    name: 'Kotlin',
    shortName: 'KT',
    monacoLanguage: 'kotlin',
    extension: 'kt',
    filename: 'main.kt',
    engine: 'cloud',
    defaultVersion: 'Kotlin 2.0',
    accentHex: '#7C3AED',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'kt-hello',
        name: 'Data Classes & Extensions',
        description: 'Kotlin data classes, sealed classes and extension functions',
        code: `data class Person(val name: String, val age: Int)

sealed class Result<out T>
data class Success<T>(val value: T) : Result<T>()
data class Failure(val error: String) : Result<Nothing>()

fun Int.isEven() = this % 2 == 0

fun findAdults(people: List<Person>): Result<List<Person>> {
    val adults = people.filter { it.age >= 18 }
    return if (adults.isEmpty()) Failure("No adults found")
    else Success(adults)
}

fun main() {
    val people = listOf(
        Person("Alice", 25),
        Person("Bob", 17),
        Person("Charlie", 30)
    )
    when (val result = findAdults(people)) {
        is Success -> result.value.forEach { println("\${it.name} (\${it.age})") }
        is Failure -> println("Error: \${result.error}")
    }
    println("42 is even: \${42.isEven()}")
}
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  SCALA
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'scala',
    name: 'Scala',
    shortName: 'SC',
    monacoLanguage: 'scala',
    extension: 'scala',
    filename: 'Main.scala',
    engine: 'cloud',
    defaultVersion: 'Scala 3.3',
    accentHex: '#E11D48',
    category: 'functional',
    supportsStdin: true,
    templates: [
      {
        id: 'sc-hello',
        name: 'Pattern Matching & Collections',
        description: 'Scala 3 pattern matching, case classes and collections',
        code: `case class Employee(name: String, dept: String, salary: Double)

@main def run(): Unit =
  val team = List(
    Employee("Ada", "Engineering", 95000),
    Employee("Grace", "Engineering", 102000),
    Employee("Alan", "Research", 88000),
    Employee("Margaret", "Engineering", 97000)
  )

  val byDept = team.groupBy(_.dept)
  for (dept, members) <- byDept do
    val avg = members.map(_.salary).sum / members.size
    println(s"$dept: \${members.length} members, avg salary $$\${avg.round}")

  val topEarner = team.maxBy(_.salary)
  println(s"\\nTop earner: \${topEarner.name} @ $$\${topEarner.salary}")
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  SWIFT
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'swift',
    name: 'Swift',
    shortName: 'SW',
    monacoLanguage: 'swift',
    extension: 'swift',
    filename: 'main.swift',
    engine: 'cloud',
    defaultVersion: 'Swift 5.10',
    accentHex: '#F97316',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'sw-hello',
        name: 'Generics & Protocols',
        description: 'Swift protocols, generics, and optionals',
        code: `protocol Describable {
    var description: String { get }
}

struct Stack<T: Describable> {
    private var items: [T] = []
    mutating func push(_ item: T) { items.append(item) }
    mutating func pop() -> T? { items.popLast() }
    var top: T? { items.last }
    var count: Int { items.count }
}

struct Lang: Describable {
    let name: String
    var description: String { name }
}

var stack = Stack<Lang>()
["C", "Python", "Swift"].map(Lang.init).forEach { stack.push($0) }
print("Stack size: \\(stack.count)")
if let top = stack.top { print("Top: \\(top.description)") }
while let item = stack.pop() { print("Popped: \\(item.name)") }
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  DART
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'dart',
    name: 'Dart',
    shortName: 'DT',
    monacoLanguage: 'dart',
    extension: 'dart',
    filename: 'main.dart',
    engine: 'cloud',
    defaultVersion: 'Dart 3.4',
    accentHex: '#06B6D4',
    category: 'modern',
    supportsStdin: true,
    templates: [
      {
        id: 'dt-hello',
        name: 'Null Safety & Result Type',
        description: 'Dart null safety, generics and result pattern',
        code: `import 'dart:math';

class Result<T> {
  final T? value;
  final String? error;
  const Result.ok(this.value) : error = null;
  const Result.err(this.error) : value = null;
  bool get isOk => error == null;
}

Result<double> safeSqrt(double n) {
  if (n < 0) return Result.err('Cannot sqrt negative number');
  return Result.ok(sqrt(n));
}

void main() {
  for (final n in [-4.0, 0.0, 16.0, 81.0]) {
    final r = safeSqrt(n);
    if (r.isOk) {
      print('sqrt(\$n) = \${r.value!.toStringAsFixed(2)}');
    } else {
      print('sqrt(\$n) => Error: \${r.error}');
    }
  }
}
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  PERL
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'perl',
    name: 'Perl',
    shortName: 'PL',
    monacoLanguage: 'perl',
    extension: 'pl',
    filename: 'main.pl',
    engine: 'cloud',
    defaultVersion: 'Perl 5.38',
    accentHex: '#6366F1',
    category: 'scripting',
    supportsStdin: true,
    templates: [
      {
        id: 'pl-hello',
        name: 'Text Processing & Regex',
        description: 'Perl text processing with regular expressions',
        code: `#!/usr/bin/perl
use strict;
use warnings;

my @words = qw(apple banana apricot blueberry avocado cherry);
my @a_words = grep { /^a/i } @words;
my @lengths = map { length($_) } @words;

print "Words starting with 'a': @a_words\n";
print "Lengths: @lengths\n";
print "Longest: " . (sort { length($b) <=> length($a) } @words)[0] . "\n";
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  FORTRAN
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'fortran',
    name: 'Fortran',
    shortName: 'F90',
    monacoLanguage: 'fortran',
    extension: 'f90',
    filename: 'main.f90',
    engine: 'cloud',
    defaultVersion: 'GFortran (Latest)',
    accentHex: '#8B5CF6',
    category: 'educational',
    supportsStdin: false,
    templates: [
      {
        id: 'f90-hello',
        name: 'Array Operations',
        description: 'Modern Fortran intrinsic array functions',
        code: `program ArrayOps
  implicit none
  integer, parameter :: n = 8
  real :: arr(n) = [4.0, 7.0, 2.0, 9.0, 1.0, 5.0, 8.0, 3.0]

  write(*, '(A, 8F5.1)') 'Array : ', arr
  write(*, '(A, F6.2)')  'Sum   = ', sum(arr)
  write(*, '(A, F6.2)')  'Mean  = ', sum(arr)/n
  write(*, '(A, F6.2)')  'Max   = ', maxval(arr)
  write(*, '(A, F6.2)')  'Min   = ', minval(arr)
end program ArrayOps
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  PROLOG
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'prolog',
    name: 'Prolog',
    shortName: 'PRO',
    monacoLanguage: 'prolog',
    extension: 'pl',
    filename: 'main.pl',
    engine: 'cloud',
    defaultVersion: 'SWI-Prolog 8.4',
    accentHex: '#F59E0B',
    category: 'educational',
    supportsStdin: false,
    templates: [
      {
        id: 'pro-hello',
        name: 'Family Tree & Relations',
        description: 'Classic Prolog family relationships and queries',
        code: `% Family knowledge base
parent(tom, bob).
parent(tom, liz).
parent(bob, ann).
parent(bob, pat).

grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).

:- initialization(main).
main :-
    write('Children of tom: '),
    forall(parent(tom, C), (write(C), write(' '))),
    nl,
    write('Grandchildren of tom: '),
    forall(grandparent(tom, G), (write(G), write(' '))),
    nl,
    ( ancestor(tom, ann) -> write('tom is ancestor of ann') ; true ), nl.
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  COBOL
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'cobol',
    name: 'COBOL',
    shortName: 'CBL',
    monacoLanguage: 'cobol',
    extension: 'cbl',
    filename: 'main.cbl',
    engine: 'cloud',
    defaultVersion: 'GnuCOBOL 3.1',
    accentHex: '#10B981',
    category: 'educational',
    supportsStdin: false,
    templates: [
      {
        id: 'cbl-hello',
        name: 'Hello World',
        description: 'Classic COBOL Hello World',
        code: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. HelloWorld.

       PROCEDURE DIVISION.
           DISPLAY "Hello, World!"
           DISPLAY "COBOL lives on!"
           STOP RUN.
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  ERLANG
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'erlang',
    name: 'Erlang',
    shortName: 'ERL',
    monacoLanguage: 'erlang',
    extension: 'erl',
    filename: 'main.erl',
    engine: 'cloud',
    defaultVersion: 'Erlang 26.0',
    accentHex: '#EF4444',
    category: 'functional',
    supportsStdin: false,
    templates: [
      {
        id: 'erl-hello',
        name: 'Processes & Message Passing',
        description: 'Erlang actor-model message passing between processes',
        code: `-module(main).
-export([start/0, counter/1]).

counter(N) ->
    receive
        {increment, Caller} ->
            Caller ! {count, N + 1},
            counter(N + 1);
        {get, Caller} ->
            Caller ! {count, N},
            counter(N);
        stop -> ok
    end.

start() ->
    Pid = spawn(?MODULE, counter, [0]),
    Pid ! {increment, self()},
    receive {count, C1} -> io:format("Count: ~p~n", [C1]) end,
    Pid ! {increment, self()},
    receive {count, C2} -> io:format("Count: ~p~n", [C2]) end,
    Pid ! {get, self()},
    receive {count, C3} -> io:format("Final: ~p~n", [C3]) end,
    Pid ! stop.
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  ELIXIR
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'elixir',
    name: 'Elixir',
    shortName: 'EX',
    monacoLanguage: 'elixir',
    extension: 'ex',
    filename: 'main.ex',
    engine: 'cloud',
    defaultVersion: 'Elixir 1.17',
    accentHex: '#8B5CF6',
    category: 'functional',
    supportsStdin: false,
    templates: [
      {
        id: 'ex-hello',
        name: 'Pipe Operator & Pattern Matching',
        description: 'Elixir pipe-based data transformation',
        code: `defmodule DataPipeline do
  def process(numbers) do
    numbers
    |> Enum.filter(&(&1 > 0))
    |> Enum.map(&(&1 * &1))
    |> Enum.sort(:desc)
    |> Enum.take(5)
  end

  def stats(list) do
    %{
      count: length(list),
      sum: Enum.sum(list),
      max: Enum.max(list),
      min: Enum.min(list)
    }
  end
end

numbers = [-3, 7, 2, -1, 9, 4, 6, -5, 8, 3, 1]
result = DataPipeline.process(numbers)
IO.inspect(result, label: "Top 5 squares")
IO.inspect(DataPipeline.stats(result), label: "Stats")
`,
        stdin: '',
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  //  CLOJURE
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'clojure',
    name: 'Clojure',
    shortName: 'CLJ',
    monacoLanguage: 'clojure',
    extension: 'clj',
    filename: 'main.clj',
    engine: 'cloud',
    defaultVersion: 'Clojure 1.11',
    accentHex: '#22C55E',
    category: 'functional',
    supportsStdin: false,
    templates: [
      {
        id: 'clj-hello',
        name: 'Functional Data Transformation',
        description: 'Clojure sequences, maps and threading macros',
        code: `(ns main)

(def employees
  [{:name "Ada" :dept "Eng" :salary 95000}
   {:name "Grace" :dept "Eng" :salary 102000}
   {:name "Alan" :dept "Research" :salary 88000}
   {:name "Margaret" :dept "Eng" :salary 97000}])

(defn dept-summary [emps]
  (->> emps
       (group-by :dept)
       (map (fn [[dept members]]
              {:dept dept
               :count (count members)
               :avg (int (/ (apply + (map :salary members))
                            (count members)))}))))

(doseq [s (dept-summary employees)]
  (println (format "%-12s %d members, avg $%,d"
                   (:dept s) (:count s) (:avg s))))
`,
        stdin: '',
      },
    ],
  },
];

export function getLanguageById(id: LanguageId): LanguageDefinition {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}

export const LANGUAGE_CATEGORIES = [
  { id: 'modern',      label: 'Modern',              icon: '⚡' },
  { id: 'systems',     label: 'Systems',              icon: '⚙️' },
  { id: 'web',         label: 'Web',                  icon: '🌐' },
  { id: 'data',        label: 'Data / Science',       icon: '📊' },
  { id: 'functional',  label: 'Functional',           icon: 'λ' },
  { id: 'scripting',   label: 'Scripting',            icon: '📜' },
  { id: 'educational', label: 'Educational / Classic', icon: '🎓' },
] as const;
