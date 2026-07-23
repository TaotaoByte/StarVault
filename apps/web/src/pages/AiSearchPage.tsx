import { useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@starvault/ui';
import { Brain, Search, Sparkles } from 'lucide-react';
import type { Item } from '@starvault/core';
import { semanticSearch, hybridSearch, createAiProvider, findSimilarItems } from '@starvault/core';
import { useAppStore } from '../stores/appStore.js';

interface AiSearchPageProps {
  aiKey: string;
  onGenerateItemTags: (item: Item) => void;
  onShowSimilar: (item: Item) => void;
}

export default function AiSearchPage({ aiKey, onGenerateItemTags, onShowSimilar }: AiSearchPageProps) {
  const store = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'semantic' | 'similar'>('semantic');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [message, setMessage] = useState('');

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
    if (!aiKey) {
      setMessage('请先配置 OpenAI Key');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const ai = createAiProvider({ provider: 'openai', apiKey: aiKey });
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

          <div className="flex items-center justify-center gap-2">
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
        {results.map(item => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  {item.title}
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                <Button variant="ghost" size="sm" onClick={() => onGenerateItemTags(item)} disabled={!aiKey} className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  标签
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onShowSimilar(item)} className="gap-1">
                  <Brain className="h-3 w-3" />
                  相似
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && results.length === 0 && query.trim() && !message && (
        <p className="text-center text-sm text-text-secondary">未找到相关项目</p>
      )}
    </div>
  );
}
