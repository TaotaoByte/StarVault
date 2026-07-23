import { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import type { Item } from '@starvault/core';

const MOCK_ITEMS: Item[] = [
  {
    id: '1',
    type: 'github',
    sourceUrl: 'https://github.com/TaotaoByte/StarVault',
    title: 'StarVault',
    description: 'AI驱动的全平台收藏管理工具',
    githubOwner: 'TaotaoByte',
    githubRepo: 'StarVault',
    githubStars: 0,
    githubForks: 0,
    githubLanguage: 'TypeScript',
    githubTopics: ['react', 'sqlite', 'ai'],
    readmeContent: null,
    readmeSummary: null,
    lastSyncAt: null,
    iconUrl: null,
    screenshotUrls: [],
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userCreated: false,
    isArchived: false,
    tags: ['react', 'sqlite'],
  },
];

export default function Index() {
  const [query, setQuery] = useState('');
  const items = MOCK_ITEMS.filter(i => i.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <View className="container">
      <Input
        className="input"
        placeholder="搜索收藏..."
        value={query}
        onInput={e => setQuery(e.detail.value)}
      />
      {items.map(item => (
        <View key={item.id} className="card">
          <Text className="title">{item.title}</Text>
          <Text className="desc" numberOfLines={2}>
            {item.readmeSummary || item.description || '暂无描述'}
          </Text>
          <Text className="meta">{item.githubLanguage ?? 'website'}</Text>
        </View>
      ))}
    </View>
  );
}
