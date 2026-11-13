import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { THEMES } from '../data/themes';
import type { ThemeId } from '../types/playground';

let initialized = false;

export function ensureMonacoConfigured(): void {
  if (initialized) return;
  initialized = true;

  (self as unknown as { MonacoEnvironment: MonacoEnvironment }).MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'json') return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };

  loader.config({ monaco });

  (Object.keys(THEMES) as ThemeId[]).forEach((id) => {
    monaco.editor.defineTheme(`codexforge-${id}`, THEMES[id].monacoTheme);
  });
}

interface MonacoEnvironment {
  getWorker(workerId: string, label: string): Worker;
}

export { monaco };
