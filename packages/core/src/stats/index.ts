import type { Item } from '../types/index.js';

export interface DistributionEntry {
  name: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesEntry {
  date: string;
  count: number;
  cumulative: number;
}

export interface StarRangeEntry {
  range: string;
  count: number;
}

export interface StatsSummary {
  total: number;
  github: number;
  website: number;
  software: number;
  tool: number;
  archived: number;
  totalStars: number;
  averageStars: number;
  withReadmeSummary: number;
  withTags: number;
  withEmbeddings: number;
}

export function buildStatsSummary(items: Item[]): StatsSummary {
  const github = items.filter(i => i.type === 'github').length;
  const website = items.filter(i => i.type === 'website').length;
  const software = items.filter(i => i.type === 'software').length;
  const tool = items.filter(i => i.type === 'tool').length;
  const archived = items.filter(i => i.isArchived).length;
  const githubItems = items.filter(i => i.type === 'github');
  const totalStars = githubItems.reduce((sum, i) => sum + (i.githubStars ?? 0), 0);
  const averageStars = githubItems.length > 0 ? Math.round(totalStars / githubItems.length) : 0;
  const withReadmeSummary = items.filter(i => !!i.readmeSummary).length;
  const withTags = items.filter(i => (i.tags?.length ?? 0) > 0).length;
  const withEmbeddings = items.filter(i => (i as Item & { embedding?: number[] }).embedding?.length).length;

  return {
    total: items.length,
    github,
    website,
    software,
    tool,
    archived,
    totalStars,
    averageStars,
    withReadmeSummary,
    withTags,
    withEmbeddings,
  };
}

export function getTypeDistribution(items: Item[]): DistributionEntry[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }
  return toDistribution(Array.from(counts.entries()), items.length);
}

export function getLanguageDistribution(items: Item[], topN = 20): DistributionEntry[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const lang = item.githubLanguage;
    if (!lang) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return toDistribution(Array.from(counts.entries()), items.length)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function getTagDistribution(items: Item[], topN = 30): DistributionEntry[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return toDistribution(Array.from(counts.entries()), items.length)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function getStarDistribution(items: Item[]): StarRangeEntry[] {
  const ranges = [
    { min: 0, max: 0, label: '0' },
    { min: 1, max: 100, label: '1-100' },
    { min: 101, max: 1000, label: '101-1k' },
    { min: 1001, max: 5000, label: '1k-5k' },
    { min: 5001, max: 10000, label: '5k-10k' },
    { min: 10001, max: 50000, label: '10k-50k' },
    { min: 50001, max: Infinity, label: '50k+' },
  ];

  const githubItems = items.filter(i => i.type === 'github');
  return ranges.map(r => ({
    range: r.label,
    count: githubItems.filter(i => {
      const stars = i.githubStars ?? 0;
      return stars >= r.min && stars <= r.max;
    }).length,
  }));
}

export function getItemsOverTime(items: Item[], granularity: 'day' | 'week' | 'month' = 'month'): TimeSeriesEntry[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const start = new Date(sorted[0].createdAt);
  const end = new Date();

  const buckets = new Map<string, number>();
  for (const item of sorted) {
    const key = formatBucket(new Date(item.createdAt), granularity);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  // Fill empty buckets
  const result: TimeSeriesEntry[] = [];
  let current = new Date(start);
  let cumulative = 0;
  while (current <= end) {
    const key = formatBucket(current, granularity);
    const count = buckets.get(key) ?? 0;
    cumulative += count;
    result.push({ date: key, count, cumulative });
    current = incrementBucket(current, granularity);
  }
  return result;
}

export function getTopStarredItems(items: Item[], limit = 10): Item[] {
  return items
    .filter(i => i.type === 'github' && (i.githubStars ?? 0) > 0)
    .sort((a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0))
    .slice(0, limit);
}

function toDistribution(entries: [string, number][], total: number): DistributionEntry[] {
  return entries
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function formatBucket(date: Date, granularity: 'day' | 'week' | 'month'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (granularity === 'day') return `${year}-${month}-${day}`;
  if (granularity === 'week') {
    const d = new Date(date);
    d.setDate(date.getDate() - date.getDay());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return `${year}-${month}`;
}

function incrementBucket(date: Date, granularity: 'day' | 'week' | 'month'): Date {
  const d = new Date(date);
  if (granularity === 'day') d.setDate(d.getDate() + 1);
  else if (granularity === 'week') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}
