import { useState } from 'react';
import { Button, Input, Badge } from '@starvault/ui';
import type { Item } from '@starvault/core';
import { X, Plus } from 'lucide-react';

interface ItemEditDialogProps {
  item: Item;
  onSave: (item: Item, tags: string[]) => void;
  onClose: () => void;
}

export default function ItemEditDialog({ item, onSave, onClose }: ItemEditDialogProps) {
  const [title, setTitle] = useState(item.title);
  const [sourceUrl, setSourceUrl] = useState(item.sourceUrl);
  const [description, setDescription] = useState(item.description ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [rating, setRating] = useState(item.rating ?? 0);
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = () => {
    if (!title.trim() || !sourceUrl.trim()) return;
    onSave(
      {
        ...item,
        title: title.trim(),
        sourceUrl: sourceUrl.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
        rating: Math.max(0, Math.min(10, Math.round(rating))),
        updatedAt: new Date().toISOString(),
      },
      tags
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] bg-bg-primary/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">编辑项目</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">标题</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="输入标题" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">链接</label>
            <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="输入描述..."
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">评分 / 热度 (0-10)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="w-8 text-right text-sm font-medium text-text-primary">{rating}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <Badge key={tag} color="#8b5cf6" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-white/80"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入标签，按回车添加"
              />
              <Button type="button" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="输入备注..."
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
