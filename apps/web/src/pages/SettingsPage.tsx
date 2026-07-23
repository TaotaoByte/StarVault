import { useState } from 'react';
import { exportToJson } from '@starvault/core';
import { Button, Card, CardContent, CardHeader, CardTitle, useTheme } from '@starvault/ui';
import { useAppStore } from '../stores/appStore.js';
import { Github, Key, Cloud, Moon, Sun, Trash2, Download, Shield, Info, RefreshCw } from 'lucide-react';

interface SettingsPageProps {
  aiKey?: string;
  gistId?: string;
  githubToken?: string;
  isSyncing?: boolean;
  isGistSyncing?: boolean;
  onAiKeyChange?: (value: string) => void;
  onGistIdChange?: (value: string) => void;
  onSync?: () => void;
  onGistSync?: () => void;
}

export default function SettingsPage({
  aiKey: propAiKey,
  gistId: propGistId,
  githubToken: propGithubToken,
  isSyncing,
  isGistSyncing,
  onAiKeyChange,
  onGistIdChange,
  onSync,
  onGistSync,
}: SettingsPageProps) {
  const store = useAppStore();
  const { theme, toggle } = useTheme();
  const [localAiKey, setLocalAiKey] = useState(localStorage.getItem('sv-ai-key') ?? '');
  const [localGistId, setLocalGistId] = useState(localStorage.getItem('sv-gist-id') ?? '');
  const aiKey = propAiKey ?? localAiKey;
  const gistId = propGistId ?? localGistId;
  const githubToken = propGithubToken ?? store.githubToken;
  const [message, setMessage] = useState('');

  const saveAiKey = (value: string) => {
    setLocalAiKey(value);
    localStorage.setItem('sv-ai-key', value);
    onAiKeyChange?.(value);
    setMessage('OpenAI Key 已保存');
  };

  const saveGistId = (value: string) => {
    setLocalGistId(value);
    localStorage.setItem('sv-gist-id', value);
    onGistIdChange?.(value);
    setMessage('Gist ID 已保存');
  };

  const handleExport = () => {
    if (!store.db) {
      setMessage('数据库未就绪');
      return;
    }
    const data = exportToJson(store.db);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('数据已导出');
  };

  const handleClearLocalData = () => {
    if (!confirm('确定要清除本地所有数据吗？此操作不可恢复。')) return;
    localStorage.removeItem('sv-db');
    localStorage.removeItem('sv-ai-key');
    localStorage.removeItem('sv-gist-id');
    setMessage('本地数据已清除，刷新页面后生效');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-text-secondary mt-1">管理密钥、同步与外观</p>
      </div>

      {message && (
        <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-secondary">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5 text-github" />
            GitHub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            用于同步你的 Starred Repositories。Token 仅保存在浏览器本地，不会上传到任何服务器。
          </p>
          <div className="space-y-2">
            <label className="text-xs text-text-tertiary">GitHub Personal Access Token</label>
            <input
              type="password"
              value={store.githubToken}
              onChange={e => store.setGithubToken(e.target.value)}
              placeholder="ghp_xxx"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-text-tertiary">
              在 {' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                GitHub Settings → Developer settings → Personal access tokens
              </a>{' '}
              生成，需要 public_repo 或 repo 权限。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-500" />
            数据同步
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            从 GitHub Stars 拉取新项目，或通过 Gist 在设备间同步数据库。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onSync} disabled={isSyncing || !githubToken} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '同步中...' : '同步 GitHub Stars'}
            </Button>
            <Button variant="secondary" onClick={onGistSync} disabled={isGistSyncing || !githubToken} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isGistSyncing ? 'animate-spin' : ''}`} />
              {isGistSyncing ? '同步中...' : '同步到 Gist'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-500" />
            AI 服务
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            用于生成项目摘要、智能标签和向量 Embedding。不填则禁用 AI 功能。
          </p>
          <div className="space-y-2">
            <label className="text-xs text-text-tertiary">OpenAI API Key</label>
            <input
              type="password"
              value={aiKey}
              onChange={e => saveAiKey(e.target.value)}
              placeholder="sk-xxx"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-sky-500" />
            云端同步
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            通过 GitHub Gist 在多台设备间同步数据库。留空则首次同步自动创建新的 Secret Gist。
          </p>
          <div className="space-y-2">
            <label className="text-xs text-text-tertiary">Gist ID</label>
            <input
              type="text"
              value={gistId}
              onChange={e => saveGistId(e.target.value)}
              placeholder="留空则自动创建"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            外观
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">{theme === 'dark' ? '深色模式' : '浅色模式'}</p>
            <p className="text-sm text-text-secondary">切换界面主题</p>
          </div>
          <Button variant="secondary" onClick={toggle} className="gap-2">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            切换
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-danger" />
            数据管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-secondary">导出备份或清除本地存储的数据。</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport} disabled={!store.db} className="gap-2">
              <Download className="h-4 w-4" />
              导出 JSON
            </Button>
            <Button variant="ghost" onClick={handleClearLocalData} className="gap-2 text-danger hover:text-danger">
              <Trash2 className="h-4 w-4" />
              清除本地数据
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            关于
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-secondary space-y-1">
          <p>StarVault v0.1.0</p>
          <p>AI 驱动的全平台收藏与工具管理套件</p>
          <p>
            作者：{' '}
            <a href="https://github.com/TaotaoByte" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              TaotaoByte
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
