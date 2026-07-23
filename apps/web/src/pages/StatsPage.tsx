import { useEffect, useMemo, useRef } from 'react';
import {
  buildStatsSummary,
  getTypeDistribution,
  getLanguageDistribution,
  getTagDistribution,
  getStarDistribution,
  getItemsOverTime,
  getTopStarredItems,
} from '@starvault/core';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@starvault/ui';
import { useAppStore } from '../stores/appStore.js';
import { BarChart3, PieChart, TrendingUp, Star, Tag, Github, Globe, Wrench, Box, Archive } from 'lucide-react';
import * as echarts from 'echarts';

export default function StatsPage() {
  const store = useAppStore();
  const items = store.items;
  const summary = useMemo(() => buildStatsSummary(items), [items]);
  const typeDist = useMemo(() => getTypeDistribution(items), [items]);
  const langDist = useMemo(() => getLanguageDistribution(items, 15), [items]);
  const tagDist = useMemo(() => getTagDistribution(items, 20), [items]);
  const starDist = useMemo(() => getStarDistribution(items), [items]);
  const timeSeries = useMemo(() => getItemsOverTime(items, 'month'), [items]);
  const topItems = useMemo(() => getTopStarredItems(items, 10), [items]);

  const typeChartRef = useRef<HTMLDivElement>(null);
  const langChartRef = useRef<HTMLDivElement>(null);
  const tagChartRef = useRef<HTMLDivElement>(null);
  const starChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const charts: echarts.ECharts[] = [];

    if (typeChartRef.current) {
      const chart = echarts.init(typeChartRef.current);
      chart.setOption({
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            data: typeDist.map(d => ({ name: typeLabel(d.name), value: d.count })),
          },
        ],
      });
      charts.push(chart);
    }

    if (langChartRef.current) {
      const chart = echarts.init(langChartRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: langDist.map(d => d.name).reverse() },
        series: [{ type: 'bar', data: langDist.map(d => d.count).reverse(), itemStyle: { color: '#3b82f6' } }],
      });
      charts.push(chart);
    }

    if (tagChartRef.current) {
      const chart = echarts.init(tagChartRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: tagDist.map(d => d.name), axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: tagDist.map(d => d.count), itemStyle: { color: '#8b5cf6' } }],
      });
      charts.push(chart);
    }

    if (starChartRef.current) {
      const chart = echarts.init(starChartRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: starDist.map(d => d.range) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: starDist.map(d => d.count), itemStyle: { color: '#f59e0b' } }],
      });
      charts.push(chart);
    }

    if (trendChartRef.current) {
      const chart = echarts.init(trendChartRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['新增', '累计'], textStyle: { color: schemeText() } },
        xAxis: { type: 'category', data: timeSeries.map(d => d.date) },
        yAxis: { type: 'value' },
        series: [
          { name: '新增', type: 'bar', data: timeSeries.map(d => d.count), itemStyle: { color: '#3b82f6' } },
          { name: '累计', type: 'line', data: timeSeries.map(d => d.cumulative), smooth: true, itemStyle: { color: '#10b981' } },
        ],
      });
      charts.push(chart);
    }

    const handleResize = () => charts.forEach(c => c.resize());
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      charts.forEach(c => c.dispose());
    };
  }, [items, typeDist, langDist, tagDist, starDist, timeSeries]);

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        暂无数据，请先同步 GitHub Stars 或导入收藏
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-2xl font-bold">统计面板</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<Box className="h-5 w-5" />} label="总项目" value={summary.total} />
        <SummaryCard icon={<Github className="h-5 w-5" />} label="GitHub" value={summary.github} />
        <SummaryCard icon={<Globe className="h-5 w-5" />} label="网站" value={summary.website} />
        <SummaryCard icon={<Wrench className="h-5 w-5" />} label="工具" value={summary.tool} />
        <SummaryCard icon={<Star className="h-5 w-5" />} label="总 Stars" value={summary.totalStars.toLocaleString()} />
        <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="平均 Stars" value={summary.averageStars.toLocaleString()} />
        <SummaryCard icon={<Tag className="h-5 w-5" />} label="有标签" value={summary.withTags} />
        <SummaryCard icon={<Archive className="h-5 w-5" />} label="已归档" value={summary.archived} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="类型分布" icon={<PieChart className="h-5 w-5" />}>
          <div ref={typeChartRef} className="h-64" />
        </ChartCard>

        <ChartCard title="语言分布 Top 15" icon={<BarChart3 className="h-5 w-5" />}>
          <div ref={langChartRef} className="h-64" />
        </ChartCard>

        <ChartCard title="标签统计 Top 20" icon={<Tag className="h-5 w-5" />}>
          <div ref={tagChartRef} className="h-64" />
        </ChartCard>

        <ChartCard title="Stars 分布" icon={<Star className="h-5 w-5" />}>
          <div ref={starChartRef} className="h-64" />
        </ChartCard>
      </div>

      <ChartCard title="收藏增长趋势" icon={<TrendingUp className="h-5 w-5" />}>
        <div ref={trendChartRef} className="h-72" />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
              <Star className="h-5 w-5" />
            </span>
            <span className="flex h-5 items-center leading-none">高星项目 Top 10</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary">
                <span className="w-6 text-center text-text-tertiary">{index + 1}</span>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="flex-1 hover:underline truncate">
                  {item.title}
                </a>
                <Badge>⭐ {item.githubStars?.toLocaleString()}</Badge>
                {item.githubLanguage && <Badge>{item.githubLanguage}</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
        <div className="flex flex-col justify-center">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-text-tertiary leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">{icon}</span>
          <span className="flex h-5 items-center leading-none">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { github: 'GitHub', website: '网站', software: '软件', tool: '工具' };
  return map[type] ?? type;
}

function schemeText(): string {
  return document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a';
}
