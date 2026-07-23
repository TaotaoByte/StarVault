import type { Item } from '../types/index.js';
import { generateId, now } from '../utils/index.js';

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  default_branch: string;
  updated_at: string;
}

export interface GitHubApiConfig {
  token?: string;
  baseUrl?: string;
}

export class GitHubApi {
  private token?: string;
  private baseUrl: string;

  constructor(config: GitHubApiConfig = {}) {
    this.token = config.token;
    this.baseUrl = (config.baseUrl ?? 'https://api.github.com').replace(/\/$/, '');
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.token) {
      h.Authorization = `Bearer ${this.token}`;
    }
    return h;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async getUser(): Promise<{ login: string; id: number }> {
    return this.request('/user');
  }

  async *getStarredRepos(perPage = 100): AsyncGenerator<GitHubRepo[]> {
    let page = 1;
    while (true) {
      const repos = await this.request<GitHubRepo[]>(
        `/user/starred?per_page=${perPage}&page=${page}`
      );
      if (repos.length === 0) break;
      yield repos;
      if (repos.length < perPage) break;
      page++;
    }
  }

  async getRepoDetail(fullName: string): Promise<GitHubRepo> {
    return this.request<GitHubRepo>(`/repos/${fullName}`);
  }

  async fetchReadme(fullName: string, branch = 'main'): Promise<string> {
    const url = `https://raw.githubusercontent.com/${fullName}/${branch}/README.md`;
    const res = await fetch(url);
    if (res.ok) return res.text();
    // fallback to master
    const url2 = `https://raw.githubusercontent.com/${fullName}/master/README.md`;
    const res2 = await fetch(url2);
    if (res2.ok) return res2.text();
    return '';
  }
}

export function githubRepoToItem(repo: GitHubRepo): Item {
  return {
    id: generateId(),
    type: 'github',
    sourceUrl: repo.html_url,
    title: repo.name,
    description: repo.description ?? '',
    githubOwner: repo.owner.login,
    githubRepo: repo.name,
    githubStars: repo.stargazers_count,
    githubForks: repo.forks_count,
    githubLanguage: repo.language,
    githubTopics: repo.topics ?? [],
    readmeContent: null,
    readmeSummary: null,
    lastSyncAt: now(),
    iconUrl: null,
    screenshotUrls: [],
    notes: null,
    createdAt: now(),
    updatedAt: now(),
    userCreated: false,
    isArchived: false,
  };
}
