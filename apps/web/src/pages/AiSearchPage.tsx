import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@starvault/ui';
import { Brain, Search, Sparkles, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Item, AiProviderConfig } from '@starvault/core';
import { semanticSearch, hybridSearch, createAiProvider, findSimilarItems } from '@starvault/core';
import { useAppStore } from '../stores/appStore.js';

interface AiSearchPageProps {
  aiConfig: AiProviderConfig;
  onGenerateItemTags: (item: Item) => void;
  onShowSimilar: (item: Item) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
}

export default function AiSearchPage({ aiConfig, onGenerateItemTags, onShowSimilar, onEditItem, onDeleteItem }: AiSearchPageProps) {
  const store = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'semantic' | 'similar'>('semantic');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [message, setMessage] = useState('');
  const [sortField, setSortField] = useState<'relevance' | 'created' | 'updated' | 'title' | 'stars'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedResults = useMemo(() => {
    if (sortField === 'relevance') return results;
    return [...results].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'created':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case 'updated':
          cmp = a.updatedAt.localeCompare(b.updatedAt);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
          break;
        case 'stars':
          cmp = (a.githubStars ?? 0) - (b.githubStars ?? 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [results, sortField, sortOrder]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => runSearch(query), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode, selectedItem]);

  const runSearch = async (q: string) => {
    if (!store.db) return;
    if (!aiConfig.apiKey) {
      setMessage('请先配置 AI Key');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const ai = createAiProvider(aiConfig);
      let searchResults;
      if (mode === 'similar' && selectedItem) {
        searchResults = await findSimilarItems(store.db, ai, selectedItem, { limit: 20 });
      } else {
        if (mode === 'semantic') {
          searchResults = await semanticSearch(store.db, ai, q, { limit: 20 });
        } else {
          searchResults = await hybridSearch(store.db, ai, q, { limit: 20 });
        }
      }
      setResults(searchResults.map(r => r.item));
    } catch (err) {
      setMessage(`搜索失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">AI 搜索</h1>
        <p className="text-sm text-text-secondary">用自然语言描述你想找的内容，AI 会理解语义并返回相关项目</p>
      </div>

      <Card className="bg-gradient-to-br from-accent/5 to-purple-500/5 border-accent/20">
        <CardContent className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <Input
              className="pl-12 py-6 text-lg bg-bg-primary/80"
              placeholder="例如：用于图片压缩的 Python 工具，或者 React 状态管理库..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <Brain className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent ${loading ? 'animate-pulse' : ''}`} />
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {(['semantic', 'similar'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === m ? 'bg-accent text-white' : 'bg-bg-primary text-text-secondary hover:text-text-primary'
                }`}
              >
                {m === 'semantic' ? '语义搜索' : '以项目找相似'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
            <span>排序</span>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as typeof sortField)}
              className="bg-bg-primary border border-border rounded-md px-2 py-1 text-text-primary"
            >
              <option value="relevance">相关度</option>
              <option value="created">添加时间</option>
              <option value="updated">更新时间</option>
              <option value="title">名称</option>
              <option value="stars">Stars 数</option>
            </select>
            {sortField !== 'relevance' && (
              <button
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                title={sortOrder === 'asc' ? '升序' : '降序'}
                className="h-7 w-7 rounded-md border border-border bg-bg-primary flex items-center justify-center text-text-primary hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </button>
            )}
          </div>

          {mode === 'similar' && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>参考项目：</span>
              <select
                value={selectedItem?.id ?? ''}
                onChange={e => {
                  const item = store.items.find(i => i.id === e.target.value);
                  setSelectedItem(item ?? null);
                }}
                className="bg-bg-primary border border-border rounded-md px-2 py-1 text-text-primary"
              >
                <option value="">选择一个项目</option>
                {store.items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {message && <p className="text-sm text-danger text-center">{message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedResults.map(item => (
          <Card key={item.id} className="flex flex-col h-[220px] hover:shadow-lg transition-shadow overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-base truncate">
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  {item.title}
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
              <p className="text-sm text-text-secondary line-clamp-2">
                {item.readmeSummary || item.description || '暂无描述'}
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {item.githubLanguage && <Badge>{item.githubLanguage}</Badge>}
                  {item.githubStars > 0 && <Badge>⭐ {item.githubStars}</Badge>}
                  {item.tags?.map(tag => (
                    <Badge key={tag} color="#8b5cf6">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGenerateItemTags(item)}
                  disabled={!aiConfig.apiKey}
                  className="gap-1.5"
                  title={aiConfig.apiKey ? 'AI 生成标签' : '请先配置 AI Key'}
                >
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="flex h-4 items-center leading-none">AI标签</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onShowSimilar(item)} className="gap-1.5">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <Brain className="h-4 w-4" />
                  </span>
                  <span className="flex h-4 items-center leading-none">相似</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEditItem(item)} className="gap-1.5">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <Pencil className="h-4 w-4" />
                  </span>
                  <span className="flex h-4 items-center leading-none">编辑</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteItem(item)}
                  className="gap-1.5 text-danger hover:text-danger"
                >
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <Trash2 className="h-4 w-4" />
                  </span>
                  <span className="flex h-4 items-center leading-none">删除</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && sortedResults.length === 0 && query.trim() && !message && (
        <p className="text-center text-sm text-text-secondary">未找到相关项目</p>
      )}
    </div>
  );
}
