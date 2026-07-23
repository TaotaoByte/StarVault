export type ItemType = 'github' | 'website' | 'software' | 'tool';

export interface Item {
  id: string;
  type: ItemType;
  sourceUrl: string;
  title: string;
  description: string | null;

  // GitHub specific
  githubOwner: string | null;
  githubRepo: string | null;
  githubStars: number;
  githubForks: number;
  githubLanguage: string | null;
  githubTopics: string[];
  readmeContent: string | null;
  readmeSummary: string | null;
  lastSyncAt: string | null;

  // Common
  iconUrl: string | null;
  screenshotUrls: string[];
  notes: string | null;

  // Runtime
  tags?: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  userCreated: boolean;
  isArchived: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  parentId: string | null;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface ItemTag {
  itemId: string;
  tagId: string;
  confidence: number;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  color: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ItemCollection {
  itemId: string;
  collectionId: string;
}

export interface Embedding {
  itemId: string;
  embedding: Float32Array;
  model: string;
  updatedAt: string;
}

export interface SyncMeta {
  id: number;
  lastSyncAt: string | null;
  syncTarget: 'github_gist' | 'github_repo' | 'webdav' | null;
  syncTargetId: string | null;
  deviceId: string;
  schemaVersion: number;
}

export interface ChangeRecord {
  id?: number;
  tableName: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  timestamp: string;
  synced: boolean;
  syncRetry: number;
}

export type SyncTarget = 'github_gist' | 'github_repo' | 'webdav';

export interface SyncPayload {
  version: number;
  deviceId: string;
  timestamp: string;
  checksum: string;
  data: {
    items: Item[];
    tags: Tag[];
    collections: Collection[];
  };
  changelog: {
    fromVersion: number;
    toVersion: number;
    changes: ChangeRecord[];
  };
}

export interface SearchResult {
  item: Item;
  score: number;
  matchType: 'semantic' | 'keyword' | 'tag';
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
}

export interface TagNetwork {
  nodes: { id: string; name: string; count: number; color: string }[];
  edges: { source: string; target: string; weight: number }[];
}

export interface SimilarItem {
  item: Item;
  similarity: number;
  reasons: string[];
}
