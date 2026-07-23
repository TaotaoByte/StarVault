import { useMemo } from 'react';
import {
  buildStatsSummary,
  getItemsOverTime,
  getTopStarredItems,
  type Item,
} from '@starvault/core';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@starvault/ui';
import { RefreshCw, Plus, Brain, Wand2, Sparkles, Github, Globe, Box, Star, TrendingUp, Clock } from 'lucide-react';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

interface DashboardPageProps {
  items: Item[];
  aiKey: string;
  githubToken: string;
  isSyncing: boolean;
  isGistSyncing: boolean;
  isEmbedding: boolean;
  isTagging: boolean;
  onSync: () => void;
  onGistSync: () => void;
  onGenerateTags: () => void;
  onGenerateEmbeddings: () => void;
  onAddItem: () => void;
  onViewType: (type: string) => void;
}

export default function DashboardPage({
  items,
  aiKey,
  githubToken,
  isSyncing,
  isGistSyncing,
  isEmbedding,
  isTagging,
  onSync,
  onGistSync,
  onGenerateTags,
  onGenerateEmbeddings,
  onAddItem,
  onViewType,
}: DashboardPageProps) {
  const summary = useMemo(() => buildStatsSummary(items), [items]);
  const trend = useMemo(() => getItemsOverTime(items, 'month'), [items]);
  const topItems = useMemo(() => getTopStarredItems(items, 5), [items]);
  const recentItems = useMemo(() => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), [items]);

  const trendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trendRef.current || items.length === 0) return;
    const chart = echarts.init(trendRef.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: trend.map(d => d.date), axisLine: { lineStyle: { color: '#64748b' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#334155', opacity: 0.3 } } },
      series: [
        { type: 'bar', data: trend.map(d => d.count), itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
        { type: 'line', data: trend.map(d => d.cumulative), smooth: true, itemStyle: { color: '#10b981' }, areaStyle: { opacity: 0.1 } },
      ],
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [items, trend]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-sm text-text-secondary mt-1">概览、快捷操作与最近动态</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onGistSync} disabled={isGistSyncing || !githubToken} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${isGistSyncing ? 'animate-spin' : ''}`} />
            {isGistSyncing ? '同步中...' : '同步 Gist'}
          </Button>
          <Button size="sm" onClick={onSync} disabled={isSyncing || !githubToken} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '同步中...' : '同步 Stars'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Box className="h-5 w-5" />} label="全部" value={summary.total} onClick={() => onViewType('')} />
        <StatCard icon={<Github className="h-5 w-5" />} label="仓库" value={summary.github} onClick={() => onViewType('github')} />
        <StatCard icon={<Globe className="h-5 w-5" />} label="网站" value={summary.website} onClick={() => onViewType('website')} />
        <StatCard icon={<Star className="h-5 w-5" />} label="总 Stars" value={summary.totalStars.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              收藏增长趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={trendRef} className="h-64" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近添加
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentItems.length === 0 && <p className="text-sm text-text-secondary">暂无数据</p>}
            {recentItems.map(item => (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-secondary transition-colors"
              >
                {item.type === 'github' ? <Github className="h-4 w-4 text-github" /> : <Globe className="h-4 w-4 text-accent" />}
                <span className="text-sm truncate flex-1">{item.title}</span>
                <span className="text-xs text-text-tertiary">{new Date(item.createdAt).toLocaleDateString()}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              高星仓库 Top 5
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topItems.length === 0 && <p className="text-sm text-text-secondary">暂无数据</p>}
            {topItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary transition-colors">
                <span className="text-sm text-text-tertiary w-5">{idx + 1}</span>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sm hover:underline truncate flex-1">
                  {item.title}
                </a>
                <Badge>⭐ {item.githubStars?.toLocaleString()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              快捷操作
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={onAddItem} className="gap-2">
              <Plus className="h-4 w-4" />
              添加收藏
            </Button>
            <Button variant="secondary" onClick={onGenerateTags} disabled={isTagging || !aiKey} className="gap-2">
              <Wand2 className={`h-4 w-4 ${isTagging ? 'animate-spin' : ''}`} />
              AI 标签
            </Button>
            <Button variant="secondary" onClick={onGenerateEmbeddings} disabled={isEmbedding || !aiKey} className="gap-2">
              <Brain className={`h-4 w-4 ${isEmbedding ? 'animate-spin' : ''}`} />
              生成 Embedding
            </Button>
            <Button variant="secondary" onClick={() => onViewType('github')} className="gap-2">
              <Github className="h-4 w-4" />
              浏览仓库
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string | number; onClick?: () => void }) {
  const content = (
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-accent/10 text-accent">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-text-tertiary">{label}</p>
      </div>
    </CardContent>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left transition-transform hover:scale-[1.02]">
        {content}
      </button>
    );
  }
  return content;
}
