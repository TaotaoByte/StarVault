import { v4 as uuidv4 } from 'uuid';

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
