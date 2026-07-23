import { buildTagNetwork } from '@starvault/core';
import { Card, CardContent, CardHeader, CardTitle } from '@starvault/ui';
import { Share2 } from 'lucide-react';
import { TagNetworkChart } from '../components/TagNetworkChart.js';
import type { Item } from '@starvault/core';

interface TagNetworkPageProps {
  items: Item[];
}

export default function TagNetworkPage({ items }: TagNetworkPageProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-bold leading-tight">标签网络</h1>
            <p className="text-xs text-text-secondary leading-tight">探索标签之间的共现关系</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 min-h-0">
        <CardHeader>
          <CardTitle>标签共现图</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-3rem)]">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-text-secondary">
              暂无数据，请先同步或导入收藏
            </div>
          ) : (
            <TagNetworkChart data={buildTagNetwork(items)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
