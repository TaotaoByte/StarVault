import { useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@starvault/ui';
import { Github, Globe, Box, Wrench, Search, Sparkles, Brain, RefreshCw, Plus } from 'lucide-react';
import type { Item } from '@starvault/core';
import { VirtualItemGrid } from '../components/VirtualItemGrid.js';

interface ItemListPageProps {
  type: 'github' | 'website' | 'software' | 'tool' | 'all';
  items: Item[];
  aiKey: string;
  githubToken: string;
  isSyncing: boolean;
  isGistSyncing: boolean;
  onSync: () => void;
  onGistSync: () => void;
  onGenerateItemTags: (item: Item) => void;
  onShowSimilar: (item: Item) => void;
  onAddItem: () => void;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; emptyText: string }> = {
  all: { label: '全部收藏', icon: <Box className="h-5 w-5" />, emptyText: '暂无收藏数据' },
  github: { label: '仓库列表', icon: <Github className="h-5 w-5" />, emptyText: '暂无仓库数据，点击同步 Stars' },
  website: { label: '网站列表', icon: <Globe className="h-5 w-5" />, emptyText: '暂无网站数据' },
  software: { label: '软件列表', icon: <Box className="h-5 w-5" />, emptyText: '暂无软件数据' },
  tool: { label: '工具列表', icon: <Wrench className="h-5 w-5" />, emptyText: '暂无工具数据' },
};

export default function ItemListPage({
  type,
  items,
  aiKey,
  githubToken,
  isSyncing,
  isGistSyncing,
  onSync,
  onGistSync,
  onGenerateItemTags,
  onShowSimilar,
  onAddItem,
}: ItemListPageProps) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const byType = type === 'all' ? items : items.filter(i => i.type === type);
    if (!query.trim()) return byType;
    const q = query.toLowerCase();
    return byType.filter(
      i =>
        i.title.toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q) ||
        (i.readmeSummary ?? '').toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [items, type, query]);

  const config = typeConfig[type];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">{config.icon}</div>
          <div>
            <h1 className="text-xl font-bold">{config.label}</h1>
            <p className="text-xs text-text-secondary">{filteredItems.length} 个项目</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              className="pl-8 w-56"
              placeholder="搜索..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {type === 'github' && (
            <Button variant="secondary" size="sm" onClick={onSync} disabled={isSyncing || !githubToken} className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '同步中...' : '同步 Stars'}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onGistSync} disabled={isGistSyncing || !githubToken} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${isGistSyncing ? 'animate-spin' : ''}`} />
            {isGistSyncing ? '同步中...' : '同步 Gist'}
          </Button>
          <Button size="sm" onClick={onAddItem} className="gap-1.5">
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary gap-4">
            <Box className="h-12 w-12 opacity-30" />
            <p>{config.emptyText}</p>
          </div>
        ) : (
          <VirtualItemGrid
            items={filteredItems}
            renderItem={(item: Item) => (
              <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
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
                      onClick={() => onGenerateItemTags(item)}
                      disabled={!aiKey}
                    >
                      <Sparkles className="h-3 w-3" />
                      标签
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => onShowSimilar(item)}>
                      <Brain className="h-3 w-3" />
                      相似
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          />
        )}
      </div>
    </div>
  );
}
