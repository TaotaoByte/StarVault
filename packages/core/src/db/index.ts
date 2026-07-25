import { MIGRATIONS, FTS5_MIGRATIONS } from './schema.js';
import type { DatabaseAdapter } from './adapter.js';

export * from './adapter.js';
export * from './sqljs.js';
export * from './repository.js';
export { MIGRATIONS, FTS5_MIGRATIONS } from './schema.js';

export async function migrate(adapter: DatabaseAdapter): Promise<void> {
  // Migrations are idempotent; continue on individual failures so optional
  // schema upgrades (e.g. ALTER TABLE ADD COLUMN IF NOT EXISTS) do not block
  // older databases from starting up.
  for (const migration of MIGRATIONS) {
    try {
      adapter.exec(migration);
    } catch {
      // ignore single migration failures
    }
  }
  // FTS5 is optional; default sql.js builds do not include the extension.
  try {
    for (const migration of FTS5_MIGRATIONS) {
      adapter.exec(migration);
    }
  } catch {
    // ignore fts5 failures
  }
}

export async function migrateWithLogging(adapter: DatabaseAdapter): Promise<string[]> {
  const logs: string[] = [];
  for (let i = 0; i < MIGRATIONS.length; i++) {
    try {
      adapter.exec(MIGRATIONS[i]);
      logs.push(`migration ${i}: ok`);
    } catch (err) {
      logs.push(`migration ${i}: ${(err as Error).message}`);
    }
  }
  try {
    for (const migration of FTS5_MIGRATIONS) {
      adapter.exec(migration);
    }
    logs.push('fts5: ok');
  } catch (err) {
    logs.push(`fts5: ${(err as Error).message}`);
  }
  return logs;
}

export async function openDatabase(
  factory: () => Promise<DatabaseAdapter>
): Promise<DatabaseAdapter> {
  const adapter = await factory();
  await migrate(adapter);
  return adapter;
}
