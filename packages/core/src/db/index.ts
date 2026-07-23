import { MIGRATIONS } from './schema.js';
import type { DatabaseAdapter } from './adapter.js';

export * from './adapter.js';
export * from './sqljs.js';
export * from './repository.js';
export { MIGRATIONS } from './schema.js';

export async function migrate(adapter: DatabaseAdapter): Promise<void> {
  for (const migration of MIGRATIONS) {
    adapter.exec(migration);
  }
}

export async function openDatabase(
  factory: () => Promise<DatabaseAdapter>
): Promise<DatabaseAdapter> {
  const adapter = await factory();
  await migrate(adapter);
  return adapter;
}
