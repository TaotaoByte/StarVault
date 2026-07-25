import { useMemo, useState } from 'react';
import { Button, Input, Badge } from '@starvault/ui';
import { RECOMMENDED_ITEMS, type RecommendedItem } from '@starvault/core';
import { X, Plus, Check, Globe, Box, Search } from 'lucide-react';

interface RecommendationsDialogProps {
  type: 'website' | 'software' | 'all';
  existingUrls: string[];
  onAdd: (item: RecommendedItem) => void;
  onAddAll: (items: RecommendedItem[]) => void;
  onClose: () => void;
}

export default function RecommendationsDialog({
  type,
  existingUrls,
  onAdd,
  onAddAll,
  onClose,
}: RecommendationsDialogProps) {
  const [query, setQuery] = useState('');
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    let list = type === 'all' ? RECOMMENDED_ITEMS : RECOMMENDED_ITEMS.filter(i => i.type === type);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list.map(item => ({ item, exists: existingUrls.includes(item.sourceUrl) }));
  }, [type, existingUrls, query]);

  const pendingItems = items
    .filter(({ item, exists }) => !exists && !addedUrls.has(item.sourceUrl))
    .map(({ item }) => item);

  const handleAdd = (item: RecommendedItem) => {
    onAdd(item);
    setAddedUrls(prev => new Set(prev).add(item.sourceUrl));
  };

  const handleAddAll = () => {
    onAddAll(pendingItems);
    setAddedUrls(prev => {
      const next = new Set(prev);
      for (const item of pendingItems) next.add(item.sourceUrl);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-bg-primary/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">推荐库</h2>
            <span className="text-xs text-text-tertiary">({pendingItems.length} 个可添加)</span>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              className="pl-8"
              placeholder="搜索推荐项目..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              这里整理了一些高质量的网站和软件，可直接添加到收藏中。
            </p>
            {pendingItems.length > 0 && (
              <Button size="sm" onClick={handleAddAll} className="gap-1.5">
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="flex h-4 items-center leading-none">一键添加全部</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-sm text-text-secondary py-8">暂无匹配的推荐项目</div>
          ) : (
            items.map(({ item, exists }) => {
              const added = addedUrls.has(item.sourceUrl);
              return (
                <div
                  key={item.sourceUrl}
                  className="flex items-start gap-3 rounded-xl border border-border bg-bg-secondary/50 p-3"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    {item.type === 'website' ? <Globe className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {item.title}
                      </a>
                      {item.rating > 0 && <Badge className="text-xs">🔥 {item.rating}</Badge>}
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.tags.map(tag => (
                        <Badge key={tag} color="#8b5cf6" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={added || exists ? 'secondary' : 'primary'}
                    disabled={added || exists}
                    onClick={() => handleAdd(item)}
                    className="flex-shrink-0 gap-1.5"
                  >
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                      {added || exists ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                    <span className="flex h-4 items-center leading-none">{added || exists ? '已添加' : '添加'}</span>
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
