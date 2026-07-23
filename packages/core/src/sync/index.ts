import type { SyncPayload, ChangeRecord } from '../types/index.js';
import type { Repository } from '../db/repository.js';

export * from './gist.js';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts?: string[];
}

export interface SyncEngine {
  sync(repo: Repository, deviceId: string): Promise<SyncResult>;
}

export function applyChanges<T extends { id: string; updated_at?: string }>(
  base: T[],
  changes: ChangeRecord[]
): T[] {
  const map = new Map(base.map(i => [i.id, i]));
  for (const change of changes) {
    if (change.operation === 'DELETE') {
      map.delete(change.recordId);
    } else if (change.newData) {
      map.set(change.recordId, change.newData as T);
    }
  }
  return Array.from(map.values());
}

export function mergeItems<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[]
): T[] {
  const map = new Map(local.map(i => [i.id, i]));
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export function buildSyncPayload(
  data: SyncPayload['data'],
  deviceId: string,
  changes: ChangeRecord[]
): SyncPayload {
  return {
    version: 1,
    deviceId,
    timestamp: new Date().toISOString(),
    checksum: '',
    data,
    changelog: {
      fromVersion: 1,
      toVersion: 1,
      changes,
    },
  };
}
