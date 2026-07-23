import { useMemo } from 'react';
import { buildStatsSummary, getTopStarredItems, type Item } from '@starvault/core';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@starvault/ui';
import { Github, Star, Tag, Database, Sparkles } from 'lucide-react';

interface ProfilePageProps {
  items: Item[];
  aiKey: string;
  githubToken: string;
}

export default function ProfilePage({ items, aiKey, githubToken }: ProfilePageProps) {
  const summary = useMemo(() => buildStatsSummary(items), [items]);
  const topItems = useMemo(() => getTopStarredItems(items, 10), [items]);

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
          SV
        </div>
        <div>
          <h1 className="text-2xl font-bold">个人主页</h1>
          <p className="text-sm text-text-secondary">StarVault 用户</p>
          <div className="flex gap-2 mt-2">
            {githubToken && <Badge className="bg-emerald-500/20 text-emerald-500">GitHub 已连接</Badge>}
            {aiKey && <Badge className="bg-purple-500/20 text-purple-500">AI 已启用</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ProfileStat icon={<Database className="h-5 w-5" />} label="收藏总数" value={summary.total} />
        <ProfileStat icon={<Github className="h-5 w-5" />} label="仓库" value={summary.github} />
        <ProfileStat icon={<Star className="h-5 w-5" />} label="获得总 Stars" value={summary.totalStars.toLocaleString()} />
        <ProfileStat icon={<Tag className="h-5 w-5" />} label="有标签" value={summary.withTags} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center"><Star className="h-5 w-5" /></span>
              <span className="leading-none">高星仓库 Top 10</span>
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
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="leading-none mt-px">功能状态</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusRow label="GitHub Token" active={!!githubToken} />
            <StatusRow label="OpenAI Key" active={!!aiKey} />
            <StatusRow label="AI 摘要" active={summary.withReadmeSummary > 0} />
            <StatusRow label="向量 Embedding" active={summary.withEmbeddings > 0} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
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

function StatusRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className={`text-xs font-medium ${active ? 'text-emerald-500' : 'text-text-tertiary'}`}>
        {active ? '已启用' : '未配置'}
      </span>
    </div>
  );
}
