import type { AiProvider } from '../ai/provider.js';
import type { DatabaseAdapter } from '../db/adapter.js';
import { Repository } from '../db/repository.js';
import type { Item, SearchResult, SimilarItem, TagNetwork } from '../types/index.js';
import { cosineSimilarity } from '../utils/index.js';

export interface SearchOptions {
  limit?: number;
  includeArchived?: boolean;
}

export async function keywordSearch(
  adapter: DatabaseAdapter,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const limit = options.limit ?? 50;
  const rows = adapter.query<{
    id: string;
    type: string;
    source_url: string;
    title: string;
    description: string | null;
    github_owner: string | null;
    github_repo: string | null;
    github_stars: number;
    github_forks: number;
    github_language: string | null;
    github_topics: string;
    readme_content: string | null;
    readme_summary: string | null;
    last_sync_at: string | null;
    icon_url: string | null;
    screenshot_urls: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    user_created: number;
    is_archived: number;
  }>(
    `SELECT i.* FROM items i
     JOIN items_fts fts ON fts.rowid = i.id
     WHERE items_fts MATCH ? ${options.includeArchived ? '' : 'AND i.is_archived = 0'}
     ORDER BY rank
     LIMIT ?`,
    [query, limit]
  );

  return rows.map((row, index) => ({
    item: rowToItem(row),
    score: 1 / (60 + index + 1),
    matchType: 'keyword',
  }));
}

export async function tagSearch(
  adapter: DatabaseAdapter,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const limit = options.limit ?? 50;
  const rows = adapter.query<{
    id: string;
    type: string;
    source_url: string;
    title: string;
    description: string | null;
    github_owner: string | null;
    github_repo: string | null;
    github_stars: number;
    github_forks: number;
    github_language: string | null;
    github_topics: string;
    readme_content: string | null;
    readme_summary: string | null;
    last_sync_at: string | null;
    icon_url: string | null;
    screenshot_urls: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    user_created: number;
    is_archived: number;
  }>(
    `SELECT i.* FROM items i
     JOIN item_tags it ON it.item_id = i.id
     JOIN tags t ON t.id = it.tag_id
     WHERE t.name LIKE ? ${options.includeArchived ? '' : 'AND i.is_archived = 0'}
     ORDER BY i.updated_at DESC
     LIMIT ?`,
    [`%${query}%`, limit]
  );

  return rows.map(row => ({
    item: rowToItem(row),
    score: 1,
    matchType: 'tag',
  }));
}

export function reciprocalRankFusion(lists: SearchResult[][], k = 60): SearchResult[] {
  const scores = new Map<string, { item: Item; score: number; matchTypes: Set<string> }>();

  for (const list of lists) {
    for (let i = 0; i < list.length; i++) {
      const result = list[i];
      const existing = scores.get(result.item.id);
      if (existing) {
        existing.score += 1 / (k + i + 1);
        existing.matchTypes.add(result.matchType);
      } else {
        scores.set(result.item.id, {
          item: result.item,
          score: 1 / (k + i + 1),
          matchTypes: new Set([result.matchType]),
        });
      }
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ item, score, matchTypes }) => ({
      item,
      score,
      matchType: (matchTypes.has('keyword') ? 'keyword' : matchTypes.values().next().value) as SearchResult['matchType'],
    }));
}

export async function semanticSearch(
  adapter: DatabaseAdapter,
  ai: AiProvider,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const limit = options.limit ?? 50;
  const repo = new Repository(adapter);
  const [queryEmbedding, embeddings, items] = await Promise.all([
    ai.embed(query),
    repo.getAllEmbeddings(),
    Promise.resolve(repo.getItemsWithTags()),
  ]);

  if (queryEmbedding.length === 0 || embeddings.length === 0) return [];

  const itemMap = new Map(items.map(i => [i.id, i]));
  const results = embeddings
    .map(e => ({
      item: itemMap.get(e.itemId),
      similarity: cosineSimilarity(queryEmbedding, Array.from(e.embedding)),
    }))
    .filter(r => r.item && r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results.map(r => ({
    item: r.item!,
    score: r.similarity,
    matchType: 'semantic',
  }));
}

export async function hybridSearch(
  adapter: DatabaseAdapter,
  ai: AiProvider | null,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const lists: SearchResult[][] = [];
  const [keyword, tag] = await Promise.all([
    keywordSearch(adapter, query, options),
    tagSearch(adapter, query, options),
  ]);
  lists.push(keyword, tag);

  if (ai) {
    try {
      const semantic = await semanticSearch(adapter, ai, query, options);
      lists.push(semantic);
    } catch {
      // semantic search is optional; fall back to keyword + tag
    }
  }

  return reciprocalRankFusion(lists, 60);
}

export async function findSimilarItems(
  adapter: DatabaseAdapter,
  ai: AiProvider | null,
  item: Item,
  options: SearchOptions = {}
): Promise<SimilarItem[]> {
  const limit = options.limit ?? 10;
  const repo = new Repository(adapter);
  const allItems = repo.getItemsWithTags().filter(i => i.id !== item.id);
  if (allItems.length === 0) return [];

  const candidates = new Map<string, { item: Item; score: number; reasons: Set<string> }>();
  const addCandidate = (candidate: Item, score: number, reason: string) => {
    const existing = candidates.get(candidate.id);
    if (existing) {
      existing.score = Math.max(existing.score, score);
      existing.reasons.add(reason);
    } else {
      candidates.set(candidate.id, { item: candidate, score, reasons: new Set([reason]) });
    }
  };

  // Semantic similarity using stored embeddings
  if (ai) {
    try {
      const targetEmbedding = repo.getEmbedding(item.id);
      const allEmbeddings = repo.getAllEmbeddings();
      if (targetEmbedding) {
        const target = Array.from(targetEmbedding.embedding);
        for (const e of allEmbeddings) {
          if (e.itemId === item.id) continue;
          const similarity = cosineSimilarity(target, Array.from(e.embedding));
          if (similarity > 0.75) {
            const candidate = allItems.find(i => i.id === e.itemId);
            if (candidate) addCandidate(candidate, similarity, '语义相似');
          }
        }
      }
    } catch {
      // ignore embedding failures
    }
  }

  // Tag overlap (Jaccard)
  const itemTags = new Set(item.tags ?? []);
  if (itemTags.size > 0) {
    for (const other of allItems) {
      const otherTags = new Set(other.tags ?? []);
      const intersection = new Set([...itemTags].filter(t => otherTags.has(t)));
      const union = new Set([...itemTags, ...otherTags]);
      if (union.size === 0) continue;
      const jaccard = intersection.size / union.size;
      if (jaccard > 0.3) {
        addCandidate(other, jaccard, '标签匹配');
      }
    }
  }

  // Same language / domain
  if (item.githubLanguage) {
    for (const other of allItems) {
      if (other.githubLanguage === item.githubLanguage) {
        addCandidate(other, 0.5, '同语言');
      }
    }
  }

  return Array.from(candidates.values())
    .map(c => ({
      item: c.item,
      similarity: Math.min(c.score, 1),
      reasons: Array.from(c.reasons),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export function buildTagNetwork(items: Item[]): TagNetwork {
  const cooccurrence = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const item of items) {
    const tags = item.tags?.map((t: string) => t) ?? [];
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const key = [tags[i], tags[j]].sort().join('|');
        cooccurrence.set(key, (cooccurrence.get(key) || 0) + 1);
      }
    }
  }

  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const nodes = Array.from(tagCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([name, count], index) => ({
      id: name,
      name,
      count,
      color: colors[index % colors.length],
    }));

  const edges = Array.from(cooccurrence.entries())
    .filter(([, weight]) => weight >= 2)
    .map(([key, weight]) => {
      const [source, target] = key.split('|');
      return { source, target, weight };
    });

  return { nodes, edges };
}

function rowToItem(row: {
  id: string;
  type: string;
  source_url: string;
  title: string;
  description: string | null;
  github_owner: string | null;
  github_repo: string | null;
  github_stars: number;
  github_forks: number;
  github_language: string | null;
  github_topics: string;
  readme_content: string | null;
  readme_summary: string | null;
  last_sync_at: string | null;
  icon_url: string | null;
  screenshot_urls: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_created: number;
  is_archived: number;
}): Item {
  return {
    id: row.id,
    type: row.type as Item['type'],
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    githubOwner: row.github_owner,
    githubRepo: row.github_repo,
    githubStars: row.github_stars,
    githubForks: row.github_forks,
    githubLanguage: row.github_language,
    githubTopics: parseTopics(row.github_topics),
    readmeContent: row.readme_content,
    readmeSummary: row.readme_summary,
    lastSyncAt: row.last_sync_at,
    iconUrl: row.icon_url,
    screenshotUrls: parseTopics(row.screenshot_urls),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userCreated: Boolean(row.user_created),
    isArchived: Boolean(row.is_archived),
  };
}

function parseTopics(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
