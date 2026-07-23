import { useEffect, useState } from 'react';
import {
  GitHubApi,
  githubRepoToItem,
  keywordSearch,
  now,
  OpenAiProvider,
  parseTagSuggestions,
  Repository,
  SqlJsAdapter,
  SUMMARY_PROMPT,
  buildTagPrompt,
  truncateReadme,
  GistSyncEngine,
  type Item,
} from '@starvault/core';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, useTheme } from '@starvault/ui';
import { Github, Moon, Search, Sun, Plus, RefreshCw } from 'lucide-react';
import pLimit from 'p-limit';
import { useAppStore } from './stores/appStore.js';
import { loadDb, saveDb } from './lib/idb.js';

export default function App() {
  const { theme, toggle } = useTheme();
  const store = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [message, setMessage] = useState('');
  const [aiKey, setAiKey] = useState(localStorage.getItem('sv-ai-key') ?? '');
  const [gistId, setGistId] = useState(localStorage.getItem('sv-gist-id') ?? '');
  const [isGistSyncing, setIsGistSyncing] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const saved = await loadDb();
        const adapter = await SqlJsAdapter.create({
          locateFile: file => `/${file}`,
          data: saved,
        });
        store.setDb(adapter);
        loadItems(adapter);
        setMessage('数据库已就绪');
      } catch (err) {
        setMessage(`初始化失败: ${(err as Error).message}`);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!store.db) return;
    const timer = setInterval(() => {
      saveDb(store.db!.export()).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [store.db]);

  useEffect(() => {
    if (!store.db) return;
    if (!query.trim()) {
      setResults(store.items);
      return;
    }
    const run = async () => {
      const keywordResults = await keywordSearch(store.db!, query, { limit: 50 });
      setResults(keywordResults.map(r => r.item));
    };
    run();
  }, [query, store.db, store.items]);

  const loadItems = (adapter = store.db) => {
    if (!adapter) return;
    const repo = new Repository(adapter);
    const items = repo.getItems().map(item => ({
      ...item,
      tags: repo.getItemTags(item.id),
    }));
    store.setItems(items);
    setResults(items);
  };

  const handleSync = async () => {
    if (!store.db || !store.githubToken) {
      setMessage('请先配置 GitHub Token');
      return;
    }
    store.setIsSyncing(true);
    setMessage('正在同步 GitHub Stars...');
    try {
      const api = new GitHubApi({ token: store.githubToken });
      const user = await api.getUser();
      setMessage(`已授权用户: ${user.login}`);

      const repo = new Repository(store.db);
      const limit = pLimit(10);
      let count = 0;

      for await (const repos of api.getStarredRepos()) {
        const tasks = repos.map(repoData =>
          limit(async () => {
            const existing = repo.getItemByGithub(repoData.owner.login, repoData.name);
            if (existing) return;

            const item = githubRepoToItem(repoData);
            const detail = await api.getRepoDetail(repoData.full_name);
            item.githubStars = detail.stargazers_count;
            item.githubForks = detail.forks_count;
            item.githubLanguage = detail.language;
            item.githubTopics = detail.topics ?? [];

            const readme = await api.fetchReadme(repoData.full_name, detail.default_branch);
            item.readmeContent = readme;

            if (readme && aiKey) {
              try {
                const ai = new OpenAiProvider({ provider: 'openai', apiKey: aiKey });
                const summary = await ai.chatCompletion(
                  SUMMARY_PROMPT.replace('{readme_content}', truncateReadme(readme))
                );
                item.readmeSummary = summary;

                const tagResponse = await ai.chatCompletion(buildTagPrompt(item));
                const suggestions = parseTagSuggestions(tagResponse);
                enrichAndInsert(repo, item, suggestions);
              } catch {
                repo.insertItem(item);
              }
            } else {
              repo.insertItem(item);
            }
            count++;
          })
        );
        await Promise.all(tasks);
      }
      loadItems();
      setMessage(`同步完成，新增 ${count} 个项目`);
    } catch (err) {
      setMessage(`同步失败: ${(err as Error).message}`);
    } finally {
      store.setIsSyncing(false);
    }
  };

  const handleGistSync = async () => {
    if (!store.db || !store.githubToken) return;
    setIsGistSyncing(true);
    setMessage('正在同步到 Gist...');
    try {
      const repo = new Repository(store.db);
      const meta = repo.getSyncMeta();
      const engine = new GistSyncEngine({ token: store.githubToken, gistId: gistId || undefined });
      const result = await engine.sync(repo, meta?.deviceId ?? crypto.randomUUID());
      if (engine.getGistId() && engine.getGistId() !== gistId) {
        setGistId(engine.getGistId()!);
        localStorage.setItem('sv-gist-id', engine.getGistId()!);
      }
      loadItems();
      setMessage(`Gist 同步成功：上传 ${result.pushed}，拉取 ${result.pulled}`);
    } catch (err) {
      setMessage(`Gist 同步失败: ${(err as Error).message}`);
    } finally {
      setIsGistSyncing(false);
    }
  };

  const addManualItem = () => {
    if (!store.db) return;
    const title = prompt('输入标题');
    const url = prompt('输入 URL');
    if (!title || !url) return;
    const repo = new Repository(store.db);
    const item: Item = {
      id: crypto.randomUUID(),
      type: 'website',
      sourceUrl: url,
      title,
      description: '',
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
      createdAt: now(),
      updatedAt: now(),
      userCreated: true,
      isArchived: false,
    };
    repo.insertItem(item);
    loadItems();
  };

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary">
      <aside className="w-64 border-r border-border bg-bg-secondary p-4 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Github className="h-6 w-6 text-github" />
          StarVault
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-tertiary">GitHub Token</label>
          <Input
            type="password"
            placeholder="ghp_xxx"
            value={store.githubToken}
            onChange={e => store.setGithubToken(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-tertiary">OpenAI Key (可选)</label>
          <Input
            type="password"
            placeholder="sk-xxx"
            value={aiKey}
            onChange={e => {
              setAiKey(e.target.value);
              localStorage.setItem('sv-ai-key', e.target.value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Button className="w-full gap-2" onClick={handleSync} disabled={store.isSyncing}>
            <RefreshCw className={`h-4 w-4 ${store.isSyncing ? 'animate-spin' : ''}`} />
            {store.isSyncing ? '同步中...' : '同步 GitHub Stars'}
          </Button>
          <Button variant="secondary" className="w-full gap-2" onClick={addManualItem}>
            <Plus className="h-4 w-4" />
            添加收藏
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-tertiary">Gist ID（可选）</label>
          <Input
            placeholder="留空则自动创建"
            value={gistId}
            onChange={e => {
              setGistId(e.target.value);
              localStorage.setItem('sv-gist-id', e.target.value);
            }}
          />
          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={handleGistSync}
            disabled={isGistSyncing || !store.githubToken}
          >
            <RefreshCw className={`h-4 w-4 ${isGistSyncing ? 'animate-spin' : ''}`} />
            {isGistSyncing ? '同步中...' : '同步到 Gist'}
          </Button>
        </div>

        <div className="mt-auto">
          <Button variant="ghost" className="w-full gap-2" onClick={toggle}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? '浅色模式' : '深色模式'}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="border-b border-border p-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              className="pl-9"
              placeholder="搜索项目、标签、描述..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <span className="text-sm text-text-secondary">{store.items.length} 个项目</span>
        </header>

        <div className="p-4 text-sm text-text-secondary">{message}</div>

        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
          {results.map(item => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {item.type === 'github' && <Github className="h-4 w-4" />}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    {item.title}
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <p className="text-sm text-text-secondary line-clamp-3">
                  {item.readmeSummary || item.description || '暂无描述'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.githubLanguage && <Badge>{item.githubLanguage}</Badge>}
                  {item.githubStars > 0 && <Badge>⭐ {item.githubStars}</Badge>}
                  {item.tags?.map(tag => (
                    <Badge key={tag} color="#8b5cf6">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function enrichAndInsert(
  repo: Repository,
  item: Item,
  suggestions: { tag: string; confidence: number; reason: string }[]
): void {
  repo.insertItem(item);
  for (const s of suggestions) {
    let tag = repo.getTagByName(s.tag);
    if (!tag) {
      tag = {
        id: crypto.randomUUID(),
        name: s.tag,
        color: '#8b5cf6',
        description: null,
        parentId: null,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
      };
      repo.createTag(tag);
    }
    repo.addTagToItem(item.id, tag.id, s.confidence);
  }
}
