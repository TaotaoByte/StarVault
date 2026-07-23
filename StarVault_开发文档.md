# StarVault 开发文档
# AI驱动的全平台收藏与工具管理套件

> 版本：v0.1 | 作者：TaotaoByte | 日期：2026-07-08
> 本文档用于指导AI辅助开发，包含完整的技术架构、数据模型、API设计和开发规范。

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [技术架构总览](#2-技术架构总览)
3. [数据存储方案（零成本优先）](#3-数据存储方案)
4. [核心功能模块设计](#4-核心功能模块设计)
5. [AI知识库系统设计](#5-ai知识库系统设计)
6. [多端同步架构](#6-多端同步架构)
7. [前端架构（React + 小程序）](#7-前端架构)
8. [内置工具设计](#8-内置工具设计)
9. [开发路线图](#9-开发路线图)
10. [开发规范与约定](#10-开发规范与约定)

---

## 1. 项目概述

### 1.1 产品定位

StarVault 是一款面向开发者和极客的全平台收藏管理工具，核心定位：

| 维度 | 描述 |
|------|------|
| **核心功能** | 管理 GitHub Stars、网站书签、软件工具，内置常用开发工具 |
| **差异化** | AI知识库化、自然语言搜索、智能标签网络、相似项目推荐 |
| **目标用户** | 开发者、设计师、技术管理者 |
| **商业模式** | 开源免费 + 可选高级AI功能（用户自带API Key） |

### 1.2 核心功能清单

```
├── 数据管理
│   ├── GitHub Stars 全量/增量同步
│   ├── 网站/软件手动添加 + 浏览器扩展一键收藏
│   ├── 分类管理（文件夹 + 标签体系）
│   └── 数据导入/导出
├── AI能力
│   ├── README自动抓取 + 中文摘要生成
│   ├── 自然语言搜索（跨仓库名、描述、README）
│   ├── AI自动标签建议与标签网络
│   ├── 相似项目/替代品推荐
│   └── 支持 OpenAI / Anthropic / DeepSeek等等兼容接口（用户自带Key）
├── 多端同步
│   ├── Web端（PWA）
│   ├── 桌面端（Electron/Tauri）
│   ├── 移动端（React Native / 小程序）
│   └── 数据零成本同步（GitHub Gist / 私有仓库）
├── 内置工具
│   ├── JSON格式化/校验
│   ├── Base64编解码
│   ├── 正则表达式测试
│   ├── 颜色选择器/转换
│   ├── 时间戳转换
│   ├── 二维码生成
│   └── Markdown预览
└── 用户体验
    ├── 浅色/深色模式切换
    ├── 响应式设计
    └── 离线优先（Local-First）
```

---

## 2. 技术架构总览

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client Layer)                        │
├──────────────┬──────────────┬──────────────┬──────────────────────┤
│   Web (PWA)  │  Desktop App │  Mobile App  │     微信小程序         │
│   (React)    │  (Tauri)     │ (React Native)│   (Taro/UniApp)      │
└──────┬───────┴──────┬───────┴──────┬───────┴──────────┬───────────────┘
       │              │              │                  │
       └──────────────┴──────────────┴──────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   统一API层 (REST)   │
                    │   + GraphQL (可选)   │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌──────────▼──────────┐  ┌──────▼──────┐
│  本地数据库     │  │   向量数据库         │  │  AI服务层   │
│  (SQLite/LMDB) │  │  (SQLite-vec/      │  │ (用户自带   │
│                │  │   pgvector本地版)   │  │  API Key)   │
└───────┬────────┘  └──────────┬──────────┘  └─────────────┘
        │                      │
        └──────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   同步引擎 (Sync)    │
        │  GitHub Gist/Repo   │
        │  + 增量Diff算法      │
        └─────────────────────┘
```

### 2.2 技术栈选择

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| **Web前端** | React 19 + TypeScript + Tailwind CSS + shadcn/ui | 生态成熟，UI组件丰富，深色模式支持好 |
| **桌面端** | Tauri 2.0 (Rust后端) | 包体积小（~3MB），内存占用低，Rust高性能 |
| **移动端** | React Native (Expo) | 一套代码双端，热更新，社区活跃 |
| **小程序** | Taro 4.0 (React语法) | 代码复用率高，支持多端编译 |
| **本地数据库** | SQLite (via `better-sqlite3` / `react-native-sqlite-storage`) | 零配置，单文件，跨平台 |
| **向量检索** | `sqlite-vec` (SQLite扩展) 或 `usearch` | 零额外依赖，本地运行，足够支撑万级数据 |
| **状态管理** | Zustand + TanStack Query | 轻量，支持持久化，服务端状态管理 |
| **同步协议** | CRDT (Yjs) 或 自定义增量Diff | 冲突解决，离线优先 |
| **AI调用** | 用户配置OpenAI/Anthropic API Key | 零服务器成本，隐私安全 |
| **构建工具** | Vite | 极速HMR，生态完善 |

### 2.3 为什么不用Electron？

| 对比项 | Tauri | Electron |
|--------|-------|----------|
| 包体积 | ~3MB | ~150MB |
| 内存占用 | ~50MB | ~200MB |
| 启动速度 | 快 | 慢 |
| 安全性 | Rust原生安全 | 需要额外注意 |
| 学习成本 | 需学Rust（但后端逻辑简单） | 纯JS |

**结论**：Tauri更适合个人项目，包体积小意味着用户更愿意下载试用。

---

## 3. 数据存储方案

### 3.1 核心原则：零服务器成本

```
用户数据存储优先级：
1. 本地 SQLite 数据库（Primary）
2. GitHub Gist / 私有仓库（Sync Backup）
3. 可选：用户自托管的WebDAV / S3
```

### 3.2 数据模型设计

#### 3.2.1 核心实体

```sql
-- 项目/收藏主表
CREATE TABLE items (
    id              TEXT PRIMARY KEY,           -- UUID v4
    type            TEXT NOT NULL,              -- 'github' | 'website' | 'software' | 'tool'
    source_url      TEXT NOT NULL,              -- 原始URL
    title           TEXT NOT NULL,
    description     TEXT,

    -- GitHub特有字段
    github_owner    TEXT,
    github_repo     TEXT,
    github_stars    INTEGER DEFAULT 0,
    github_forks    INTEGER DEFAULT 0,
    github_language TEXT,
    github_topics   TEXT,                       -- JSON数组
    readme_content  TEXT,                       -- 原始README Markdown
    readme_summary  TEXT,                       -- AI生成的中文摘要
    last_sync_at    DATETIME,                 -- 上次GitHub同步时间

    -- 通用字段
    icon_url        TEXT,
    screenshot_urls TEXT,                       -- JSON数组
    notes           TEXT,                       -- 用户备注

    -- 元数据
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_created    BOOLEAN DEFAULT FALSE,       -- 是否用户手动添加
    is_archived     BOOLEAN DEFAULT FALSE
);

-- 标签表
CREATE TABLE tags (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    color       TEXT DEFAULT '#3b82f6',        -- Hex颜色
    description TEXT,
    parent_id   TEXT REFERENCES tags(id),        -- 支持层级标签
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目-标签关联
CREATE TABLE item_tags (
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    tag_id  TEXT REFERENCES tags(id) ON DELETE CASCADE,
    confidence REAL DEFAULT 1.0,                 -- AI标签置信度
    PRIMARY KEY (item_id, tag_id)
);

-- 文件夹/分类表
CREATE TABLE collections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT DEFAULT 'folder',
    color       TEXT,
    parent_id   TEXT REFERENCES collections(id),
    sort_order  INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目-文件夹关联
CREATE TABLE item_collections (
    item_id       TEXT REFERENCES items(id) ON DELETE CASCADE,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, collection_id)
);

-- 向量嵌入表 (用于AI语义搜索)
CREATE TABLE embeddings (
    item_id     TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    embedding   BLOB NOT NULL,                  -- 768维float32数组 (binary存储)
    model       TEXT DEFAULT 'text-embedding-3-small',
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 同步元数据表
CREATE TABLE sync_meta (
    id              INTEGER PRIMARY KEY CHECK (id = 1),  -- 单例表
    last_sync_at    DATETIME,
    sync_target     TEXT,                               -- 'github_gist' | 'github_repo' | 'webdav'
    sync_target_id  TEXT,                               -- Gist ID 或 Repo名
    device_id       TEXT NOT NULL,                      -- 本机唯一标识
    schema_version  INTEGER DEFAULT 1
);

-- 操作日志表 (用于增量同步)
CREATE TABLE change_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT NOT NULL,
    record_id   TEXT NOT NULL,
    operation   TEXT NOT NULL,                      -- 'INSERT' | 'UPDATE' | 'DELETE'
    old_data    TEXT,                               -- JSON
    new_data    TEXT,                               -- JSON
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced      BOOLEAN DEFAULT FALSE,
    sync_retry  INTEGER DEFAULT 0
);
```

#### 3.2.2 向量搜索索引

```sql
-- 使用 sqlite-vec 创建虚拟表
-- 安装: 加载 sqlite-vec 扩展
CREATE VIRTUAL TABLE vec_items USING vec0(
    item_id TEXT PRIMARY KEY,
    embedding FLOAT[768]  -- OpenAI text-embedding-3-small
);

-- 搜索示例：
-- SELECT item_id, distance FROM vec_items 
-- WHERE embedding MATCH vec_normalize(?1) 
-- ORDER BY distance LIMIT 20;
```

### 3.3 GitHub同步存储方案

#### 方案A：GitHub Gist（推荐起步）

```
优点：
- 免费，每个Gist可存多文件
- 有API，支持CRUD
- 天然版本历史
- 无需服务器

限制：
- 单个文件最大1MB
- 总Gist数量无明确限制但建议<1000
- 速率限制：60请求/小时（未认证）/ 5000/小时（认证）

数据分片策略：
- data_v1.json     -- 主数据（items, tags, collections）
- embeddings_v1.bin -- 向量数据（二进制分片）
- changelog.json   -- 增量变更日志
```

#### 方案B：GitHub私有仓库（数据量大时）

```
优点：
- 无单文件大小限制（Git LFS可处理大文件）
- 更好的组织结构
- 支持Git版本控制

数据组织：
/.starvault/
  ├── data/
  │   ├── items/
  │   │   ├── 2024/
  │   │   │   ├── 07/
  │   │   │   │   └── items_202407.json   -- 按月份分片
  │   ├── tags.json
  │   ├── collections.json
  │   └── embeddings/
  │       └── embeddings_202407.bin
  ├── changelog/
  │   └── 20240708_143022.json
  └── meta.json
```

#### 方案C：用户自托管（高级用户）

```
- WebDAV (Nextcloud/ownCloud)
- S3兼容存储 (Cloudflare R2免费10GB/月)
- 自建Sync服务器 (可选，未来扩展)
```

---

## 4. 核心功能模块设计

### 4.1 GitHub Stars同步模块

#### 4.1.1 全量同步流程

```
用户授权 → 获取所有Starred repos列表 → 批量获取详情 → 并行抓取README → AI生成摘要 → 写入本地DB → 生成向量嵌入

技术细节：
1. 分页获取：GitHub API /users/{username}/starred?per_page=100
2. 并发控制：p-limit限制10个并发请求
3. README抓取：raw.githubusercontent.com/{owner}/{repo}/main/README.md
4. 增量标记：记录每个repo的updated_at，下次只同步变更
```

#### 4.1.2 增量同步策略

```typescript
// 增量同步算法
async function incrementalSync() {
  const lastSync = await db.getLastSyncTime();

  // 1. 获取用户所有stars（只取基本元数据，很快）
  const allStars = await githubApi.getAllStarredRepos();

  // 2. 对比本地数据，找出：
  //    - 新增：本地不存在
  //    - 更新：starred_at > lastSync
  //    - 删除：本地存在但GitHub已取消star

  const { added, updated, removed } = diffRepos(localRepos, allStars);

  // 3. 只处理变更项
  for (const repo of [...added, ...updated]) {
    const detail = await githubApi.getRepoDetail(repo.full_name);
    const readme = await fetchReadme(repo.full_name);
    const summary = await aiService.summarize(readme);
    await db.upsertItem({ ...detail, readme_summary: summary });
    await vectorIndex.upsert(await generateEmbedding(detail, summary));
  }

  for (const repo of removed) {
    await db.archiveItem(repo.id);  // 软删除，保留数据
  }

  await db.setLastSyncTime(new Date());
}
```

### 4.2 AI摘要生成模块

#### 4.2.1 Prompt设计

```typescript
const SUMMARY_PROMPT = `你是一个技术文档摘要专家。请根据以下GitHub项目的README内容，生成一份简洁的中文摘要。

要求：
1. 摘要长度控制在100-200字
2. 包含：项目用途、核心功能、技术栈、适用场景
3. 语言简洁专业，适合开发者快速了解项目
4. 如果README是中文，直接提炼；如果是英文，翻译成中文

README内容：
{readme_content}

请输出纯文本摘要，不要Markdown格式：`;
```

#### 4.2.2 流式处理（大README）

```typescript
// README超过8k tokens时，先截断关键部分
function truncateReadme(readme: string): string {
  const sections = parseReadmeSections(readme);
  // 优先保留：Description/Overview, Features, Usage
  const priority = ['description', 'overview', 'features', 'usage', 'getting started'];
  let result = '';
  for (const p of priority) {
    const section = sections.find(s => s.title.toLowerCase().includes(p));
    if (section) result += section.content + '\n';
    if (result.length > 6000) break;  // 控制token数
  }
  return result || readme.slice(0, 6000);
}
```

### 4.3 自然语言搜索模块

#### 4.3.1 混合搜索策略

```typescript
interface SearchResult {
  item: Item;
  score: number;
  matchType: 'semantic' | 'keyword' | 'tag';
}

async function search(query: string): Promise<SearchResult[]> {
  // 1. 语义搜索（向量相似度）
  const queryEmbedding = await ai.embed(query);
  const semanticResults = await vectorSearch(queryEmbedding, limit = 50);

  // 2. 关键词搜索（SQLite FTS5）
  const keywordResults = await ftsSearch(query);

  // 3. 标签搜索
  const tagResults = await tagSearch(query);

  // 4. 融合排序（Reciprocal Rank Fusion）
  return reciprocalRankFusion([semanticResults, keywordResults, tagResults], k=60);
}

// RRF公式：score = Σ(1 / (k + rank))
function reciprocalRankFusion(results: SearchResult[][], k: number): SearchResult[] {
  const scores = new Map<string, number>();

  for (const resultList of results) {
    for (let i = 0; i < resultList.length; i++) {
      const id = resultList[i].item.id;
      const current = scores.get(id) || 0;
      scores.set(id, current + 1 / (k + i + 1));
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ item: getItem(id), score }));
}
```

#### 4.3.2 SQLite FTS5配置

```sql
-- 创建FTS5虚拟表用于全文搜索
CREATE VIRTUAL TABLE items_fts USING fts5(
    title,
    description,
    readme_content,
    readme_summary,
    content='items',        -- 关联主表
    content_rowid='id'
);

-- 自动同步触发器
CREATE TRIGGER items_fts_insert AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, description, readme_content, readme_summary)
    VALUES (new.id, new.title, new.description, new.readme_content, new.readme_summary);
END;

CREATE TRIGGER items_fts_update AFTER UPDATE ON items BEGIN
    UPDATE items_fts SET 
        title = new.title,
        description = new.description,
        readme_content = new.readme_content,
        readme_summary = new.readme_summary
    WHERE rowid = new.id;
END;
```

### 4.4 AI标签网络模块

#### 4.4.1 标签生成策略

```typescript
interface TagSuggestion {
  tag: string;
  confidence: number;  // 0-1
  reason: string;      // AI给出的理由
}

async function generateTags(item: Item): Promise<TagSuggestion[]> {
  const prompt = `根据以下项目信息，生成5-10个最相关的技术标签。

项目：${item.title}
描述：${item.description}
语言：${item.github_language}
Topics：${item.github_topics?.join(', ')}
README摘要：${item.readme_summary}

要求：
1. 标签要具体，避免过于宽泛（如不用"工具"，用"CLI工具"）
2. 包含：技术领域、用途类型、语言/框架
3. 返回JSON格式：{"tags": [{"name": "...", "confidence": 0.95, "reason": "..."}]}
4. 标签名用英文，但reason用中文`;

  const response = await ai.chatCompletion(prompt);
  return JSON.parse(response).tags;
}
```

#### 4.4.2 标签网络可视化

```typescript
// 标签共现网络数据结构
interface TagNetwork {
  nodes: { id: string; name: string; count: number; color: string }[];
  edges: { source: string; target: string; weight: number }[];  // 共现次数
}

// 构建算法：两个标签同时出现在一个项目中的次数
function buildTagNetwork(items: Item[]): TagNetwork {
  const cooccurrence = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const item of items) {
    const tags = item.tags.map(t => t.name);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const key = [tags[i], tags[j]].sort().join('|');
        cooccurrence.set(key, (cooccurrence.get(key) || 0) + 1);
      }
    }
  }

  // 过滤低频标签和弱关联
  const nodes = Array.from(tagCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([name, count]) => ({ id: name, name, count, color: getTagColor(name) }));

  const edges = Array.from(cooccurrence.entries())
    .filter(([, weight]) => weight >= 2)
    .map(([key, weight]) => {
      const [source, target] = key.split('|');
      return { source, target, weight };
    });

  return { nodes, edges };
}
```

### 4.5 相似项目推荐模块

#### 4.5.1 推荐算法

```typescript
interface SimilarItem {
  item: Item;
  similarity: number;
  reasons: string[];  // 为什么推荐
}

async function findSimilarItems(item: Item): Promise<SimilarItem[]> {
  // 1. 向量相似度（语义相似）
  const embedding = await db.getEmbedding(item.id);
  const semanticSimilar = await vectorSearch(embedding, limit = 30);

  // 2. 标签重叠度（Jaccard相似度）
  const tagSimilar = items.filter(other => {
    const intersection = new Set([...item.tags].filter(t => other.tags.has(t)));
    const union = new Set([...item.tags, ...other.tags]);
    return intersection.size / union.size > 0.3;
  });

  // 3. 语言/领域匹配
  const domainSimilar = items.filter(other => 
    other.github_language === item.github_language &&
    other.id !== item.id
  );

  // 4. 融合排序 + 去重
  const candidates = new Map<string, { item: Item; score: number; reasons: string[] }>();

  for (const [list, reason] of [
    [semanticSimilar, '语义相似'],
    [tagSimilar, '标签匹配'],
    [domainSimilar, '同语言/领域']
  ]) {
    for (const result of list) {
      const existing = candidates.get(result.item.id);
      if (existing) {
        existing.score += result.score * 0.3;
        if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      } else {
        candidates.set(result.item.id, {
          item: result.item,
          score: result.score,
          reasons: [reason]
        });
      }
    }
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
```

---

## 5. AI知识库系统设计

### 5.1 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     AI知识库系统                             │
├─────────────────────────────────────────────────────────────┤
│  数据层                                                      │
│  ├── 原始数据：GitHub README、网站内容、软件描述              │
│  ├── 处理数据：AI摘要、标签、分类                             │
│  └── 向量数据：768维Embedding（SQLite-vec存储）             │
├─────────────────────────────────────────────────────────────┤
│  处理管道（Pipeline）                                          │
│  1. 抓取 → 2. 清洗 → 3. 分块 → 4. Embedding → 5. 索引        │
├─────────────────────────────────────────────────────────────┤
│  查询层                                                       │
│  ├── 语义搜索：向量相似度检索                                  │
│  ├── 关键词搜索：SQLite FTS5                                  │
│  └── 混合排序：RRF融合 + 重排序                                │
├─────────────────────────────────────────────────────────────┤
│  AI层（用户自带API Key）                                       │
│  ├── 摘要生成：gpt-4o-mini / claude-3-haiku（便宜且快）        │
│  ├── Embedding：text-embedding-3-small（$0.02/1M tokens）       │
│  └── 标签/推荐：gpt-4o-mini                                    │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 成本分析（以1000个Stars为例）

| 操作 | 模型 | 估算Tokens | 成本 |
|------|------|-----------|------|
| README摘要（平均5k tokens README） | gpt-4o-mini | 5M | ~$1.50 |
| Embedding生成 | text-embedding-3-small | 500K | ~$0.01 |
| 标签生成（1000项） | gpt-4o-mini | 200K | ~$0.06 |
| **总计一次性** | | | **~$1.57** |
| 月度增量（新增50个Stars） | | ~250K | **~$0.08/月** |

**结论**：即使使用OpenAI官方API，1000个Stars的初始化成本不到2美元，后续每月几美分。完全可承受。

### 5.3 本地Embedding备选方案

```typescript
// 如果用户不想用OpenAI Embedding，支持本地模型
// 使用 Xenova/transformers.js (ONNX Runtime, 纯JS)

import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function localEmbedding(text: string): Promise<number[]> {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// 模型大小：~80MB，在CPU上运行，延迟~100ms/文本
// 精度略低于OpenAI但完全可用，且零成本
```

---

## 6. 多端同步架构

### 6.1 同步策略：GitHub Gist作为"无服务器数据库"

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  设备A    │◄───►│ GitHub Gist  │◄───►│  设备B   │
│ (本地DB)  │     │ (JSON数据)   │     │ (本地DB) │
└──────────┘     └──────────────┘     └──────────┘
       │                │                  │
       └────────────────┴──────────────────┘
                          │
                    冲突解决策略：
                    1. 时间戳优先（Last-Write-Wins）
                    2. 字段级合并（结构数据）
                    3. 手动冲突提示（无法自动合并时）
```

### 6.2 同步数据格式

```typescript
// sync_data.json (存储在Gist中)
interface SyncPayload {
  version: 1;
  device_id: string;
  timestamp: string;  // ISO 8601
  checksum: string;   // SHA256 of data

  data: {
    items: Item[];
    tags: Tag[];
    collections: Collection[];
    // 注意：embeddings不通过Gist同步（太大），各设备本地生成
  };

  changelog: {
    from_version: string;
    to_version: string;
    changes: ChangeRecord[];
  };
}

interface ChangeRecord {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  timestamp: string;
  data: Record<string, any>;
}
```

### 6.3 增量同步算法

```typescript
class SyncEngine {
  private gistId: string;
  private githubToken: string;

  async sync(): Promise<SyncResult> {
    // 1. 获取云端数据
    const remote = await this.fetchGist();
    const local = await this.getLocalState();

    // 2. 对比变更
    const localChanges = await db.getUnsyncedChanges();

    // 3. 如果云端有更新，先拉取
    if (remote.timestamp > local.lastSyncAt) {
      const merged = this.mergeStates(local.data, remote.data);
      await db.applyChanges(merged.remoteChanges);
    }

    // 4. 推送本地变更
    if (localChanges.length > 0) {
      await this.updateGist({
        ...remote,
        data: this.applyChanges(remote.data, localChanges),
        changelog: { from_version: remote.version, changes: localChanges },
        timestamp: new Date().toISOString()
      });
    }

    // 5. 标记已同步
    await db.markSynced(localChanges.map(c => c.id));

    return { success: true, pushed: localChanges.length, pulled: merged?.remoteChanges.length || 0 };
  }

  private mergeStates(local: Data, remote: Data): MergeResult {
    // 三路合并：基于共同祖先
    // 对于items：比较updated_at，新的覆盖旧的
    // 对于tags/collections：名称唯一，冲突时提示用户

    const merged = { items: new Map(), tags: new Map(), collections: new Map() };
    const conflicts = [];

    // 合并items（时间戳优先）
    for (const [id, item] of [...local.items, ...remote.items]) {
      const existing = merged.items.get(id);
      if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
        merged.items.set(id, item);
      }
    }

    return { data: merged, conflicts, remoteChanges: [] };
  }
}
```

### 6.4 微信小程序特殊处理

```typescript
// 小程序没有SQLite，使用：
// 1. wx.getFileSystemManager() 读写本地文件
// 2. 或者使用微信的 Storage（有10MB限制，适合配置和元数据）

// 小程序数据持久化方案
class MiniProgramStorage {
  private dbPath: string = `${wx.env.USER_DATA_PATH}/starvault.db`;

  // 使用 sql.js (SQLite的WebAssembly版本)
  async init() {
    const SQL = await initSqlJs({ locateFile: file => `/${file}` });
    // 尝试读取已有数据库文件
    try {
      const data = wx.getFileSystemManager().readFileSync(this.dbPath);
      this.db = new SQL.Database(data);
    } catch {
      this.db = new SQL.Database();
      this.runMigrations();
    }
  }

  // 保存到本地
  async save() {
    const data = this.db.export();
    wx.getFileSystemManager().writeFileSync(this.dbPath, data);
  }

  // 同步通过GitHub Gist（小程序支持HTTPS请求）
  async sync() {
    // 调用GitHub API需要用户配置Token
    // 注意：小程序需要配置request合法域名（github.com）
    // 或者通过云函数中转（但增加成本）
  }
}
```

---

## 7. 前端架构

### 7.1 项目结构（Monorepo）

```
starvault/
├── apps/
│   ├── web/                    # React Web应用 (PWA)
│   │   ├── src/
│   │   │   ├── components/     # UI组件
│   │   │   ├── pages/          # 页面
│   │   │   ├── hooks/          # 自定义Hooks
│   │   │   ├── stores/         # Zustand状态
│   │   │   └── lib/            # 工具函数
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── desktop/                # Tauri桌面应用
│   │   ├── src/                # React代码（复用web的src）
│   │   ├── src-tauri/          # Rust后端
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── db.rs       # SQLite操作
│   │   │   │   ├── sync.rs     # 同步逻辑
│   │   │   │   └── ai.rs       # AI调用封装
│   │   │   └── Cargo.toml
│   │   └── package.json
│   │
│   ├── mobile/                 # React Native (Expo)
│   │   ├── src/                # 复用核心逻辑
│   │   └── package.json
│   │
│   └── miniprogram/            # 微信小程序 (Taro)
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── core/                   # 共享核心逻辑
│   │   ├── src/
│   │   │   ├── types/          # TypeScript类型定义
│   │   │   ├── db/             # 数据库ORM/操作
│   │   │   ├── sync/           # 同步引擎
│   │   │   ├── ai/             # AI服务抽象
│   │   │   ├── search/         # 搜索逻辑
│   │   │   └── utils/          # 工具函数
│   │   └── package.json
│   │
│   ├── ui/                     # 共享UI组件库
│   │   ├── src/
│   │   │   ├── components/     # Button, Card, Modal等
│   │   │   ├── theme/          # 主题配置（浅色/深色）
│   │   │   └── icons/          # 图标库
│   │   └── package.json
│   │
│   └── config/                 # 共享配置
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── turbo.json                  # Turborepo配置
└── package.json
```

### 7.2 主题系统（浅色/深色模式）

```typescript
// packages/ui/src/theme/index.ts
export const themes = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8fafc',
    '--bg-tertiary': '#f1f5f9',
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-tertiary': '#94a3b8',
    '--border': '#e2e8f0',
    '--accent': '#3b82f6',
    '--accent-hover': '#2563eb',
    '--success': '#22c55e',
    '--warning': '#f59e0b',
    '--danger': '#ef4444',
    '--github': '#24292f',
    '--card-shadow': '0 1px 3px rgba(0,0,0,0.1)',
  },
  dark: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--text-primary': '#f8fafc',
    '--text-secondary': '#cbd5e1',
    '--text-tertiary': '#64748b',
    '--border': '#334155',
    '--accent': '#60a5fa',
    '--accent-hover': '#3b82f6',
    '--success': '#4ade80',
    '--warning': '#fbbf24',
    '--danger': '#f87171',
    '--github': '#f0f6fc',
    '--card-shadow': '0 1px 3px rgba(0,0,0,0.3)',
  }
};

// Tailwind CSS 配置
// tailwind.config.ts
export default {
  darkMode: 'class',  // 使用class切换
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        }
      }
    }
  }
};

// 主题切换Hook
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // 优先读取系统偏好
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);

    // 应用CSS变量
    const vars = themes[theme];
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value);
    }
  }, [theme]);

  return { theme, setTheme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
}
```

### 7.3 核心页面设计

```
布局结构：
┌─────────────────────────────────────────────────────────┐
│  Sidebar (200px)        │  Main Content                │
│  ┌─────────────────┐    │  ┌─────────────────────────┐ │
│  │  🔍 搜索栏       │    │  │  Header: 视图切换 + 筛选 │ │
│  ├─────────────────┤    │  ├─────────────────────────┤ │
│  │  📁 收藏夹       │    │  │                         │ │
│  │    ├─ 全部       │    │  │   卡片网格 / 列表视图    │ │
│  │    ├─ GitHub    │    │  │                         │ │
│  │    ├─ 网站       │    │  │   ┌─────┐ ┌─────┐      │ │
│  │    ├─ 软件       │    │  │   │Card │ │Card │ ...  │ │
│  │    └─ 工具       │    │  │   └─────┘ └─────┘      │ │
│  ├─────────────────┤    │  │                         │ │
│  │  🏷️ 标签云       │    │  └─────────────────────────┘ │
│  ├─────────────────┤    │                              │
│  │  ⚡ 内置工具      │    │                              │
│  ├─────────────────┤    │                              │
│  │  ⚙️ 设置         │    │                              │
│  └─────────────────┘    └──────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

---

## 8. 内置工具设计

### 8.1 工具清单

| 工具 | 实现方式 | 复杂度 |
|------|---------|--------|
| JSON格式化/校验 | `JSON.stringify` + 语法高亮 | 低 |
| Base64编解码 | `btoa`/`atob` | 低 |
| 正则表达式测试 | `RegExp` + 匹配高亮 | 中 |
| 颜色选择器/转换 | HEX/RGB/HSL互转 | 低 |
| 时间戳转换 | `Date` API | 低 |
| 二维码生成 | `qrcode` 库 | 低 |
| Markdown预览 | `react-markdown` + `remark-gfm` | 中 |
| JWT解码 | `jwt-decode` | 低 |
| URL编解码 | `encodeURIComponent` | 低 |
| 文本对比（Diff） | `diff-match-patch` | 中 |

### 8.2 工具架构

```typescript
// packages/core/src/tools/registry.ts
interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
  component: React.ComponentType;
  category: 'encode' | 'format' | 'generate' | 'dev';
}

const tools: Tool[] = [
  {
    id: 'json-formatter',
    name: 'JSON格式化',
    icon: 'braces',
    description: '格式化、校验、压缩JSON',
    component: JsonFormatter,
    category: 'format'
  },
  // ... 更多工具
];

// 动态加载（代码分割）
const ToolPage = lazy(() => import(`./tools/${toolId}`));
```

---

## 9. 开发路线图

### Phase 1: MVP（4-6周）

```
Week 1-2: 基础架构
├── 搭建Monorepo (Turborepo)
├── 配置Tailwind + shadcn/ui主题系统
├── 实现SQLite本地数据库（Web版用sql.js，桌面版用better-sqlite3）
├── 设计并实现核心数据模型
└── 实现GitHub OAuth授权 + Stars列表获取

Week 3-4: 核心功能
├── GitHub Stars全量同步（分页 + 并发控制）
├── README抓取 + AI摘要（接入OpenAI API）
├── 基础搜索（FTS5全文搜索）
├── 标签管理（手动添加/编辑）
└── 收藏夹管理（CRUD）

Week 5-6: 多端与同步
├── 实现GitHub Gist同步（增量 + 冲突解决）
├── 打包桌面端（Tauri）
├── PWA配置（离线缓存、Service Worker）
└── 基础UI打磨（响应式、动画）
```

### Phase 2: AI增强（3-4周）

```
├── 向量Embedding生成与存储（sqlite-vec）
├── 语义搜索实现
├── AI自动标签生成
├── 标签网络可视化（D3.js / ECharts）
├── 相似项目推荐
└── 支持Anthropic/兼容接口
```

### Phase 3: 扩展平台（3-4周）

```
├── 移动端App（React Native / Expo）
├── 微信小程序（Taro）
├── 浏览器扩展（一键收藏当前页面）
├── 内置工具集（JSON、Base64等）
└── 数据导入/导出（HTML书签、JSON）
```

### Phase 4:  polish（持续）

```
├── 性能优化（虚拟列表、懒加载）
├── 高级筛选（多维度）
├── 统计面板（Stars趋势、语言分布）
├── 社区功能（分享收藏集）
└── 插件系统
```

---

## 10. 开发规范与约定

### 10.1 代码规范

```
├── TypeScript: strict模式
├── ESLint: @antfu/eslint-config
├── 组件: 函数组件 + Hooks，禁止class组件
├── 样式: Tailwind优先，复杂样式用CSS Modules
├── 状态: Zustand（客户端）+ TanStack Query（服务端）
├── API调用: 统一封装，自动重试 + 错误处理
└── 测试: Vitest + React Testing Library（核心逻辑必测）
```

### 10.2 Git工作流

```
main        ─────●─────●─────●─────●─────
               ↑     ↑     ↑     ↑
develop  ─────┘     └─────┘     └─────
               ↑           ↑
feature/xxx ───┘           └──────────
               ↑
fix/xxx ───────┘
```

### 10.3 提交规范（Conventional Commits）

```
feat: 新增AI标签生成功能
fix: 修复同步时Gist ID丢失问题
docs: 更新API文档
style: 调整深色模式配色
refactor: 重构搜索模块
test: 添加同步引擎单元测试
chore: 更新依赖版本
```

### 10.4 环境变量

```bash
# .env.local (不提交到Git)
# GitHub
GITHUB_CLIENT_ID=your_github_app_client_id
GITHUB_CLIENT_SECRET=your_github_app_client_secret

# AI（用户可在UI中配置，非必须）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=openai  # openai | anthropic | custom
AI_BASE_URL=         # 自定义接口地址（可选）

# 同步
SYNC_PROVIDER=github_gist  # github_gist | github_repo | webdav
SYNC_GIST_ID=               # 首次同步后自动生成
```

---

## 附录

### A. 关键依赖清单

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0",
    "framer-motion": "^11.0.0",
    "cmdk": "^1.0.0",
    "fuse.js": "^7.0.0",
    "date-fns": "^4.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "turbo": "^2.0.0"
  }
}
```

### B. 推荐学习资源

| 主题 | 资源 |
|------|------|
| Tauri开发 | https://tauri.app |
| SQLite-Vec | https://github.com/asg017/sqlite-vec |
| Transformers.js | https://huggingface.co/docs/transformers.js |
| CRDT同步 | https://github.com/yjs/yjs |
| shadcn/ui | https://ui.shadcn.com |
| Taro小程序 | https://taro.zone |

### C. 开源协议建议

```
推荐：MIT License
理由：
- 允许商业使用
- 允许修改和分发
- 允许私有使用
- 只需保留版权声明
- 适合个人项目积累影响力
```

---

> 本文档为StarVault项目的开发蓝图。开发过程中可根据实际情况调整技术选型和实现细节，但核心架构原则（本地优先、零服务器成本、AI增强）应保持不变。
