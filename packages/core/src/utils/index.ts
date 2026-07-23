import { v4 as uuidv4 } from 'uuid';
import type { Item } from '../types/index.js';

export function generateId(): string {
  return uuidv4();
}

export function now(): string {
  return new Date().toISOString();
}

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getDeviceId(): string {
  const key = 'sv_device_id';
  let id = globalThis.localStorage?.getItem(key);
  if (!id) {
    id = generateId();
    globalThis.localStorage?.setItem(key, id);
  }
  return id;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function truncateReadme(readme: string, maxLength = 6000): string {
  if (readme.length <= maxLength) return readme;
  return readme.slice(0, maxLength);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function buildEmbeddingText(item: Item): string {
  const parts = [
    item.title,
    item.description ?? '',
    item.readmeSummary ?? '',
    item.githubLanguage ?? '',
    ...(item.githubTopics ?? []),
    ...(item.tags ?? []),
  ];
  return parts.filter(Boolean).join(' ').slice(0, 8000);
}
