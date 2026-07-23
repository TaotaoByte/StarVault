import type { Collection, Item, Tag } from '../types/index.js';
import { Repository } from '../db/repository.js';
import type { DatabaseAdapter } from '../db/adapter.js';
import { generateId, now } from '../utils/index.js';

export interface ExportData {
  version: number;
  exportedAt: string;
  items: Item[];
  tags: Tag[];
  collections: Collection[];
}

export interface ImportResult {
  added: number;
  updated: number;
  errors: string[];
}

export interface BookmarkNode {
  title: string;
  url?: string;
  description?: string;
  addDate?: string;
  children?: BookmarkNode[];
}

export function exportToJson(adapter: DatabaseAdapter): ExportData {
  const repo = new Repository(adapter);
  return {
    version: 1,
    exportedAt: now(),
    items: repo.getItemsWithTags(),
    tags: repo.getTags(),
    collections: repo.getCollections(),
  };
}

export function importFromJson(adapter: DatabaseAdapter, data: unknown): ImportResult {
  const result: ImportResult = { added: 0, updated: 0, errors: [] };
  const repo = new Repository(adapter);

  if (!data || typeof data !== 'object') {
    result.errors.push('无效的 JSON 数据');
    return result;
  }

  const payload = data as Partial<ExportData>;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  const collections = Array.isArray(payload.collections) ? payload.collections : [];

  const tagNameToId = new Map<string, string>();
  for (const tag of repo.getTags()) {
    tagNameToId.set(tag.name, tag.id);
  }

  for (const tag of tags) {
    if (!tag.name) continue;
    if (!tagNameToId.has(tag.name)) {
      const newTag: Tag = {
        id: tag.id && !tagNameToId.has(tag.name) ? tag.id : generateId(),
        name: tag.name,
        color: tag.color ?? '#3b82f6',
        description: tag.description ?? null,
        parentId: tag.parentId ?? null,
        isAiGenerated: tag.isAiGenerated ?? false,
        createdAt: tag.createdAt ?? now(),
      };
      try {
        repo.createTag(newTag);
        tagNameToId.set(newTag.name, newTag.id);
      } catch (err) {
        result.errors.push(`创建标签 ${tag.name} 失败: ${(err as Error).message}`);
      }
    }
  }

  for (const collection of collections) {
    if (!collection.name) continue;
    try {
      const newCollection: Collection = {
        id: collection.id ?? generateId(),
        name: collection.name,
        icon: collection.icon ?? 'folder',
        color: collection.color ?? null,
        parentId: collection.parentId ?? null,
        sortOrder: collection.sortOrder ?? 0,
        createdAt: collection.createdAt ?? now(),
      };
      repo.createCollection(newCollection);
    } catch (err) {
      result.errors.push(`创建分类 ${collection.name} 失败: ${(err as Error).message}`);
    }
  }

  for (const raw of items) {
    const item: Item = {
      id: raw.id ?? generateId(),
      type: normalizeItemType(raw.type),
      sourceUrl: raw.sourceUrl || '',
      title: raw.title || '未命名',
      description: raw.description ?? null,
      githubOwner: raw.githubOwner ?? null,
      githubRepo: raw.githubRepo ?? null,
      githubStars: raw.githubStars ?? 0,
      githubForks: raw.githubForks ?? 0,
      githubLanguage: raw.githubLanguage ?? null,
      githubTopics: Array.isArray(raw.githubTopics) ? raw.githubTopics : [],
      readmeContent: raw.readmeContent ?? null,
      readmeSummary: raw.readmeSummary ?? null,
      lastSyncAt: raw.lastSyncAt ?? null,
      iconUrl: raw.iconUrl ?? null,
      screenshotUrls: Array.isArray(raw.screenshotUrls) ? raw.screenshotUrls : [],
      notes: raw.notes ?? null,
      createdAt: raw.createdAt ?? now(),
      updatedAt: raw.updatedAt ?? now(),
      userCreated: raw.userCreated ?? true,
      isArchived: raw.isArchived ?? false,
    };

    const existing = repo.getItemByGithub(item.githubOwner ?? '', item.githubRepo ?? '');
    const existingByUrl = !existing ? findItemByUrl(repo, item.sourceUrl) : undefined;

    try {
      if (existing || existingByUrl) {
        repo.updateItem({
          ...item,
          id: (existing || existingByUrl)!.id,
          updatedAt: now(),
        });
        result.updated++;
      } else {
        repo.insertItem(item);
        result.added++;
      }

      const tagNames = Array.isArray(raw.tags) ? raw.tags : [];
      for (const tagName of tagNames) {
        let tagId = tagNameToId.get(tagName);
        if (!tagId) {
          const newTag: Tag = {
            id: generateId(),
            name: tagName,
            color: '#8b5cf6',
            description: null,
            parentId: null,
            isAiGenerated: false,
            createdAt: now(),
          };
          repo.createTag(newTag);
          tagId = newTag.id;
          tagNameToId.set(tagName, tagId);
        }
        repo.addTagToItem(item.id, tagId);
      }
    } catch (err) {
      result.errors.push(`导入项目 ${item.title} 失败: ${(err as Error).message}`);
    }
  }

  return result;
}

export function parseHtmlBookmarks(html: string): BookmarkNode[] {
  const results: BookmarkNode[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function parseDL(dl: HTMLDListElement, folderTitle = '导入书签'): BookmarkNode[] {
    const nodes: BookmarkNode[] = [];
    let currentDesc = '';
    for (const child of Array.from(dl.children)) {
      if (child.tagName === 'DT') {
        const a = child.querySelector('a');
        const nestedDL = child.querySelector('dl');
        const dd = child.nextElementSibling;
        currentDesc = dd && dd.tagName === 'DD' ? dd.textContent?.trim() ?? '' : '';
        if (a) {
          nodes.push({
            title: a.textContent?.trim() || '未命名',
            url: a.getAttribute('href') || undefined,
            description: currentDesc || undefined,
            addDate: a.getAttribute('add_date') || undefined,
          });
        } else if (nestedDL) {
          const h3 = child.querySelector('h3');
          const folderName = h3?.textContent?.trim() || folderTitle;
          nodes.push({
            title: folderName,
            children: parseDL(nestedDL, folderName),
          });
        }
      }
    }
    return nodes;
  }

  for (const dl of Array.from(doc.querySelectorAll('dl'))) {
    results.push(...parseDL(dl));
  }
  return results;
}

export function flattenBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
  const results: BookmarkNode[] = [];
  for (const node of nodes) {
    if (node.url) {
      results.push(node);
    }
    if (node.children) {
      results.push(...flattenBookmarks(node.children));
    }
  }
  return results;
}

export function importFromHtml(adapter: DatabaseAdapter, html: string): ImportResult {
  const result: ImportResult = { added: 0, updated: 0, errors: [] };
  const repo = new Repository(adapter);
  const bookmarks = flattenBookmarks(parseHtmlBookmarks(html));

  for (const bm of bookmarks) {
    if (!bm.url) continue;
    const item: Item = {
      id: generateId(),
      type: 'website',
      sourceUrl: bm.url,
      title: bm.title || '未命名',
      description: bm.description ?? null,
      githubOwner: null,
      githubRepo: null,
      githubStars: 0,
      githubForks: 0,
      githubLanguage: null,
      githubTopics: [],
      readmeContent: null,
      readmeSummary: null,
      lastSyncAt: null,
      iconUrl: null,
      screenshotUrls: [],
      notes: null,
      createdAt: bm.addDate ? new Date(Number(bm.addDate) * 1000).toISOString() : now(),
      updatedAt: now(),
      userCreated: true,
      isArchived: false,
    };

    const existing = findItemByUrl(repo, item.sourceUrl);
    try {
      if (existing) {
        repo.updateItem({ ...item, id: existing.id });
        result.updated++;
      } else {
        repo.insertItem(item);
        result.added++;
      }
    } catch (err) {
      result.errors.push(`导入书签 ${item.title} 失败: ${(err as Error).message}`);
    }
  }

  return result;
}

function normalizeItemType(type: unknown): Item['type'] {
  if (type === 'github' || type === 'website' || type === 'software' || type === 'tool') {
    return type;
  }
  return 'website';
}

function findItemByUrl(repo: Repository, url: string): Item | undefined {
  return repo.getItems().find(i => i.sourceUrl === url);
}
