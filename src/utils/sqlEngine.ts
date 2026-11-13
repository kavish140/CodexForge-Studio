import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import type { ExecutionResult, SqlTableResult } from '../types/playground';

let sqlPromise: Promise<SqlJsStatic> | null = null;

function getSqlInstance(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => wasmUrl,
    });
  }
  return sqlPromise;
}

export async function executeSqlBrowser(runId: string, code: string): Promise<ExecutionResult> {
  const start = performance.now();

  try {
    const SQL = await getSqlInstance();
    const db = new SQL.Database();

    try {
      const results = db.exec(code);
      const elapsed = Math.max(1, Math.round(performance.now() - start));

      const tables: SqlTableResult[] = results.map((res) => ({
        columns: res.columns,
        values: res.values,
        rowCount: res.values.length,
      }));

      const summaryLines: string[] = [];
      if (tables.length === 0) {
        summaryLines.push('Query executed successfully. No result sets returned.');
      } else {
        tables.forEach((tbl, idx) => {
          summaryLines.push(
            `Result set #${idx + 1}: ${tbl.rowCount} row${tbl.rowCount === 1 ? '' : 's'} × ${tbl.columns.length} column${tbl.columns.length === 1 ? '' : 's'}`,
          );
        });
      }

      return {
        runId,
        status: 'success',
        engine: 'browser',
        stdout: summaryLines.join('\n'),
        stderr: '',
        compilerOutput: '',
        exitCode: 0,
        compileTimeMs: null,
        runTimeMs: elapsed,
        diagnostics: [],
        runtimeVersion: 'SQLite WASM',
        sqlTables: tables,
        timestamp: Date.now(),
      };
    } finally {
      db.close();
    }
  } catch (err) {
    const elapsed = Math.max(1, Math.round(performance.now() - start));
    const message = err instanceof Error ? err.message : String(err);
    return {
      runId,
      status: 'runtime_error',
      engine: 'browser',
      stdout: '',
      stderr: message,
      compilerOutput: '',
      exitCode: 1,
      compileTimeMs: null,
      runTimeMs: elapsed,
      diagnostics: [{ line: 1, column: 1, severity: 'error', message, source: 'sqlite' }],
      runtimeVersion: 'SQLite WASM',
      timestamp: Date.now(),
    };
  }
}
