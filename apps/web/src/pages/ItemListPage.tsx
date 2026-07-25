import { useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@starvault/ui';
import { Github, Globe, Box, Search, Sparkles, Brain, RefreshCw, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Item } from '@starvault/core';
import { VirtualItemGrid } from '../components/VirtualItemGrid.js';

interface ItemListPageProps {
  type: 'github' | 'website' | 'software' | 'all';
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
  onEditItem?: (item: Item) => void;
  onDeleteItem?: (item: Item) => void;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; emptyText: string }> = {
  all: { label: '全部收藏', icon: <Box className="h-5 w-5" />, emptyText: '暂无收藏数据' },
  github: { label: '仓库列表', icon: <Github className="h-5 w-5" />, emptyText: '暂无仓库数据，点击同步 Stars' },
  website: { label: '网站列表', icon: <Globe className="h-5 w-5" />, emptyText: '暂无网站数据' },
  software: { label: '软件列表', icon: <Box className="h-5 w-5" />, emptyText: '暂无软件数据' },
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
  onEditItem,
  onDeleteItem,
}: ItemListPageProps) {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'created' | 'updated' | 'title' | 'stars'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => i.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = type === 'all' ? items : items.filter(i => i.type === type);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? '').toLowerCase().includes(q) ||
          (i.readmeSummary ?? '').toLowerCase().includes(q) ||
          i.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter(i => selectedTags.every(tag => i.tags?.includes(tag)));
    }
    result = [...result].sort((a, b) => {
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
    return result;
  }, [items, type, query, selectedTags, sortField, sortOrder]);

  const config = typeConfig[type];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            {config.icon}
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-bold leading-tight">{config.label}</h1>
            <p className="text-xs text-text-secondary leading-tight">{filteredItems.length} 个项目</p>
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
          <div className="flex items-center gap-1">
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as typeof sortField)}
              className="h-9 w-28 rounded-lg border border-border bg-bg-primary px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent appearance-none"
            >
              <option value="created">添加时间</option>
              <option value="updated">更新时间</option>
              <option value="title">名称</option>
              <option value="stars">Stars 数</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              title={sortOrder === 'asc' ? '升序' : '降序'}
              className="h-9 w-9 rounded-lg border border-border bg-bg-primary flex items-center justify-center text-text-primary hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>
          </div>
          {type === 'github' && (
            <Button variant="secondary" size="sm" onClick={onSync} disabled={isSyncing || !githubToken} className="gap-1.5">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </span>
              <span className="flex h-4 items-center leading-none">{isSyncing ? '同步中...' : '同步 Stars'}</span>
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onGistSync} disabled={isGistSyncing || !githubToken} className="gap-1.5">
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
              <RefreshCw className={`h-4 w-4 ${isGistSyncing ? 'animate-spin' : ''}`} />
            </span>
            <span className="flex h-4 items-center leading-none">{isGistSyncing ? '同步中...' : '同步 Gist'}</span>
          </Button>
          <Button size="sm" onClick={onAddItem} className="gap-1.5">
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
              <Plus className="h-4 w-4" />
            </span>
            <span className="flex h-4 items-center leading-none">添加</span>
          </Button>
        </div>
      </header>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <span className="text-xs text-text-tertiary">标签筛选：</span>
          {allTags.map(tag => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTags(prev => (active ? prev.filter(t => t !== tag) : [...prev, tag]))
                }
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? 'bg-accent text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {tag}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-text-tertiary hover:text-text-primary underline"
            >
              清除
            </button>
          )}
        </div>
      )}

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
              <Card className="flex flex-col h-[220px] hover:shadow-lg transition-shadow overflow-hidden">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                    {item.type === 'github' && (
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        <Github className="h-4 w-4" />
                      </span>
                    )}
                    <span className="flex h-4 flex-1 items-center leading-none truncate">
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {item.title}
                      </a>
                    </span>
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
                  <div className="flex gap-2 pt-2 flex-wrap flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onGenerateItemTags(item)}
                      disabled={!aiKey}
                      title={aiKey ? 'AI 生成标签' : '请先配置 AI Key'}
                    >
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span className="flex h-4 items-center leading-none">AI标签</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onShowSimilar(item)}>
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        <Brain className="h-4 w-4" />
                      </span>
                      <span className="flex h-4 items-center leading-none">相似</span>
                    </Button>
                    {onEditItem && (
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onEditItem(item)}>
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                          <Pencil className="h-4 w-4" />
                        </span>
                        <span className="flex h-4 items-center leading-none">编辑</span>
                      </Button>
                    )}
                    {onDeleteItem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-danger hover:text-danger"
                        onClick={() => onDeleteItem(item)}
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                          <Trash2 className="h-4 w-4" />
                        </span>
                        <span className="flex h-4 items-center leading-none">删除</span>
                      </Button>
                    )}
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
