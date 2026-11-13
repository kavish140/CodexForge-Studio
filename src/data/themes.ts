import type * as Monaco from 'monaco-editor';
import type { AccentId, ThemeId } from '../types/playground';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  swatches: [string, string, string];
  monacoTheme: Monaco.editor.IStandaloneThemeData;
}

export interface AccentMeta {
  id: AccentId;
  name: string;
  hex: string;
  hoverHex: string;
  softRgba: string;
}

export const ACCENTS: Record<AccentId, AccentMeta> = {
  indigo: {
    id: 'indigo',
    name: 'Electric Indigo',
    hex: '#6366F1',
    hoverHex: '#4F46E5',
    softRgba: 'rgba(99, 102, 241, 0.14)',
  },
  emerald: {
    id: 'emerald',
    name: 'Precision Mint',
    hex: '#10B981',
    hoverHex: '#059669',
    softRgba: 'rgba(16, 185, 129, 0.14)',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    hex: '#06B6D4',
    hoverHex: '#0891B2',
    softRgba: 'rgba(6, 182, 212, 0.14)',
  },
  amber: {
    id: 'amber',
    name: 'Compiler Amber',
    hex: '#F59E0B',
    hoverHex: '#D97706',
    softRgba: 'rgba(245, 158, 11, 0.15)',
  },
  rose: {
    id: 'rose',
    name: 'Signal Rose',
    hex: '#F43F5E',
    hoverHex: '#E11D48',
    softRgba: 'rgba(244, 63, 94, 0.14)',
  },
};

export const THEMES: Record<ThemeId, ThemeMeta> = {
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Precision low-glare slate dark',
    isDark: true,
    swatches: ['#090B10', '#11151E', '#E2E8F0'],
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C084FC' },
        { token: 'keyword.control', foreground: 'C084FC' },
        { token: 'storage', foreground: '818CF8' },
        { token: 'type', foreground: '38BDF8' },
        { token: 'type.identifier', foreground: '38BDF8' },
        { token: 'string', foreground: '34D399' },
        { token: 'number', foreground: 'FBBF24' },
        { token: 'delimiter', foreground: '94A3B8' },
        { token: 'operator', foreground: '7DD3FC' },
        { token: 'identifier', foreground: 'E2E8F0' },
        { token: 'tag', foreground: 'F472B6' },
        { token: 'attribute.name', foreground: 'FBBF24' },
        { token: 'attribute.value', foreground: '34D399' },
      ],
      colors: {
        'editor.background': '#0B0E14',
        'editor.foreground': '#E2E8F0',
        'editor.lineHighlightBackground': '#141925',
        'editor.selectionBackground': '#2B3553',
        'editor.inactiveSelectionBackground': '#1E2538',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94A3B8',
        'editorCursor.foreground': '#818CF8',
        'editorIndentGuide.background1': '#1A2030',
        'editorIndentGuide.activeBackground1': '#2E3852',
        'editorWidget.background': '#11151E',
        'editorWidget.border': '#232A3B',
        'editorBracketMatch.background': '#232E47',
        'editorBracketMatch.border': '#6366F1',
      },
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep indigo studio night',
    isDark: true,
    swatches: ['#0A0D18', '#13182B', '#CBD5E1'],
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5B6B92', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'BB9AF7' },
        { token: 'type', foreground: '7DCFFF' },
        { token: 'type.identifier', foreground: '7DCFFF' },
        { token: 'string', foreground: '9ECE6A' },
        { token: 'number', foreground: 'FF9E64' },
        { token: 'operator', foreground: '89DDFF' },
        { token: 'identifier', foreground: 'C0CAF5' },
        { token: 'tag', foreground: 'F7768E' },
        { token: 'attribute.name', foreground: 'E0AF68' },
      ],
      colors: {
        'editor.background': '#0D1120',
        'editor.foreground': '#C0CAF5',
        'editor.lineHighlightBackground': '#161C33',
        'editor.selectionBackground': '#28345C',
        'editorLineNumber.foreground': '#455178',
        'editorLineNumber.activeForeground': '#8A9AD1',
        'editorCursor.foreground': '#7AA2F7',
        'editorIndentGuide.background1': '#19203A',
        'editorIndentGuide.activeBackground1': '#303C66',
        'editorWidget.background': '#13182B',
        'editorWidget.border': '#263052',
        'editorBracketMatch.background': '#263159',
        'editorBracketMatch.border': '#7AA2F7',
      },
    },
  },
  daylight: {
    id: 'daylight',
    name: 'Daylight',
    description: 'Crisp studio light mode',
    isDark: false,
    swatches: ['#F8FAFC', '#FFFFFF', '#0F172A'],
    monacoTheme: {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7C3AED' },
        { token: 'type', foreground: '0284C7' },
        { token: 'type.identifier', foreground: '0284C7' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'D97706' },
        { token: 'operator', foreground: '0369A1' },
        { token: 'identifier', foreground: '0F172A' },
        { token: 'tag', foreground: 'DB2777' },
        { token: 'attribute.name', foreground: 'B45309' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#0F172A',
        'editor.lineHighlightBackground': '#F1F5F9',
        'editor.selectionBackground': '#DBEAFE',
        'editorLineNumber.foreground': '#94A3B8',
        'editorLineNumber.activeForeground': '#334155',
        'editorCursor.foreground': '#4F46E5',
        'editorIndentGuide.background1': '#E2E8F0',
        'editorIndentGuide.activeBackground1': '#CBD5E1',
        'editorWidget.background': '#FFFFFF',
        'editorWidget.border': '#E2E8F0',
        'editorBracketMatch.background': '#E0E7FF',
        'editorBracketMatch.border': '#6366F1',
      },
    },
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum legibility & sharp edges',
    isDark: true,
    swatches: ['#000000', '#0A0A0A', '#FFFFFF'],
    monacoTheme: {
      base: 'hc-black',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '9CA3AF', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F472B6' },
        { token: 'type', foreground: '38BDF8' },
        { token: 'string', foreground: '4ADE80' },
        { token: 'number', foreground: 'FACC15' },
        { token: 'identifier', foreground: 'FFFFFF' },
      ],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#FFFFFF',
        'editor.lineHighlightBackground': '#141414',
        'editor.selectionBackground': '#2563EB',
        'editorLineNumber.foreground': '#737373',
        'editorLineNumber.activeForeground': '#FFFFFF',
        'editorCursor.foreground': '#FACC15',
        'editorIndentGuide.background1': '#262626',
        'editorIndentGuide.activeBackground1': '#525252',
        'editorWidget.background': '#0A0A0A',
        'editorWidget.border': '#525252',
      },
    },
  },
};
