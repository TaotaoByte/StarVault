import { useEffect, useMemo, useState } from 'react';
import {
  GitHubApi,
  githubRepoToItem,
  now,
  parseTagSuggestions,
  parseWebsiteInfoSuggestion,
  Repository,
  SqlJsAdapter,
  SUMMARY_PROMPT,
  buildTagPrompt,
  buildWebsiteInfoPrompt,
  truncateReadme,
  GistSyncEngine,
  createAiProvider,
  buildEmbeddingText,
  findSimilarItems,
  migrate,
  type Item,
  type AiProviderConfig,
  type RecommendedItem,
} from '@starvault/core';
import { Button, Card, CardContent, useTheme } from '@starvault/ui';
import {
  LayoutDashboard,
  Github,
  Globe,
  Box,
  Wrench,
  Share2,
  Brain,
  Settings,
  User,
  Moon,
  Sun,
  Sparkles,
  X,
  ArrowLeftRight,
  BarChart3,
} from 'lucide-react';
import pLimit from 'p-limit';
import { useAppStore } from './stores/appStore.js';
import { loadDb, saveDb } from './lib/idb.js';

import DashboardPage from './pages/DashboardPage.js';
import ItemListPage from './pages/ItemListPage.js';
import AiSearchPage from './pages/AiSearchPage.js';
import TagNetworkPage from './pages/TagNetworkPage.js';
import ToolsPage from './pages/ToolsPage.js';
import ImportExportPage from './pages/ImportExportPage.js';
import StatsPage from './pages/StatsPage.js';
import SettingsPage from './pages/SettingsPage.js';
import ProfilePage from './pages/ProfilePage.js';
import ItemEditDialog from './components/ItemEditDialog.js';
import RecommendationsDialog from './components/RecommendationsDialog.js';

type Page =
  | 'dashboard'
  | 'repositories'
  | 'websites'
  | 'software'
  | 'tag-network'
  | 'ai-search'
  | 'toolbox'
  | 'stats'
  | 'import-export'
  | 'settings'
  | 'profile';

export default function App() {
  const { theme, toggle } = useTheme();
  const store = useAppStore();
  const [page, setPage] = useState<Page>('dashboard');
  const [message, setMessage] = useState('');
  const [aiKey, setAiKey] = useState(localStorage.getItem('sv-ai-key') ?? '');
  const [aiProvider, setAiProvider] = useState<AiProviderConfig['provider']>(
    (localStorage.getItem('sv-ai-provider') as AiProviderConfig['provider']) ?? 'openai'
  );
  const [aiBaseUrl, setAiBaseUrl] = useState(localStorage.getItem('sv-ai-baseurl') ?? '');
  const [aiModel, setAiModel] = useState(localStorage.getItem('sv-ai-model') ?? '');
  const [gistId, setGistId] = useState(localStorage.getItem('sv-gist-id') ?? '');
  const [isGistSyncing, setIsGistSyncing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [similarItems, setSimilarItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const saved = await loadDb();
        const adapter = await SqlJsAdapter.create({
          locateFile: file => `/${file}`,
          data: saved,
        });
        await migrate(adapter);
        store.setDb(adapter);
        if (import.meta.env.DEV) {
          (window as unknown as Record<string, unknown>).__sv_db = adapter;
        }
        loadItems(adapter);
        setMessage('数据库已就绪');
        await handleUrlAdd(adapter);
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

  const loadItems = (adapter = store.db) => {
    if (!adapter) return;
    const repo = new Repository(adapter);
    const items = repo.getItems().map(item => ({
      ...item,
      tags: repo.getItemTags(item.id),
    }));
    store.setItems(items);
  };

  const handleUrlAdd = async (adapter = store.db) => {
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
      rating: 0,
      createdAt: now(),
      updatedAt: now(),
      userCreated: true,
      isArchived: false,
    };
    repo.insertItem(item);

    if (aiKey) {
      try {
        const ai = createAiProvider(getAiConfig());
        const response = await ai.chatCompletion(buildWebsiteInfoPrompt(item));
        const suggestion = parseWebsiteInfoSuggestion(response);
        if (suggestion) {
          if (suggestion.description) {
            repo.updateItem({ id: item.id, description: suggestion.description });
          }
          enrichAndInsert(repo, item, suggestion.tags, true);
        }
        setMessage(`已添加并生成简介: ${item.title}`);
      } catch {
        setMessage(`已添加收藏: ${item.title}`);
      }
    } else {
      setMessage(`已添加收藏: ${item.title}`);
    }

    loadItems(adapter);

    params.delete('addUrl');
    params.delete('addTitle');
    params.delete('addNotes');
    const newSearch = params.toString();
    window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
  };

  const handleSync = async () => {
    if (!store.db || !store.githubToken) {
      setMessage('请先配置 GitHub Token');
      setPage('settings');
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
                const ai = createAiProvider(getAiConfig());
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
    if (!store.db || !store.githubToken) {
      setMessage('请先配置 GitHub Token');
      setPage('settings');
      return;
    }
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
      setMessage('请先配置 AI Key');
      setPage('settings');
      return;
    }
    setIsEmbedding(true);
    setMessage('正在生成向量 Embedding...');
    try {
      const ai = createAiProvider(getAiConfig());
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
      setMessage('请先配置 AI Key');
      setPage('settings');
      return;
    }
    setIsTagging(true);
    setMessage('正在生成 AI 标签与简介...');
    try {
      const ai = createAiProvider(getAiConfig());
      const repo = new Repository(store.db);
      const items = repo.getItems().filter(item => repo.getItemTags(item.id).length === 0);
      const limit = pLimit(5);
      await Promise.all(
        items.map(item =>
          limit(async () => {
            const isWebsiteOrSoftware = item.type === 'website' || item.type === 'software';
            if (isWebsiteOrSoftware) {
              const response = await ai.chatCompletion(buildWebsiteInfoPrompt(item));
              const suggestion = parseWebsiteInfoSuggestion(response);
              if (suggestion) {
                if (suggestion.description && !item.description?.trim()) {
                  repo.updateItem({ id: item.id, description: suggestion.description });
                }
                enrichAndInsert(repo, item, suggestion.tags, true);
              }
            } else {
              const response = await ai.chatCompletion(buildTagPrompt(item));
              const suggestions = parseTagSuggestions(response);
              enrichAndInsert(repo, item, suggestions, true);
            }
          })
        )
      );
      loadItems();
      setMessage(`已为 ${items.length} 个项目尝试生成标签`);
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
      const ai = aiKey ? createAiProvider(getAiConfig()) : null;
      const results = await findSimilarItems(store.db, ai, item, { limit: 10 });
      setSimilarItems(results.map(r => r.item));
    } catch (err) {
      setMessage(`相似推荐失败: ${(err as Error).message}`);
    }
  };

  const handleGenerateItemTags = async (item: Item) => {
    if (!store.db || !aiKey) {
      setMessage('请先配置 AI Key');
      setPage('settings');
      return;
    }
    const isWebsiteOrSoftware = item.type === 'website' || item.type === 'software';
    setMessage(`正在为 ${item.title} 生成${isWebsiteOrSoftware ? '简介和标签' : '标签'}...`);
    try {
      const ai = createAiProvider(getAiConfig());
      const repo = new Repository(store.db);
      if (isWebsiteOrSoftware) {
        const response = await ai.chatCompletion(buildWebsiteInfoPrompt(item));
        const suggestion = parseWebsiteInfoSuggestion(response);
        if (!suggestion || suggestion.tags.length === 0) {
          setMessage(`AI 未返回有效结果，请检查模型是否支持当前提示词格式`);
          return;
        }
        if (suggestion.description && !item.description?.trim()) {
          repo.updateItem({ id: item.id, description: suggestion.description });
        }
        enrichAndInsert(repo, item, suggestion.tags, true);
        loadItems();
        setMessage(`已为 ${item.title} 生成简介和 ${suggestion.tags.length} 个标签`);
      } else {
        const response = await ai.chatCompletion(buildTagPrompt(item));
        const suggestions = parseTagSuggestions(response);
        if (suggestions.length === 0) {
          setMessage(`AI 未返回有效标签，请检查模型是否支持当前提示词格式`);
          return;
        }
        enrichAndInsert(repo, item, suggestions, true);
        loadItems();
        setMessage(`已为 ${item.title} 生成 ${suggestions.length} 个标签`);
      }
    } catch (err) {
      setMessage(`标签生成失败: ${(err as Error).message}`);
    }
  };

  const addManualItem = async (type: Item['type'] = 'website') => {
    if (!store.db) return;
    const title = prompt('输入标题');
    const url = prompt('输入 URL');
    if (!title || !url) return;
    const repo = new Repository(store.db);
    const item: Item = {
      id: crypto.randomUUID(),
      type,
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
      rating: 0,
      createdAt: now(),
      updatedAt: now(),
      userCreated: true,
      isArchived: false,
    };
    repo.insertItem(item);

    const isWebsiteOrSoftware = type === 'website' || type === 'software';
    if (isWebsiteOrSoftware && aiKey) {
      try {
        setMessage(`正在为 ${item.title} 生成简介和标签...`);
        const ai = createAiProvider(getAiConfig());
        const response = await ai.chatCompletion(buildWebsiteInfoPrompt(item));
        const suggestion = parseWebsiteInfoSuggestion(response);
        if (suggestion) {
          if (suggestion.description) {
            repo.updateItem({ id: item.id, description: suggestion.description });
          }
          enrichAndInsert(repo, item, suggestion.tags, true);
        }
        setMessage(`已添加并生成简介: ${item.title}`);
      } catch {
        setMessage(`已添加: ${item.title}`);
      }
    } else {
      setMessage(`已添加: ${item.title}`);
    }
    loadItems();
  };

  const addRecommendedItem = (recommended: RecommendedItem) => {
    if (!store.db) return;
    const repo = new Repository(store.db);
    const item: Item = {
      id: crypto.randomUUID(),
      type: recommended.type,
      sourceUrl: recommended.sourceUrl,
      title: recommended.title,
      description: recommended.description,
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
      rating: recommended.rating,
      createdAt: now(),
      updatedAt: now(),
      userCreated: true,
      isArchived: false,
    };
    repo.insertItem(item);
    repo.setItemTags(item.id, recommended.tags);
    loadItems();
  };

  const addAllRecommendedItems = (items: RecommendedItem[]) => {
    for (const item of items) {
      addRecommendedItem(item);
    }
    setMessage(`已添加 ${items.length} 个推荐项目`);
  };

  const handleUpdateItem = (item: Item, tags: string[]) => {
    if (!store.db) return;
    const repo = new Repository(store.db);
    repo.updateItem({
      id: item.id,
      title: item.title,
      sourceUrl: item.sourceUrl,
      description: item.description,
      notes: item.notes,
      rating: item.rating,
      updatedAt: item.updatedAt,
    });
    repo.setItemTags(item.id, tags);
    loadItems();
    setEditingItem(null);
    setMessage('已保存');
  };

  const getAiConfig = (): AiProviderConfig => {
    let baseUrl = aiBaseUrl;
    let model = aiModel;
    if (!baseUrl) {
      if (aiProvider === 'deepseek') baseUrl = 'https://api.deepseek.com';
      else if (aiProvider === 'openai') baseUrl = 'https://api.openai.com/v1';
      else if (aiProvider === 'anthropic') baseUrl = 'https://api.anthropic.com/v1';
      else if (aiProvider === 'kimi') baseUrl = 'https://api.moonshot.cn/v1';
      else if (aiProvider === 'glm') baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
      else if (aiProvider === 'minimax') baseUrl = 'https://api.minimax.chat/v1';
      else if (aiProvider === 'qwen') baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    }
    if (!model) {
      if (aiProvider === 'deepseek') model = 'deepseek-v4-pro';
      else if (aiProvider === 'openai') model = 'gpt-4o';
      else if (aiProvider === 'anthropic') model = 'claude-3-7-sonnet-20250219';
      else if (aiProvider === 'kimi') model = 'moonshot-v1-8k';
      else if (aiProvider === 'glm') model = 'glm-4-flash';
      else if (aiProvider === 'minimax') model = 'abab6.5s-chat';
      else if (aiProvider === 'qwen') model = 'qwen-plus';
    }
    return { provider: aiProvider, apiKey: aiKey, baseUrl, model };
  };

  const handleDeleteItem = (item: Item) => {
    if (!store.db) return;
    if (!confirm(`确定要删除 "${item.title}" 吗？`)) return;
    const repo = new Repository(store.db);
    repo.deleteItem(item.id);
    loadItems();
    setMessage('已删除');
  };

  const pageType = useMemo(() => {
    switch (page) {
      case 'repositories':
        return 'github';
      case 'websites':
        return 'website';
      case 'software':
        return 'software';
      default:
        return 'all';
    }
  }, [page]);

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary">
      <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-bg-secondary/70 backdrop-blur-xl border-r border-white/10 dark:border-white/5 p-4 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-purple-500 text-white shadow-lg shadow-accent/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">StarVault</h1>
            <p className="text-[10px] text-text-tertiary">AI 收藏管理</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto">
          <NavGroup title="概览">
            <SidebarButton active={page === 'dashboard'} onClick={() => setPage('dashboard')} icon={<LayoutDashboard className="h-4 w-4" />}>
              仪表盘
            </SidebarButton>
            <SidebarButton active={page === 'ai-search'} onClick={() => setPage('ai-search')} icon={<Brain className="h-4 w-4" />}>
              AI 搜索
            </SidebarButton>
          </NavGroup>

          <NavGroup title="收藏">
            <SidebarButton active={page === 'repositories'} onClick={() => setPage('repositories')} icon={<Github className="h-4 w-4" />}>
              仓库列表
            </SidebarButton>
            <SidebarButton active={page === 'websites'} onClick={() => setPage('websites')} icon={<Globe className="h-4 w-4" />}>
              网站列表
            </SidebarButton>
            <SidebarButton active={page === 'software'} onClick={() => setPage('software')} icon={<Box className="h-4 w-4" />}>
              软件列表
            </SidebarButton>
          </NavGroup>

          <NavGroup title="发现">
            <SidebarButton active={page === 'tag-network'} onClick={() => setPage('tag-network')} icon={<Share2 className="h-4 w-4" />}>
              标签网络
            </SidebarButton>
            <SidebarButton active={page === 'stats'} onClick={() => setPage('stats')} icon={<BarChart3 className="h-4 w-4" />}>
              统计面板
            </SidebarButton>
            <SidebarButton active={page === 'toolbox'} onClick={() => setPage('toolbox')} icon={<Wrench className="h-4 w-4" />}>
              工具箱
            </SidebarButton>
            <SidebarButton active={page === 'import-export'} onClick={() => setPage('import-export')} icon={<ArrowLeftRight className="h-4 w-4" />}>
              导入导出
            </SidebarButton>
          </NavGroup>
        </nav>

        <div className="space-y-1 border-t border-white/10 dark:border-white/5 pt-3">
          <SidebarButton active={page === 'profile'} onClick={() => setPage('profile')} icon={<User className="h-4 w-4" />}>
            个人主页
          </SidebarButton>
          <SidebarButton active={page === 'settings'} onClick={() => setPage('settings')} icon={<Settings className="h-4 w-4" />}>
            设置
          </SidebarButton>
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[2.5rem] text-sm text-text-secondary transition-colors hover:bg-white/10"
          >
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
            <span className="flex h-4 items-center leading-none">{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden pl-60">
        {message && (
          <div className="z-30 flex items-center justify-between gap-4 border-b border-border/50 bg-bg-secondary/80 backdrop-blur px-6 py-2 text-sm text-text-secondary">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-text-tertiary hover:text-text-primary">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <X className="h-4 w-4" />
              </span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          {page === 'dashboard' && (
            <DashboardPage
              items={store.items}
              aiKey={aiKey}
              githubToken={store.githubToken}
              isSyncing={store.isSyncing}
              isGistSyncing={isGistSyncing}
              isEmbedding={isEmbedding}
              isTagging={isTagging}
              onSync={handleSync}
              onGistSync={handleGistSync}
              onGenerateTags={handleGenerateTags}
              onGenerateEmbeddings={handleGenerateEmbeddings}
              onAddItem={addManualItem}
              onViewType={type => {
                if (type === 'github') setPage('repositories');
                else if (type === 'website') setPage('websites');
                else if (type === 'software') setPage('software');
                else if (type === 'tool') setPage('toolbox');
                else setPage('repositories');
              }}
            />
          )}

          {(page === 'repositories' || page === 'websites' || page === 'software') && (
            <ItemListPage
              type={pageType as 'github' | 'website' | 'software'}
              items={store.items}
              aiKey={aiKey}
              githubToken={store.githubToken}
              isSyncing={store.isSyncing}
              isGistSyncing={isGistSyncing}
              onSync={handleSync}
              onGistSync={handleGistSync}
              onGenerateItemTags={handleGenerateItemTags}
              onShowSimilar={handleShowSimilar}
              onAddItem={() => addManualItem(pageType as 'github' | 'website' | 'software' | 'tool')}
              onShowRecommendations={() => setShowRecommendations(true)}
              onEditItem={setEditingItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {page === 'ai-search' && (
            <AiSearchPage
              aiConfig={getAiConfig()}
              onGenerateItemTags={handleGenerateItemTags}
              onShowSimilar={handleShowSimilar}
              onEditItem={setEditingItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {page === 'tag-network' && <TagNetworkPage items={store.items} />}

          {page === 'toolbox' && (
            <div className="h-full overflow-hidden">
              <ToolsPage />
            </div>
          )}

          {page === 'import-export' && (
            <ImportExportPage onImported={() => loadItems()} />
          )}

          {page === 'stats' && <StatsPage />}

          {page === 'settings' && (
            <SettingsPage
              aiKey={aiKey}
              aiProvider={aiProvider}
              aiBaseUrl={aiBaseUrl}
              aiModel={aiModel}
              gistId={gistId}
              githubToken={store.githubToken}
              isSyncing={store.isSyncing}
              isGistSyncing={isGistSyncing}
              onAiKeyChange={setAiKey}
              onAiProviderChange={value => {
                setAiProvider(value);
                localStorage.setItem('sv-ai-provider', value);
              }}
              onAiBaseUrlChange={value => {
                setAiBaseUrl(value);
                localStorage.setItem('sv-ai-baseurl', value);
              }}
              onAiModelChange={value => {
                setAiModel(value);
                localStorage.setItem('sv-ai-model', value);
              }}
              onGistIdChange={setGistId}
              onSync={handleSync}
              onGistSync={handleGistSync}
            />
          )}

          {page === 'profile' && <ProfilePage items={store.items} aiKey={aiKey} githubToken={store.githubToken} />}
        </div>
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[80vh] bg-bg-primary/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">与「{selectedItem.title}」相似的项目</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  <X className="h-4 w-4" />
                </span>
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {similarItems.length === 0 ? (
                <p className="text-sm text-text-secondary">暂无相似推荐</p>
              ) : (
                similarItems.map(item => (
                  <Card key={item.id} className="bg-bg-secondary/50">
                    <CardContent className="p-3 flex items-center gap-3">
                      {item.type === 'github' && (
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                          <Github className="h-4 w-4" />
                        </span>
                      )}
                      <span className="flex h-4 flex-1 items-center leading-none truncate">
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {item.title}
                  </a>
                </span>
                      <span className="text-xs text-text-secondary">{item.githubLanguage ?? 'Unknown'}</span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <ItemEditDialog
          item={editingItem}
          onSave={handleUpdateItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {showRecommendations && (
        <RecommendationsDialog
          type={pageType === 'github' || pageType === 'all' ? 'all' : pageType}
          existingUrls={store.items.map(i => i.sourceUrl)}
          onAdd={addRecommendedItem}
          onAddAll={addAllRecommendedItems}
          onClose={() => setShowRecommendations(false)}
        />
      )}
    </div>
  );
}

function SidebarButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[2.5rem] text-sm font-medium transition-all ${
        active
          ? 'bg-accent text-white shadow-lg shadow-accent/20'
          : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
      }`}
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{icon}</span>
      <span className="flex h-4 items-center leading-none truncate">{children}</span>
    </button>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{title}</div>
      {children}
    </div>
  );
}

function enrichAndInsert(
  repo: Repository,
  item: Item,
  suggestions: { tag: string; confidence: number; reason: string }[],
  existing = false
): void {
  if (!existing) {
    repo.insertItem(item);
  }
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
