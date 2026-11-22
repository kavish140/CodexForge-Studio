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

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDate(date: Date, includeTime: boolean): string {
  const datePart = `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
  if (!includeTime) return datePart;
  return `${datePart} ${padTwo(date.getHours())}:${padTwo(date.getMinutes())}:${padTwo(
    date.getSeconds(),
  )}`;
}

function installMySqlCompatibility(db: Database): void {
  db.create_function('curdate', () => formatDate(new Date(), false));
  db.create_function('current_date', () => formatDate(new Date(), false));
  db.create_function('now', () => formatDate(new Date(), true));
  db.create_function('current_timestamp', () => formatDate(new Date(), true));
  db.create_function('localtime', () => formatDate(new Date(), true));
  db.create_function('sysdate', () => formatDate(new Date(), true));
  db.create_function('utc_date', () => {
    const date = new Date();
    return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())}`;
  });
  db.create_function('utc_timestamp', () => {
    const date = new Date();
    return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(
      date.getUTCDate(),
    )} ${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())}:${padTwo(
      date.getUTCSeconds(),
    )}`;
  });
  db.create_function('user', () => 'codexforge@localhost');
  db.create_function('current_user', () => 'codexforge@localhost');
  db.create_function('session_user', () => 'codexforge@localhost');
  db.create_function('system_user', () => 'codexforge@localhost');
  db.create_function('database', () => 'codexforge');
  db.create_function('schema', () => 'codexforge');
  db.create_function('version', () => '8.0.36-CodexForge');
  db.create_function('concat', (...values: unknown[]) =>
    values.every((value) => value !== null) ? values.join('') : null,
  );
  db.create_function('concat_ws', (separator: unknown, ...values: unknown[]) =>
    values.filter((value) => value !== null).join(String(separator ?? '')),
  );
  db.create_function('if', (condition: unknown, whenTrue: unknown, whenFalse: unknown) =>
    condition ? whenTrue : whenFalse,
  );
  db.create_function('ifnull', (value: unknown, fallback: unknown) =>
    value === null || value === undefined ? fallback : value,
  );
  db.create_function('nullif', (first: unknown, second: unknown) =>
    first === second ? null : first,
  );
  db.create_function('char_length', (value: unknown) => String(value ?? '').length);
  db.create_function('character_length', (value: unknown) => String(value ?? '').length);
  db.create_function('left', (value: unknown, count: unknown) =>
    String(value ?? '').slice(0, Math.max(0, Number(count) || 0)),
  );
  db.create_function('right', (value: unknown, count: unknown) => {
    const text = String(value ?? '');
    const length = Math.max(0, Number(count) || 0);
    return length === 0 ? '' : text.slice(-length);
  });
  db.create_function('repeat', (value: unknown, count: unknown) =>
    String(value ?? '').repeat(Math.max(0, Number(count) || 0)),
  );
  db.create_function('reverse', (value: unknown) =>
    Array.from(String(value ?? '')).reverse().join(''),
  );
  db.create_function('locate', (needle: unknown, haystack: unknown, start?: unknown) => {
    const text = String(haystack ?? '');
    const from = Math.max(1, Number(start) || 1);
    const position = text.toLowerCase().indexOf(String(needle ?? '').toLowerCase(), from - 1);
    return position < 0 ? 0 : position + 1;
  });
  db.create_function('instr', (haystack: unknown, needle: unknown) => {
    const position = String(haystack ?? '').toLowerCase().indexOf(String(needle ?? '').toLowerCase());
    return position < 0 ? 0 : position + 1;
  });
  db.create_function('rand', () => Math.random());
  db.create_function('uuid', () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  });
  db.create_function('datediff', (first: unknown, second: unknown) => {
    const firstDate = new Date(String(first));
    const secondDate = new Date(String(second));
    if (Number.isNaN(firstDate.getTime()) || Number.isNaN(secondDate.getTime())) return null;
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((firstDate.getTime() - secondDate.getTime()) / millisecondsPerDay);
  });
  db.create_function('date_format', (value: unknown, format: unknown) => {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime()) && value !== null) return null;
    const pattern = String(format ?? '');
    return pattern
      .replace(/%Y/g, String(date.getFullYear()))
      .replace(/%y/g, String(date.getFullYear()).slice(-2))
      .replace(/%m/g, padTwo(date.getMonth() + 1))
      .replace(/%d/g, padTwo(date.getDate()))
      .replace(/%H/g, padTwo(date.getHours()))
      .replace(/%i/g, padTwo(date.getMinutes()))
      .replace(/%s/g, padTwo(date.getSeconds()));
  });
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
  const createDatabase = statement.match(
    /^CREATE\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s;]+)/i,
  );
  if (createDatabase) {
    ensureMySqlTables(db);
    db.run(`CREATE TABLE IF NOT EXISTS _codexforge_mysql_databases (name TEXT PRIMARY KEY);`);
    db.run(`INSERT OR IGNORE INTO _codexforge_mysql_databases (name) VALUES (?);`, [
      stripIdentifier(createDatabase[1]),
    ]);
    return [];
  }

  const dropDatabase = statement.match(
    /^DROP\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+EXISTS\s+)?([^\s;]+)/i,
  );
  if (dropDatabase) {
    ensureMySqlTables(db);
    db.run(`CREATE TABLE IF NOT EXISTS _codexforge_mysql_databases (name TEXT PRIMARY KEY);`);
    db.run(`DELETE FROM _codexforge_mysql_databases WHERE name = ?;`, [
      stripIdentifier(dropDatabase[1]),
    ]);
    return [];
  }

  if (/^USE\s+/i.test(statement)) {
    ensureMySqlTables(db);
    db.run(`CREATE TABLE IF NOT EXISTS _codexforge_mysql_databases (name TEXT PRIMARY KEY);`);
    const match = statement.match(/^USE\s+([^\s;]+)/i);
    if (match) {
      db.run(`INSERT OR IGNORE INTO _codexforge_mysql_databases (name) VALUES (?);`, [
        stripIdentifier(match[1]),
      ]);
    }
    return [];
  }

  if (/^SHOW\s+(?:DATABASES|SCHEMAS)\s*$/i.test(statement)) {
    ensureMySqlTables(db);
    db.run(`CREATE TABLE IF NOT EXISTS _codexforge_mysql_databases (name TEXT PRIMARY KEY);`);
    db.run(`INSERT OR IGNORE INTO _codexforge_mysql_databases (name) VALUES ('codexforge');`);
    return db.exec(`SELECT name AS Database FROM _codexforge_mysql_databases ORDER BY name;`);
  }

  if (/^SHOW\s+TABLES\s*$/i.test(statement)) {
    return db.exec(
      `SELECT name AS Tables_in_codexforge
       FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name NOT LIKE '_codexforge_mysql_%'
       ORDER BY name;`,
    );
  }

  const describe = statement.match(/^(?:DESCRIBE|DESC)\s+([^\s;]+)/i);
  if (describe) {
    const table = stripIdentifier(describe[1]);
    return db.exec(`PRAGMA table_info('${table.replace(/'/g, "''")}');`);
  }

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
      installMySqlCompatibility(db);
      const statements = splitSqlStatements(code);
      const results: QueryExecResult[] = [];
      let usedMySqlUserManagement = false;

      for (const statement of statements) {
        if (
          /^CREATE\s+(?:USER|ROLE|DATABASE|SCHEMA)\b|^ALTER\s+USER\b|^DROP\s+(?:USER|ROLE|DATABASE|SCHEMA)\b|^SET\s+PASSWORD\b|^GRANT\b|^REVOKE\b|^SHOW\s+(?:USERS|GRANTS|DATABASES|SCHEMAS|TABLES)\b|^USE\b|^DESCRIBE\b|^DESC\b|^FLUSH\s+PRIVILEGES\b/i.test(
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
