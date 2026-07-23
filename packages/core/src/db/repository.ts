import type { Collection, Embedding, Item, Tag } from '../types/index.js';
import { now, stringifyJson } from '../utils/index.js';
import type { DatabaseAdapter } from './adapter.js';

export class Repository {
  constructor(private adapter: DatabaseAdapter) {}

  // Items
  insertItem(item: Item): void {
    this.adapter.exec(
      `INSERT INTO items (id, type, source_url, title, description,
        github_owner, github_repo, github_stars, github_forks, github_language,
        github_topics, readme_content, readme_summary, last_sync_at, icon_url,
        screenshot_urls, notes, created_at, updated_at, user_created, is_archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.type,
        item.sourceUrl,
        item.title,
        item.description,
        item.githubOwner,
        item.githubRepo,
        item.githubStars,
        item.githubForks,
        item.githubLanguage,
        stringifyJson(item.githubTopics),
        item.readmeContent,
        item.readmeSummary,
        item.lastSyncAt,
        item.iconUrl,
        stringifyJson(item.screenshotUrls),
        item.notes,
        item.createdAt,
        item.updatedAt,
        item.userCreated ? 1 : 0,
        item.isArchived ? 1 : 0,
      ]
    );
  }

  updateItem(item: Partial<Item> & { id: string }): void {
    const fields: string[] = [];
    const values: (string | number | null | Uint8Array)[] = [];
    const map: Record<string, string | number | null | Uint8Array | undefined> = {
      type: item.type,
      source_url: item.sourceUrl,
      title: item.title,
      description: item.description,
      github_owner: item.githubOwner,
      github_repo: item.githubRepo,
      github_stars: item.githubStars,
      github_forks: item.githubForks,
      github_language: item.githubLanguage,
      github_topics: item.githubTopics !== undefined ? stringifyJson(item.githubTopics) : undefined,
      readme_content: item.readmeContent,
      readme_summary: item.readmeSummary,
      last_sync_at: item.lastSyncAt,
      icon_url: item.iconUrl,
      screenshot_urls: item.screenshotUrls !== undefined ? stringifyJson(item.screenshotUrls) : undefined,
      notes: item.notes,
      updated_at: now(),
      user_created: item.userCreated !== undefined ? (item.userCreated ? 1 : 0) : undefined,
      is_archived: item.isArchived !== undefined ? (item.isArchived ? 1 : 0) : undefined,
    };
    for (const [key, value] of Object.entries(map)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    this.adapter.exec(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, [...values, item.id]);
  }

  getItems(): Item[] {
    const rows = this.adapter.query<RawItem>(
      `SELECT id, type, source_url as sourceUrl, title, description,
              github_owner as githubOwner, github_repo as githubRepo,
              github_stars as githubStars, github_forks as githubForks,
              github_language as githubLanguage, github_topics as githubTopics,
              readme_content as readmeContent, readme_summary as readmeSummary,
              last_sync_at as lastSyncAt, icon_url as iconUrl,
              screenshot_urls as screenshotUrls, notes,
              created_at as createdAt, updated_at as updatedAt,
              user_created as userCreated, is_archived as isArchived
       FROM items WHERE is_archived = 0 ORDER BY updated_at DESC`
    );
    return rows.map(row => this.toItem(row));
  }

  getItemsWithTags(): Item[] {
    return this.getItems().map(item => ({ ...item, tags: this.getItemTags(item.id) }));
  }

  getItemByGithub(owner: string, repo: string): Item | undefined {
    const row = this.adapter.querySingle<RawItem>(
      `SELECT id, type, source_url as sourceUrl, title, description,
              github_owner as githubOwner, github_repo as githubRepo,
              github_stars as githubStars, github_forks as githubForks,
              github_language as githubLanguage, github_topics as githubTopics,
              readme_content as readmeContent, readme_summary as readmeSummary,
              last_sync_at as lastSyncAt, icon_url as iconUrl,
              screenshot_urls as screenshotUrls, notes,
              created_at as createdAt, updated_at as updatedAt,
              user_created as userCreated, is_archived as isArchived
       FROM items WHERE github_owner = ? AND github_repo = ?`,
      [owner, repo]
    );
    return row ? this.toItem(row) : undefined;
  }

  archiveItem(id: string): void {
    this.adapter.exec('UPDATE items SET is_archived = 1, updated_at = ? WHERE id = ?', [now(), id]);
  }

  // Tags
  createTag(tag: Tag): void {
    this.adapter.exec(
      'INSERT INTO tags (id, name, color, description, parent_id, is_ai_generated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tag.id, tag.name, tag.color, tag.description, tag.parentId, tag.isAiGenerated ? 1 : 0, tag.createdAt]
    );
  }

  getTagByName(name: string): Tag | undefined {
    return this.adapter.querySingle<Tag>(
      `SELECT id, name, color, description, parent_id as parentId, is_ai_generated as isAiGenerated, created_at as createdAt
       FROM tags WHERE name = ?`,
      [name]
    );
  }

  getTags(): Tag[] {
    return this.adapter.query<Tag>(
      `SELECT id, name, color, description, parent_id as parentId, is_ai_generated as isAiGenerated, created_at as createdAt
       FROM tags ORDER BY name`
    );
  }

  addTagToItem(itemId: string, tagId: string, confidence = 1.0): void {
    this.adapter.exec('INSERT OR IGNORE INTO item_tags (item_id, tag_id, confidence) VALUES (?, ?, ?)', [
      itemId,
      tagId,
      confidence,
    ]);
  }

  getItemTags(itemId: string): string[] {
    const rows = this.adapter.query<{ name: string }>(
      `SELECT t.name FROM tags t
       JOIN item_tags it ON it.tag_id = t.id
       WHERE it.item_id = ?`,
      [itemId]
    );
    return rows.map(r => r.name);
  }

  // Collections
  createCollection(collection: Collection): void {
    this.adapter.exec(
      'INSERT INTO collections (id, name, icon, color, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        collection.id,
        collection.name,
        collection.icon,
        collection.color,
        collection.parentId,
        collection.sortOrder,
        collection.createdAt,
      ]
    );
  }

  getCollections(): Collection[] {
    return this.adapter.query<Collection>(
      `SELECT id, name, icon, color, parent_id as parentId, sort_order as sortOrder, created_at as createdAt
       FROM collections ORDER BY sort_order, name`
    );
  }

  addItemToCollection(itemId: string, collectionId: string): void {
    this.adapter.exec('INSERT OR IGNORE INTO item_collections (item_id, collection_id) VALUES (?, ?)', [
      itemId,
      collectionId,
    ]);
  }

  // Embeddings
  upsertEmbedding(embedding: Embedding): void {
    const bytes = new Uint8Array(embedding.embedding.buffer);
    this.adapter.exec(
      `INSERT INTO embeddings (item_id, embedding, model, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         embedding = excluded.embedding,
         model = excluded.model,
         updated_at = excluded.updated_at`,
      [embedding.itemId, bytes, embedding.model, embedding.updatedAt]
    );
  }

  getEmbedding(itemId: string): Embedding | undefined {
    const row = this.adapter.querySingle<{
      itemId: string;
      embedding: Uint8Array;
      model: string;
      updatedAt: string;
    }>(
      `SELECT item_id as itemId, embedding, model, updated_at as updatedAt
       FROM embeddings WHERE item_id = ?`,
      [itemId]
    );
    if (!row) return undefined;
    return {
      itemId: row.itemId,
      embedding: new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4),
      model: row.model,
      updatedAt: row.updatedAt,
    };
  }

  getAllEmbeddings(): Embedding[] {
    const rows = this.adapter.query<{
      itemId: string;
      embedding: Uint8Array;
      model: string;
      updatedAt: string;
    }>(
      `SELECT item_id as itemId, embedding, model, updated_at as updatedAt FROM embeddings`
    );
    return rows.map(row => ({
      itemId: row.itemId,
      embedding: new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4),
      model: row.model,
      updatedAt: row.updatedAt,
    }));
  }

  // Sync meta
  getSyncMeta(): { deviceId: string; schemaVersion: number } | undefined {
    return this.adapter.querySingle<{ deviceId: string; schemaVersion: number }>(
      'SELECT device_id as deviceId, schema_version as schemaVersion FROM sync_meta WHERE id = 1'
    );
  }

  private toItem(row: RawItem): Item {
    return {
      id: row.id,
      type: row.type as Item['type'],
      sourceUrl: row.sourceUrl,
      title: row.title,
      description: row.description,
      githubOwner: row.githubOwner,
      githubRepo: row.githubRepo,
      githubStars: row.githubStars,
      githubForks: row.githubForks,
      githubLanguage: row.githubLanguage,
      githubTopics: parseJson(row.githubTopics, []),
      readmeContent: row.readmeContent,
      readmeSummary: row.readmeSummary,
      lastSyncAt: row.lastSyncAt,
      iconUrl: row.iconUrl,
      screenshotUrls: parseJson(row.screenshotUrls, []),
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userCreated: Boolean(row.userCreated),
      isArchived: Boolean(row.isArchived),
    };
  }
}

interface RawItem {
  id: string;
  type: string;
  sourceUrl: string;
  title: string;
  description: string | null;
  githubOwner: string | null;
  githubRepo: string | null;
  githubStars: number;
  githubForks: number;
  githubLanguage: string | null;
  githubTopics: string;
  readmeContent: string | null;
  readmeSummary: string | null;
  lastSyncAt: string | null;
  iconUrl: string | null;
  screenshotUrls: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userCreated: number;
  isArchived: number;
}

function parseJson(value: string | null, fallback: string[]): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
