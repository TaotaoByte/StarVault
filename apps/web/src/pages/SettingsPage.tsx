import { useState } from 'react';
import { exportToJson } from '@starvault/core';
import type { AiProviderConfig } from '@starvault/core';

import { Button, Card, CardContent, CardHeader, CardTitle, useTheme } from '@starvault/ui';
import { useAppStore } from '../stores/appStore.js';
import { Github, Key, Cloud, Moon, Sun, Trash2, Download, Shield, Info, RefreshCw } from 'lucide-react';

const RECOMMENDED_MODELS: Record<AiProviderConfig['provider'], { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'o3', label: 'o3' },
    { value: 'o4-mini', label: 'o4-mini' },
  ],
  deepseek: [
    { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
    { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { value: 'deepseek-chat', label: 'DeepSeek Chat (旧版)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
  anthropic: [
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  kimi: [
    { value: 'moonshot-v1-8k', label: 'Moonshot V1 8K' },
    { value: 'moonshot-v1-32k', label: 'Moonshot V1 32K' },
    { value: 'moonshot-v1-128k', label: 'Moonshot V1 128K' },
    { value: 'moonshot-v1-auto', label: 'Moonshot V1 Auto' },
  ],
  glm: [
    { value: 'glm-4-flash', label: 'GLM-4 Flash' },
    { value: 'glm-4-air', label: 'GLM-4 Air' },
    { value: 'glm-4-plus', label: 'GLM-4 Plus' },
    { value: 'glm-4', label: 'GLM-4' },
  ],
  minimax: [
    { value: 'abab6.5s-chat', label: 'abab6.5s' },
    { value: 'abab6.5-chat', label: 'abab6.5' },
    { value: 'MiniMax-Text-01', label: 'MiniMax Text-01' },
  ],
  qwen: [
    { value: 'qwen-plus', label: 'Qwen Plus' },
    { value: 'qwen-turbo', label: 'Qwen Turbo' },
    { value: 'qwen-max', label: 'Qwen Max' },
    { value: 'qwen-coder-plus', label: 'Qwen Coder Plus' },
  ],
  mimo: [],
  custom: [],
};

const DEFAULT_BASE_URLS: Record<AiProviderConfig['provider'], string | undefined> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com',
  anthropic: 'https://api.anthropic.com/v1',
  kimi: 'https://api.moonshot.cn/v1',
  glm: 'https://open.bigmodel.cn/api/paas/v4',
  minimax: 'https://api.minimax.chat/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  mimo: undefined,
  custom: undefined,
};

const DEFAULT_MODELS: Record<AiProviderConfig['provider'], string | undefined> = {
  openai: 'gpt-4o',
  deepseek: 'deepseek-v4-pro',
  anthropic: 'claude-3-7-sonnet-20250219',
  kimi: 'moonshot-v1-8k',
  glm: 'glm-4-flash',
  minimax: 'abab6.5s-chat',
  qwen: 'qwen-plus',
  mimo: undefined,
  custom: undefined,
};

interface SettingsPageProps {
  aiKey?: string;
  aiProvider?: AiProviderConfig['provider'];
  aiBaseUrl?: string;
  aiModel?: string;
  gistId?: string;
  githubToken?: string;
  isSyncing?: boolean;
  isGistSyncing?: boolean;
  onAiKeyChange?: (value: string) => void;
  onAiProviderChange?: (value: AiProviderConfig['provider']) => void;
  onAiBaseUrlChange?: (value: string) => void;
  onAiModelChange?: (value: string) => void;
  onGistIdChange?: (value: string) => void;
  onSync?: () => void;
  onGistSync?: () => void;
}

export default function SettingsPage({
  aiKey: propAiKey,
  aiProvider: propAiProvider,
  aiBaseUrl: propAiBaseUrl,
  aiModel: propAiModel,
  gistId: propGistId,
  githubToken: propGithubToken,
  isSyncing,
  isGistSyncing,
  onAiKeyChange,
  onAiProviderChange,
  onAiBaseUrlChange,
  onAiModelChange,
  onGistIdChange,
  onSync,
  onGistSync,
}: SettingsPageProps) {
  const store = useAppStore();
  const { theme, toggle } = useTheme();
  const [localAiKey, setLocalAiKey] = useState(localStorage.getItem('sv-ai-key') ?? '');
  const [localAiProvider, setLocalAiProvider] = useState<AiProviderConfig['provider']>(
    (localStorage.getItem('sv-ai-provider') as AiProviderConfig['provider']) ?? 'openai'
  );
  const [localAiBaseUrl, setLocalAiBaseUrl] = useState(localStorage.getItem('sv-ai-baseurl') ?? '');
  const [localAiModel, setLocalAiModel] = useState(localStorage.getItem('sv-ai-model') ?? '');
  const [localGistId, setLocalGistId] = useState(localStorage.getItem('sv-gist-id') ?? '');
  const aiKey = propAiKey ?? localAiKey;
  const aiProvider = propAiProvider ?? localAiProvider;
  const aiBaseUrl = propAiBaseUrl ?? localAiBaseUrl;
  const aiModel = propAiModel ?? localAiModel;
  const gistId = propGistId ?? localGistId;
  const githubToken = propGithubToken ?? store.githubToken;
  const [message, setMessage] = useState('');

  const saveAiKey = (value: string) => {
    setLocalAiKey(value);
    localStorage.setItem('sv-ai-key', value);
    onAiKeyChange?.(value);
    setMessage('AI Key 已保存');
  };

  const saveAiProvider = (value: AiProviderConfig['provider']) => {
    setLocalAiProvider(value);
    localStorage.setItem('sv-ai-provider', value);
    onAiProviderChange?.(value);
    // 切换服务商时，如果当前模型不在新服务商推荐列表中，则清空以使用默认模型
    const validModels = new Set(RECOMMENDED_MODELS[value].map(m => m.value));
    if (aiModel && value !== 'custom' && value !== 'mimo' && !validModels.has(aiModel)) {
      setLocalAiModel('');
      localStorage.removeItem('sv-ai-model');
      onAiModelChange?.('');
    }
    setMessage('AI 服务商已保存');
  };

  const saveAiBaseUrl = (value: string) => {
    setLocalAiBaseUrl(value);
    localStorage.setItem('sv-ai-baseurl', value);
    onAiBaseUrlChange?.(value);
    setMessage('AI 接口地址已保存');
  };

  const saveAiModel = (value: string) => {
    setLocalAiModel(value);
    localStorage.setItem('sv-ai-model', value);
    onAiModelChange?.(value);
    setMessage('AI 模型已保存');
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
    localStorage.removeItem('sv-ai-provider');
    localStorage.removeItem('sv-ai-baseurl');
    localStorage.removeItem('sv-ai-model');
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
          <SectionTitle icon={<Github className="h-5 w-5 text-github" />}>GitHub</SectionTitle>
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
              生成，需要勾选 <strong>gist</strong>、<strong>public_repo</strong> 或 <strong>repo</strong> 权限（gist 用于数据同步，repo 用于拉取 Stars）。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
<SectionTitle icon={<RefreshCw className="h-5 w-5 text-emerald-500" />}>数据同步</SectionTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            从 GitHub Stars 拉取新项目，或通过 Gist 在设备间同步数据库。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onSync} disabled={isSyncing || !githubToken} className="gap-1.5">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </span>
              <span className="flex h-4 items-center leading-none">{isSyncing ? '同步中...' : '同步 GitHub Stars'}</span>
            </Button>
            <Button variant="secondary" onClick={onGistSync} disabled={isGistSyncing || !githubToken} className="gap-1.5">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <RefreshCw className={`h-4 w-4 ${isGistSyncing ? 'animate-spin' : ''}`} />
              </span>
              <span className="flex h-4 items-center leading-none">{isGistSyncing ? '同步中...' : '同步到 Gist'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
<SectionTitle icon={<Key className="h-5 w-5 text-amber-500" />}>AI 服务</SectionTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            用于生成项目摘要、智能标签和向量 Embedding。不填则禁用 AI 功能。
          </p>
          <div className="space-y-2">
            <label className="text-xs text-text-tertiary">AI 服务商</label>
            <select
              value={aiProvider}
              onChange={e => saveAiProvider(e.target.value as AiProviderConfig['provider'])}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Anthropic</option>
              <option value="kimi">Kimi（月之暗面）</option>
              <option value="glm">GLM（智谱）</option>
              <option value="minimax">MiniMax</option>
              <option value="qwen">Qwen（通义千问）</option>
              <option value="mimo">Mimo（自定义接口）</option>
              <option value="custom">自定义 OpenAI 兼容接口</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-text-tertiary">API Key</label>
            <input
              type="password"
              value={aiKey}
              onChange={e => saveAiKey(e.target.value)}
              placeholder={aiProvider === 'deepseek' ? 'sk-...' : 'sk-xxx'}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-text-tertiary">
              接口地址
              <span className="ml-1 text-text-tertiary/70">（留空使用默认地址）</span>
            </label>
            <input
              type="text"
              value={aiBaseUrl}
              onChange={e => saveAiBaseUrl(e.target.value)}
              placeholder={DEFAULT_BASE_URLS[aiProvider] ?? 'https://api.example.com/v1'}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-text-tertiary">
              模型
              <span className="ml-1 text-text-tertiary/70">（留空使用默认模型，也可输入自定义模型名）</span>
            </label>
            <input
              type="text"
              list="ai-model-options"
              value={aiModel}
              onChange={e => saveAiModel(e.target.value)}
              placeholder={DEFAULT_MODELS[aiProvider] ?? '自定义模型名'}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <datalist id="ai-model-options">
              {RECOMMENDED_MODELS[aiProvider].map(m => (
                <option key={m.value} value={m.value} label={m.label} />
              ))}
            </datalist>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
<SectionTitle icon={<Cloud className="h-5 w-5 text-sky-500" />}>云端同步</SectionTitle>
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
<SectionTitle icon={theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}>外观</SectionTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">{theme === 'dark' ? '深色模式' : '浅色模式'}</p>
            <p className="text-sm text-text-secondary">切换界面主题</p>
          </div>
          <Button variant="secondary" onClick={toggle} className="gap-1.5">
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
            <span className="flex h-4 items-center leading-none">切换</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
<SectionTitle icon={<Shield className="h-5 w-5 text-danger" />}>数据管理</SectionTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-secondary">导出备份或清除本地存储的数据。</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport} disabled={!store.db} className="gap-1.5">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <Download className="h-4 w-4" />
              </span>
              <span className="flex h-4 items-center leading-none">导出 JSON</span>
            </Button>
            <Button variant="ghost" onClick={handleClearLocalData} className="gap-1.5 text-danger hover:text-danger">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </span>
              <span className="flex h-4 items-center leading-none">清除本地数据</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
<SectionTitle icon={<Info className="h-5 w-5" />}>关于</SectionTitle>
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

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">{icon}</span>
      <span className="flex h-5 items-center leading-none">{children}</span>
    </CardTitle>
  );
}
