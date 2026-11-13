export interface AnsiSegment {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const ANSI_FG_COLORS: Record<number, string> = {
  30: '#475569',
  31: '#f87171',
  32: '#4ade80',
  33: '#facc15',
  34: '#60a5fa',
  35: '#c084fc',
  36: '#22d3ee',
  37: '#e2e8f0',
  90: '#64748b',
  91: '#fca5a5',
  92: '#86efac',
  93: '#fde047',
  94: '#93c5fd',
  95: '#d8b4fe',
  96: '#67e8f9',
  97: '#ffffff',
};

const ANSI_BG_COLORS: Record<number, string> = {
  40: 'rgba(15, 23, 42, 0.7)',
  41: 'rgba(239, 68, 68, 0.25)',
  42: 'rgba(34, 197, 94, 0.25)',
  43: 'rgba(234, 179, 8, 0.25)',
  44: 'rgba(59, 130, 246, 0.25)',
  45: 'rgba(168, 85, 247, 0.25)',
  46: 'rgba(6, 182, 212, 0.25)',
  47: 'rgba(226, 232, 240, 0.2)',
};

export function parseAnsi(input: string): AnsiSegment[] {
  if (!input) return [];
  // Match all CSI sequences (e.g. \x1b[01;31m and \x1b[K); apply SGR ('m') and strip non-SGR control codes
  // eslint-disable-next-line no-control-regex
  const regex = /\x1b\[([0-9;?]*)([A-Za-z])/g;
  const segments: AnsiSegment[] = [];

  let state: Omit<AnsiSegment, 'text'> = {};
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), ...state });
    }

    if (match[2] === 'm') {
      const rawCodes = match[1];
      const codes = rawCodes === '' ? [0] : rawCodes.split(';').map((n) => Number(n));

      for (const code of codes) {
        if (code === 0) {
          state = {};
        } else if (code === 1) {
          state = { ...state, bold: true };
        } else if (code === 2) {
          state = { ...state, dim: true };
        } else if (code === 3) {
          state = { ...state, italic: true };
        } else if (code === 4) {
          state = { ...state, underline: true };
        } else if (code === 22) {
          state = { ...state, bold: false, dim: false };
        } else if (code === 23) {
          state = { ...state, italic: false };
        } else if (code === 24) {
          state = { ...state, underline: false };
        } else if (code === 39) {
          state = { ...state, color: undefined };
        } else if (code === 49) {
          state = { ...state, bgColor: undefined };
        } else if (ANSI_FG_COLORS[code]) {
          state = { ...state, color: ANSI_FG_COLORS[code] };
        } else if (ANSI_BG_COLORS[code]) {
          state = { ...state, bgColor: ANSI_BG_COLORS[code] };
        }
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), ...state });
  }

  return segments;
}
