import { Terminal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TerminalViewProps {
  workspaceId?: string;
  workspaceName?: string;
  onNotify: (message: string) => void;
}

export function TerminalView({ workspaceId, workspaceName, onNotify }: TerminalViewProps) {
  const [lines, setLines] = useState<string[]>(['CodexForge workspace terminal ready.', '']);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState('.');
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const execute = async () => {
    const trimmed = command.trim();
    if (!trimmed || !workspaceId || running) return;
    setRunning(true);
    setHistory((prev) => [...prev, trimmed].slice(-50));
    setHistoryIndex(-1);
    setLines((prev) => [...prev, `$ ${trimmed}`]);
    setCommand('');

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, timeoutMs: 10000 }),
      });
      const data = (await response.json()) as {
        stdout?: string;
        stderr?: string;
        cwd?: string;
        exitCode?: number | null;
        error?: string;
      };
      if (!response.ok) {
        setLines((prev) => [...prev, data.error ?? `Command failed (${response.status})`]);
      } else {
        const output = [data.stdout?.replace(/\r/g, ''), data.stderr?.replace(/\r/g, '')]
          .filter((part) => part && part.length > 0)
          .join('\n');
        setLines((prev) => [
          ...prev,
          ...(output ? output.split('\n') : []),
          typeof data.exitCode === 'number' && data.exitCode !== 0 ? `[exit ${data.exitCode}]` : '',
        ].filter((line, index, arr) => !(line === '' && index === arr.length - 1)));
        if (data.cwd) setCwd(data.cwd);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terminal request failed';
      setLines((prev) => [...prev, message]);
      onNotify('Terminal request failed');
    } finally {
      setRunning(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{ backgroundColor: 'var(--bg-editor)', color: 'var(--text-primary)' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div
        className="flex h-7 shrink-0 items-center justify-between border-b px-2.5"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          <Terminal className="h-3 w-3" style={{ color: 'var(--accent)' }} />
          {workspaceName ?? 'Workspace'}
        </span>
        <button
          type="button"
          onClick={() => setLines(['Terminal cleared.', ''])}
          className="rounded p-1 hover:bg-[var(--bg-hover)]"
          title="Clear terminal"
          style={{ color: 'var(--text-muted)' }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono-code text-[12px] leading-5">
        {lines.map((line, index) => (
          <div
            key={`${index}-${line}`}
            className="whitespace-pre-wrap"
            style={{ color: line.startsWith('$') ? 'var(--accent)' : 'var(--text-primary)' }}
          >
            {line || '\u00a0'}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t px-3 py-2 font-mono-code text-[12px]" style={{ borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--accent)' }}>{cwd || '.'}</span>
        <span style={{ color: 'var(--text-muted)' }}>$</span>
        <input
          ref={inputRef}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void execute();
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
              setHistoryIndex(next);
              setCommand(history[next] ?? '');
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              const next = historyIndex < 0 ? -1 : Math.min(history.length - 1, historyIndex + 1);
              setHistoryIndex(next);
              setCommand(next >= 0 ? history[next] : '');
            }
          }}
          disabled={!workspaceId || running}
          placeholder={workspaceId ? 'Enter a command...' : 'Select or create a workspace'}
          className="min-w-0 flex-1 border-0 bg-transparent outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}
