import initSqlJs, { type Database, type QueryExecResult, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import type { ExecutionResult, SqlTableResult } from '../types/playground';

let sqlPromise: Promise<SqlJsStatic> | null = null;

interface MySqlAccount {
  user: string;
  host: string;
}

function splitSqlStatements(code: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: "'" | '"' | '`' | null = null;

  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];
    if (quote) {
      current += char;
      if (char === quote) {
        if (code[i + 1] === quote) {
          current += code[++i];
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      current += char;
    } else if (char === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function stripIdentifier(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseAccount(value: string): MySqlAccount {
  const trimmed = value.trim();
  const separator = trimmed.indexOf('@');
  if (separator >= 0) {
    return {
      user: stripIdentifier(trimmed.slice(0, separator)),
      host: stripIdentifier(trimmed.slice(separator + 1)),
    };
  }
  return { user: stripIdentifier(trimmed), host: '%' };
}

function parsePassword(statement: string): string {
  const match = statement.match(
    /IDENTIFIED\s+(?:WITH\s+\S+\s+)?BY\s+(?:PASSWORD\s*\(\s*)?(?:'([^']*)'|"([^"]*)"|([^;\s]+))/i,
  );
  if (!match) return '';
  return match[1] ?? match[2] ?? stripIdentifier(match[3].replace(/\)$/, ''));
}

function ensureMySqlTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _codexforge_mysql_users (
      user TEXT NOT NULL,
      host TEXT NOT NULL,
      password TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user, host)
    );
    CREATE TABLE IF NOT EXISTS _codexforge_mysql_roles (
      role TEXT NOT NULL,
      host TEXT NOT NULL,
      PRIMARY KEY (role, host)
    );
    CREATE TABLE IF NOT EXISTS _codexforge_mysql_grants (
      user TEXT NOT NULL,
      host TEXT NOT NULL,
      privileges TEXT NOT NULL,
      object TEXT NOT NULL
    );
  `);
}

function splitCommaSeparated(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: "'" | '"' | '`' | null = null;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      current += char;
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
      current += char;
    } else if (char === ',') {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function executeMySqlStatement(db: Database, statement: string): QueryExecResult[] {
  const createUser = statement.match(
    /^CREATE\s+USER\s+(?:IF\s+NOT\s+EXISTS\s+)?(.+?)(?:\s+IDENTIFIED\b|$)/i,
  );
  if (createUser) {
    ensureMySqlTables(db);
    const password = parsePassword(statement);
    for (const accountValue of splitCommaSeparated(createUser[1])) {
      const account = parseAccount(accountValue);
      db.run(
        `INSERT OR IGNORE INTO _codexforge_mysql_users (user, host, password) VALUES (?, ?, ?);`,
        [account.user, account.host, password],
      );
    }
    return [];
  }

  const alterUser = statement.match(
    /^ALTER\s+USER\s+(?:IF\s+EXISTS\s+)?(.+?)(?:\s+IDENTIFIED\b|$)/i,
  );
  if (alterUser) {
    ensureMySqlTables(db);
    const password = parsePassword(statement);
    for (const accountValue of splitCommaSeparated(alterUser[1])) {
      const account = parseAccount(accountValue);
      db.run(
        `UPDATE _codexforge_mysql_users SET password = ? WHERE user = ? AND host = ?;`,
        [password, account.user, account.host],
      );
    }
    return [];
  }

  const dropUser = statement.match(/^DROP\s+USER\s+(?:IF\s+EXISTS\s+)?(.+)$/i);
  if (dropUser) {
    ensureMySqlTables(db);
    for (const accountValue of splitCommaSeparated(dropUser[1])) {
      const account = parseAccount(accountValue);
      db.run(`DELETE FROM _codexforge_mysql_users WHERE user = ? AND host = ?;`, [
        account.user,
        account.host,
      ]);
      db.run(`DELETE FROM _codexforge_mysql_grants WHERE user = ? AND host = ?;`, [
        account.user,
        account.host,
      ]);
    }
    return [];
  }

  const setPassword = statement.match(
    /^SET\s+PASSWORD\s+(?:FOR\s+(.+?)\s*)?=\s*(?:PASSWORD\s*\(\s*)?(?:'([^']*)'|"([^"]*)"|([^)\s]+))\)?\s*$/i,
  );
  if (setPassword) {
    ensureMySqlTables(db);
    const password = setPassword[2] ?? setPassword[3] ?? stripIdentifier(setPassword[4] ?? '');
    const account = parseAccount(setPassword[1] ?? 'CURRENT_USER');
    if (account.user === 'CURRENT_USER') {
      db.run(`UPDATE _codexforge_mysql_users SET password = ? WHERE 1=0;`, [password]);
    } else {
      db.run(`UPDATE _codexforge_mysql_users SET password = ? WHERE user = ? AND host = ?;`, [
        password,
        account.user,
        account.host,
      ]);
    }
    return [];
  }

  const grant = statement.match(
    /^GRANT\s+(.+?)\s+ON\s+(.+?)\s+TO\s+(.+?)(?:\s+WITH\s+.+)?$/i,
  );
  if (grant) {
    ensureMySqlTables(db);
    const privilege = grant[1].trim();
    const object = grant[2].trim();
    for (const accountValue of splitCommaSeparated(grant[3])) {
      const account = parseAccount(accountValue.replace(/\s+(?:IDENTIFIED\s+BY\s+.+)$/i, '').trim());
      db.run(
        `INSERT INTO _codexforge_mysql_grants (user, host, privileges, object) VALUES (?, ?, ?, ?);`,
        [account.user, account.host, privilege, object],
      );
    }
    return [];
  }

  const revoke = statement.match(
    /^REVOKE\s+(.+?)\s+ON\s+(.+?)\s+FROM\s+(.+)$/i,
  );
  if (revoke) {
    ensureMySqlTables(db);
    const privilege = revoke[1].trim();
    const object = revoke[2].trim();
    for (const accountValue of splitCommaSeparated(revoke[3])) {
      const account = parseAccount(accountValue);
      db.run(
        `DELETE FROM _codexforge_mysql_grants WHERE user = ? AND host = ? AND privileges = ? AND object = ?;`,
        [account.user, account.host, privilege, object],
      );
    }
    return [];
  }

  if (/^SHOW\s+USERS\s*$/i.test(statement)) {
    ensureMySqlTables(db);
    return db.exec(
      `SELECT user AS User, host AS Host FROM _codexforge_mysql_users ORDER BY user, host;`,
    );
  }

  const showGrants = statement.match(/^SHOW\s+GRANTS(?:\s+FOR\s+(.+))?\s*$/i);
  if (showGrants) {
    ensureMySqlTables(db);
    if (showGrants[1]) {
      const account = parseAccount(showGrants[1]);
      return db.exec(
        `SELECT privileges || ' ON ' || object || ' TO ' || ${sqlString(account.user)} AS Grants
         FROM _codexforge_mysql_grants
         WHERE user = ${sqlString(account.user)} AND host = ${sqlString(account.host)};`,
      );
    }
    return db.exec(
      `SELECT user || '@' || host AS Account,
              privileges || ' ON ' || object AS Grant
       FROM _codexforge_mysql_grants
       ORDER BY user, host, privileges, object;`,
    );
  }

  const createRole = statement.match(
    /^CREATE\s+ROLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(.+)$/i,
  );
  if (createRole) {
    ensureMySqlTables(db);
    for (const accountValue of splitCommaSeparated(createRole[1])) {
      const account = parseAccount(accountValue);
      db.run(`INSERT OR IGNORE INTO _codexforge_mysql_roles (role, host) VALUES (?, ?);`, [
        account.user,
        account.host,
      ]);
    }
    return [];
  }

  const dropRole = statement.match(/^DROP\s+ROLE\s+(?:IF\s+EXISTS\s+)?(.+)$/i);
  if (dropRole) {
    ensureMySqlTables(db);
    for (const accountValue of splitCommaSeparated(dropRole[1])) {
      const account = parseAccount(accountValue);
      db.run(`DELETE FROM _codexforge_mysql_roles WHERE role = ? AND host = ?;`, [
        account.user,
        account.host,
      ]);
    }
    return [];
  }

  if (/^(FLUSH\s+PRIVILEGES|CREATE\s+ROLE\b|DROP\s+ROLE\b)/i.test(statement)) {
    ensureMySqlTables(db);
    return [];
  }

  return db.exec(statement);
}


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
      const statements = splitSqlStatements(code);
      const results: QueryExecResult[] = [];
      let usedMySqlUserManagement = false;

      for (const statement of statements) {
        if (
          /^CREATE\s+(?:USER|ROLE)\b|^ALTER\s+USER\b|^DROP\s+(?:USER|ROLE)\b|^SET\s+PASSWORD\b|^GRANT\b|^REVOKE\b|^SHOW\s+(?:USERS|GRANTS)\b|^FLUSH\s+PRIVILEGES\b/i.test(
            statement,
          )
        ) {
          usedMySqlUserManagement = true;
        }
        results.push(...executeMySqlStatement(db, statement));
      }

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
        runtimeVersion: usedMySqlUserManagement
          ? 'SQLite WASM + MySQL user management'
          : 'SQLite WASM',
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
