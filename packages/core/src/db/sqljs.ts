import initSqlJs, { type Database, type SqlJsConfig } from 'sql.js';
import type { DatabaseAdapter, QueryParams } from './adapter.js';
import { rowToObject } from './adapter.js';

export interface SqlJsAdapterOptions {
  locateFile?: (file: string) => string;
  data?: Uint8Array | ArrayBuffer;
}

export class SqlJsAdapter implements DatabaseAdapter {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  static async create(options: SqlJsAdapterOptions = {}): Promise<SqlJsAdapter> {
    const config: SqlJsConfig = {};
    if (options.locateFile) {
      config.locateFile = options.locateFile;
    }
    const SQL = await initSqlJs(config);
    const data = options.data
      ? options.data instanceof ArrayBuffer
        ? new Uint8Array(options.data)
        : options.data
      : undefined;
    const db = data ? new SQL.Database(data) : new SQL.Database();
    return new SqlJsAdapter(db);
  }

  exec(sql: string, params: QueryParams = []): void {
    this.db.run(sql, params);
  }

  query<T = Record<string, unknown>>(sql: string, params: QueryParams = []): T[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(rowToObject<T>(stmt.getColumnNames(), stmt.get() as unknown[]));
    }
    stmt.free();
    return results;
  }

  querySingle<T = Record<string, unknown>>(sql: string, params: QueryParams = []): T | undefined {
    const rows = this.query<T>(sql, params);
    return rows[0];
  }

  close(): void {
    this.db.close();
  }

  export(): Uint8Array {
    return this.db.export();
  }
}
