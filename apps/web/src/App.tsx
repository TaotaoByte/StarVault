import { useEffect, useMemo, useState } from 'react';
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
  createAiProvider,
  buildEmbeddingText,
  hybridSearch,
  semanticSearch,
  findSimilarItems,
  buildTagNetwork,
  type Item,
} from '@starvault/core';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, useTheme } from '@starvault/ui';
import { Github, Moon, Search, Sun, Plus, RefreshCw, Brain, Tags, Sparkles, X, Wand2, Wrench, ArrowLeftRight, BarChart3 } from 'lucide-react';
import { TagNetworkChart } from './components/TagNetworkChart.js';
import { VirtualItemGrid } from './components/VirtualItemGrid.js';
import pLimit from 'p-limit';
import { useAppStore } from './stores/appStore.js';
import { loadDb, saveDb } from './lib/idb.js';
import ToolsPage from './pages/ToolsPage.js';
import ImportExportPage from './pages/ImportExportPage.js';
import StatsPage from './pages/StatsPage.js';

export default function App() {
  const { theme, toggle } = useTheme();
  const store = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [message, setMessage] = useState('');
  const [aiKey, setAiKey] = useState(localStorage.getItem('sv-ai-key') ?? '');
  const [gistId, setGistId] = useState(localStorage.getItem('sv-gist-id') ?? '');
  const [isGistSyncing, setIsGistSyncing] = useState(false);
  const [searchMode, setSearchMode] = useState<'hybrid' | 'keyword' | 'semantic'>('hybrid');
  const [showTagNetwork, setShowTagNetwork] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [similarItems, setSimilarItems] = useState<Item[]>([]);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [page, setPage] = useState<'home' | 'tools' | 'import-export' | 'stats'>('home');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ItemFilters>({
    types: [],
    languages: [],
    tags: [],
    dateRange: { start: '', end: '' },
    minStars: 0,
  });

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
        handleUrlAdd(adapter);
      } catch (err) {
        setMessage(`初始化失败: ${(err as Error).message}`);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUrlAdd = (adapter = store.db) => {
    if (!adapter) return;
    const params = new URLSearchParams(window.location.search);
    const addUrl = params.get('addUrl');
    const addTitle = params.get('addTitle');
    if (!addUrl) return;

    const repo = new Repository(adapter);
    const existing = repo.getItems().find(i => i.sourceUrl === addUrl);
    if (existing) {
      setMessage(`该页面已存在: ${existing.title}`);
      return;
    }

    const item: Item = {
      id: crypto.randomUUID(),
      type: 'website',
      sourceUrl: addUrl,
      title: addTitle || addUrl,
      description: null,
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
      notes: params.get('addNotes') ?? null,
      createdAt: now(),
      updatedAt: now(),
      userCreated: true,
      isArchived: false,
    };
    repo.insertItem(item);
    loadItems(adapter);
    setMessage(`已添加收藏: ${item.title}`);

    params.delete('addUrl');
    params.delete('addTitle');
    params.delete('addNotes');
    const newSearch = params.toString();
    window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
  };

  const filteredResults = useMemo(() => filterItems(results, filters), [results, filters]);

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
      let searchResults: { item: Item; score: number; matchType: string }[] = [];
      if (searchMode === 'keyword') {
        searchResults = await keywordSearch(store.db!, query, { limit: 50 });
      } else if (searchMode === 'semantic') {
        if (!aiKey) {
          setMessage('语义搜索需要配置 OpenAI Key');
          setResults([]);
          return;
        }
        const ai = createAiProvider({ provider: 'openai', apiKey: aiKey });
        searchResults = await semanticSearch(store.db!, ai, query, { limit: 50 });
      } else {
        const ai = aiKey ? createAiProvider({ provider: 'openai', apiKey: aiKey }) : null;
        searchResults = await hybridSearch(store.db!, ai, query, { limit: 50 });
      }
      setResults(searchResults.map(r => r.item));
    };
    run();
  }, [query, store.db, store.items, searchMode, aiKey]);

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

  const handleGenerateEmbeddings = async () => {
    if (!store.db || !aiKey) {
      setMessage('请先配置 OpenAI Key');
      return;
    }
    setIsEmbedding(true);
    setMessage('正在生成向量 Embedding...');
    try {
      const ai = createAiProvider({ provider: 'openai', apiKey: aiKey });
      const repo = new Repository(store.db);
      const items = repo.getItems();
      const limit = pLimit(5);
      let count = 0;
      await Promise.all(
        items.map(item =>
          limit(async () => {
            if (repo.getEmbedding(item.id)) return;
            const text = buildEmbeddingText(item);
            const embedding = await ai.embed(text);
            if (embedding.length > 0) {
              repo.upsertEmbedding({
                itemId: item.id,
                embedding: new Float32Array(embedding),
                model: 'text-embedding-3-small',
                updatedAt: now(),
              });
              count++;
            }
          })
        )
      );
      setMessage(`已为 ${count} 个项目生成向量`);
    } catch (err) {
      setMessage(`生成向量失败: ${(err as Error).message}`);
    } finally {
      setIsEmbedding(false);
    }
  };

  const handleGenerateTags = async () => {
    if (!store.db || !aiKey) {
      setMessage('请先配置 OpenAI Key');
      return;
    }
    setIsTagging(true);
    setMessage('正在生成 AI 标签...');
    try {
      const ai = createAiProvider({ provider: 'openai', apiKey: aiKey });
      const repo = new Repository(store.db);
      const items = repo.getItems().filter(item => repo.getItemTags(item.id).length === 0);
      const limit = pLimit(5);
      await Promise.all(
        items.map(item =>
          limit(async () => {
            const response = await ai.chatCompletion(buildTagPrompt(item));
            const suggestions = parseTagSuggestions(response);
            enrichAndInsert(repo, item, suggestions);
          })
        )
      );
      loadItems();
      setMessage(`已为 ${items.length} 个项目生成标签`);
    } catch (err) {
      setMessage(`生成标签失败: ${(err as Error).message}`);
    } finally {
      setIsTagging(false);
    }
  };

  const handleShowSimilar = async (item: Item) => {
    if (!store.db) return;
    setSelectedItem(item);
    setSimilarItems([]);
    try {
      const ai = aiKey ? createAiProvider({ provider: 'openai', apiKey: aiKey }) : null;
      const results = await findSimilarItems(store.db, ai, item, { limit: 10 });
      setSimilarItems(results.map(r => r.item));
    } catch (err) {
      setMessage(`相似推荐失败: ${(err as Error).message}`);
    }
  };

  const handleGenerateItemTags = async (item: Item) => {
    if (!store.db || !aiKey) return;
    try {
      const ai = createAiProvider({ provider: 'openai', apiKey: aiKey });
      const repo = new Repository(store.db);
      const response = await ai.chatCompletion(buildTagPrompt(item));
      const suggestions = parseTagSuggestions(response);
      enrichAndInsert(repo, item, suggestions);
      loadItems();
      setMessage(`已为 ${item.title} 生成标签`);
    } catch (err) {
      setMessage(`标签生成失败: ${(err as Error).message}`);
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

        <div className="space-y-2">
          <label className="text-xs text-text-tertiary">AI 增强</label>
          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={handleGenerateEmbeddings}
            disabled={isEmbedding || !aiKey}
          >
            <Brain className={`h-4 w-4 ${isEmbedding ? 'animate-spin' : ''}`} />
            {isEmbedding ? '生成中...' : '生成向量 Embedding'}
          </Button>
          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={handleGenerateTags}
            disabled={isTagging || !aiKey}
          >
            <Wand2 className={`h-4 w-4 ${isTagging ? 'animate-spin' : ''}`} />
            {isTagging ? '生成中...' : 'AI 生成标签'}
          </Button>
          <Button variant="secondary" className="w-full gap-2" onClick={() => setShowTagNetwork(true)}>
            <Tags className="h-4 w-4" />
            标签网络
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-tertiary">页面</label>
          <Button
            variant={page === 'home' ? 'primary' : 'secondary'}
            className="w-full gap-2 justify-start"
            onClick={() => setPage('home')}
          >
            <Github className="h-4 w-4" />
            收藏库
          </Button>
          <Button
            variant={page === 'tools' ? 'primary' : 'secondary'}
            className="w-full gap-2 justify-start"
            onClick={() => setPage('tools')}
          >
            <Wrench className="h-4 w-4" />
            工具箱
          </Button>
          <Button
            variant={page === 'import-export' ? 'primary' : 'secondary'}
            className="w-full gap-2 justify-start"
            onClick={() => setPage('import-export')}
          >
            <ArrowLeftRight className="h-4 w-4" />
            导入导出
          </Button>
          <Button
            variant={page === 'stats' ? 'primary' : 'secondary'}
            className="w-full gap-2 justify-start"
            onClick={() => setPage('stats')}
          >
            <BarChart3 className="h-4 w-4" />
            统计面板
          </Button>
        </div>

        <div className="mt-auto">
          <Button variant="ghost" className="w-full gap-2" onClick={toggle}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? '浅色模式' : '深色模式'}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {page === 'home' && (
          <>
            <header className="border-b border-border p-4 flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 max-w-xl min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  className="pl-9"
                  placeholder="搜索项目、标签、描述..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                {(['hybrid', 'keyword', 'semantic'] as const).map(mode => (
                  <Button
                    key={mode}
                    variant={searchMode === mode ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setSearchMode(mode)}
                  >
                    {mode === 'hybrid' && '混合'}
                    {mode === 'keyword' && '关键词'}
                    {mode === 'semantic' && '语义'}
                  </Button>
                ))}
              </div>
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowFilters(v => !v)}
              >
                筛选
              </Button>
              <span className="text-sm text-text-secondary ml-auto">{filteredResults.length} 个项目</span>
            </header>

            {showFilters && (
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                items={store.items}
              />
            )}

            <div className="p-4 text-sm text-text-secondary">{message}</div>

            <div className="flex-1 min-h-0 p-4">
              <VirtualItemGrid
                items={filteredResults}
                renderItem={(item: Item) => (
                  <Card className="flex flex-col h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {item.type === 'github' && <Github className="h-4 w-4" />}
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">
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
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleGenerateItemTags(item)}
                          disabled={!aiKey}
                        >
                          <Sparkles className="h-3 w-3" />
                          标签
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleShowSimilar(item)}
                        >
                          <Brain className="h-3 w-3" />
                          相似
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            </div>
          </>
        )}
        {page === 'tools' && (
          <div className="flex-1 p-4 overflow-hidden">
            <ToolsPage />
          </div>
        )}
        {page === 'import-export' && (
          <div className="flex-1 p-4 overflow-auto">
            <ImportExportPage onImported={() => loadItems()} />
          </div>
        )}
        {page === 'stats' && (
          <div className="flex-1 p-4 overflow-auto">
            <StatsPage />
          </div>
        )}
      </main>

      {showTagNetwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-bg-primary rounded-xl border border-border shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">标签网络</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowTagNetwork(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <TagNetworkChart data={buildTagNetwork(store.items)} />
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] bg-bg-primary rounded-xl border border-border shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">与「{selectedItem.title}」相似的项目</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {similarItems.length === 0 ? (
                <p className="text-sm text-text-secondary">暂无相似推荐</p>
              ) : (
                similarItems.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {item.type === 'github' && <Github className="h-4 w-4" />}
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </a>
                      <span className="text-xs text-text-secondary ml-auto">
                        {item.githubLanguage ?? 'Unknown'}
                      </span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ItemFilters {
  types: string[];
  languages: string[];
  tags: string[];
  dateRange: { start: string; end: string };
  minStars: number;
}

function FilterPanel({
  filters,
  onChange,
  items,
}: {
  filters: ItemFilters;
  onChange: (f: ItemFilters) => void;
  items: Item[];
}) {
  const allTypes = useMemo(() => Array.from(new Set(items.map(i => i.type))), [items]);
  const allLanguages = useMemo(
    () => Array.from(new Set(items.map(i => i.githubLanguage).filter((l): l is string => !!l))),
    [items]
  );
  const allTags = useMemo(
    () => Array.from(new Set(items.flatMap(i => i.tags ?? []))).sort(),
    [items]
  );

  const toggle = (key: keyof ItemFilters, value: string) => {
    const list = filters[key] as string[];
    const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
    onChange({ ...filters, [key]: next });
  };

  const clear = () => {
    onChange({ types: [], languages: [], tags: [], dateRange: { start: '', end: '' }, minStars: 0 });
  };

  return (
    <div className="border-b border-border p-4 bg-bg-secondary space-y-4">
      <div className="flex flex-wrap gap-6">
        <FilterGroup label="类型">
          {allTypes.map(type => (
            <label key={type} className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={filters.types.includes(type)}
                onChange={() => toggle('types', type)}
              />
              {typeLabel(type)}
            </label>
          ))}
        </FilterGroup>

        <FilterGroup label="语言">
          {allLanguages.map(lang => (
            <label key={lang} className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={filters.languages.includes(lang)}
                onChange={() => toggle('languages', lang)}
              />
              {lang}
            </label>
          ))}
        </FilterGroup>

        <FilterGroup label="标签">
          <div className="flex flex-wrap gap-2 max-w-md">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggle('tags', tag)}
                className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                  filters.tags.includes(tag)
                    ? 'bg-accent text-white border-accent'
                    : 'border-border text-text-secondary hover:border-accent'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </FilterGroup>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">收藏时间起</label>
          <input
            type="date"
            className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
            value={filters.dateRange.start}
            onChange={e => onChange({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">收藏时间止</label>
          <input
            type="date"
            className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
            value={filters.dateRange.end}
            onChange={e => onChange({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-tertiary">最低 Stars</label>
          <input
            type="number"
            min={0}
            className="w-32 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
            value={filters.minStars || ''}
            onChange={e => onChange({ ...filters, minStars: Number(e.target.value) || 0 })}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>
          清除筛选
        </Button>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-text-tertiary">{label}</span>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { github: 'GitHub', website: '网站', software: '软件', tool: '工具' };
  return map[type] ?? type;
}

function filterItems(items: Item[], filters: ItemFilters): Item[] {
  return items.filter(item => {
    if (filters.types.length > 0 && !filters.types.includes(item.type)) return false;
    if (filters.languages.length > 0 && !filters.languages.includes(item.githubLanguage ?? '')) return false;
    if (filters.tags.length > 0 && !filters.tags.some(t => item.tags?.includes(t))) return false;
    if (filters.minStars > 0 && (item.githubStars ?? 0) < filters.minStars) return false;
    if (filters.dateRange.start && item.createdAt < filters.dateRange.start) return false;
    if (filters.dateRange.end && item.createdAt > filters.dateRange.end + 'T23:59:59') return false;
    return true;
  });
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
