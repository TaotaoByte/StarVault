export type QueryParams = (string | number | null | Uint8Array)[];

export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

export interface DatabaseAdapter {
  exec(sql: string, params?: QueryParams): void;
  query<T = Record<string, unknown>>(sql: string, params?: QueryParams): T[];
  querySingle<T = Record<string, unknown>>(sql: string, params?: QueryParams): T | undefined;
  close(): void;
  export(): Uint8Array;
}

export function rowToObject<T>(columns: string[], row: unknown[]): T {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[i];
  }
  return obj as T;
}
