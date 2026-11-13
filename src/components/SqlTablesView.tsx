import { Table2 } from 'lucide-react';
import type { SqlTableResult } from '../types/playground';

interface SqlTablesViewProps {
  tables: SqlTableResult[];
}

function formatCell(val: string | number | null | Uint8Array): string {
  if (val === null) return 'NULL';
  if (val instanceof Uint8Array) return `<BLOB ${val.byteLength}B>`;
  return String(val);
}

export function SqlTablesView({ tables }: SqlTablesViewProps) {
  if (tables.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        <Table2 className="h-6 w-6 opacity-45" />
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          No SQL result tables yet
        </div>
        <p className="max-w-xs text-[11px]">
          Run a <code className="font-mono-code">SELECT</code> query to inspect structured result
          tables here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3.5">
      {tables.map((table, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-lg border"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <div
            className="flex items-center justify-between border-b px-3 py-1.5 text-[11px]"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Result Set #{idx + 1}
            </span>
            <span className="font-mono-code" style={{ color: 'var(--text-muted)' }}>
              {table.rowCount} {table.rowCount === 1 ? 'row' : 'rows'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono-code text-xs">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  {table.columns.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      className="px-3 py-2 text-[11px] font-semibold whitespace-nowrap"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.values.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b last:border-b-0 hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    {row.map((cell, cIdx) => {
                      const isNull = cell === null;
                      const isNumber = typeof cell === 'number';
                      return (
                        <td
                          key={cIdx}
                          className="px-3 py-1.5 whitespace-nowrap"
                          style={{
                            color: isNull
                              ? 'var(--text-muted)'
                              : isNumber
                                ? '#38BDF8'
                                : 'var(--text-primary)',
                            fontStyle: isNull ? 'italic' : undefined,
                          }}
                        >
                          {formatCell(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
