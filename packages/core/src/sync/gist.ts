import type { SyncPayload } from '../types/index.js';
import type { Repository } from '../db/repository.js';
import type { SyncEngine, SyncResult } from './index.js';
import { sha256 } from '../utils/index.js';

export interface GistSyncEngineOptions {
  token: string;
  gistId?: string;
}

export class GistSyncEngine implements SyncEngine {
  private token: string;
  private gistId?: string;

  constructor(options: GistSyncEngineOptions) {
    this.token = options.token;
    this.gistId = options.gistId;
  }

  private get headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  async sync(repo: Repository, deviceId: string): Promise<SyncResult> {
    const local = this.buildData(repo);
    let remote: SyncPayload | undefined;
    let pulled = 0;

    if (this.gistId) {
      remote = await this.fetchGist(this.gistId);
      if (remote) {
        const merged = this.mergeData(local, remote.data);
        this.applyData(repo, merged);
        pulled = remote.data.items.length;
      }
    }

    const finalData = this.buildData(repo);
    const payload = await this.buildPayload(finalData, deviceId);

    if (this.gistId) {
      await this.updateGist(this.gistId, payload);
    } else {
      const created = await this.createGist(payload);
      this.gistId = created.id;
    }

    return {
      success: true,
      pushed: finalData.items.length,
      pulled,
      conflicts: [],
    };
  }

  getGistId(): string | undefined {
    return this.gistId;
  }

  private async fetchGist(gistId: string): Promise<SyncPayload | undefined> {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: this.headers,
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { files: Record<string, { content: string }> };
    const content = json.files['data_v1.json']?.content;
    if (!content) return undefined;
    try {
      return JSON.parse(content) as SyncPayload;
    } catch {
      return undefined;
    }
  }

  private async createGist(payload: SyncPayload): Promise<{ id: string }> {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        description: 'StarVault sync data',
        public: false,
        files: {
          'data_v1.json': { content: JSON.stringify(payload, null, 2) },
          'changelog_v1.json': { content: '[]' },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gist create failed: ${res.status} ${text}`);
    }
    return (await res.json()) as { id: string };
  }

  private async updateGist(gistId: string, payload: SyncPayload): Promise<void> {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        files: {
          'data_v1.json': { content: JSON.stringify(payload, null, 2) },
          'changelog_v1.json': { content: JSON.stringify(payload.changelog.changes, null, 2) },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gist update failed: ${res.status} ${text}`);
    }
  }

  private buildData(repo: Repository): SyncPayload['data'] {
    return {
      items: repo.getItems(),
      tags: repo.getTags(),
      collections: repo.getCollections(),
    };
  }

  private applyData(repo: Repository, data: SyncPayload['data']): void {
    for (const item of data.items) {
      const existing = repo.getItemByGithub(item.githubOwner ?? '', item.githubRepo ?? '');
      if (existing) {
        repo.updateItem({ ...item, id: existing.id });
      } else {
        repo.insertItem(item);
      }
    }
    for (const tag of data.tags) {
      if (!repo.getTagByName(tag.name)) {
        repo.createTag(tag);
      }
    }
  }

  private mergeData(
    local: SyncPayload['data'],
    remote: SyncPayload['data']
  ): SyncPayload['data'] {
    const items = this.mergeById(local.items, remote.items);
    const tags = this.mergeById(local.tags, remote.tags);
    const collections = this.mergeById(local.collections, remote.collections);
    return { items, tags, collections };
  }

  private mergeById<T extends { id: string; updatedAt?: string }>(local: T[], remote: T[]): T[] {
    const map = new Map(local.map(i => [i.id, i]));
    for (const item of remote) {
      const existing = map.get(item.id);
      if (
        !existing ||
        (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt))
      ) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }

  private async buildPayload(data: SyncPayload['data'], deviceId: string): Promise<SyncPayload> {
    const content = JSON.stringify(data);
    return {
      version: 1,
      deviceId,
      timestamp: new Date().toISOString(),
      checksum: await sha256(content),
      data,
      changelog: {
        fromVersion: 1,
        toVersion: 1,
        changes: [],
      },
    };
  }
}
