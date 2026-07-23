# StarVault

AI 驱动的全平台收藏与工具管理套件。一站式管理 GitHub Stars、网站书签、实用工具，支持语义搜索、AI 自动标签、Gist 多端同步、浏览器扩展、移动端与微信小程序。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [环境准备](#环境准备)
- [安装步骤](#安装步骤)
- [启动各端应用](#启动各端应用)
- [详细使用指南](#详细使用指南)
  - [Web 主界面](#web-主界面)
  - [同步 GitHub Stars](#同步-github-stars)
  - [搜索与筛选](#搜索与筛选)
  - [AI 功能](#ai-功能)
  - [工具箱](#工具箱)
  - [导入与导出](#导入与导出)
  - [统计面板](#统计面板)
  - [Gist 云端同步](#gist-云端同步)
  - [浏览器扩展](#浏览器扩展)
  - [移动端与小程序](#移动端与小程序)
- [开发规范](#开发规范)
- [常见问题](#常见问题)
- [许可证](#许可证)

---

## 功能特性

| 模块 | 说明 |
| --- | --- |
| GitHub Stars 同步 | 输入 Token 即可批量拉取你的 Starred Repositories，自动抓取 README、语言、Stars/Forks、Topics |
| AI 增强 | 基于 OpenAI/Anthropic 自动生成项目摘要、智能标签、向量 Embedding |
| 语义搜索 | 支持关键词、语义、混合三种搜索模式 |
| 高级筛选 | 按类型、编程语言、标签、收藏时间、Stars 数量多维度组合筛选 |
| 数据导入/导出 | 支持 StarVault JSON 备份与 Chrome/Edge/Firefox HTML 书签导入 |
| 统计面板 | 类型/语言/标签分布、Stars 分布、收藏增长趋势、高星排行 |
| 内置工具箱 | JSON 格式化、Base64/URL 编解码、时间戳、正则、颜色、Markdown、二维码 |
| 云端同步 | 通过 GitHub Gist 在多台设备间同步数据库 |
| 浏览器扩展 | 一键收藏当前页面，右键菜单收藏链接 |
| 移动端 | Expo + React Native 骨架，可扩展为 iOS/Android 应用 |
| 微信小程序 | Taro + React 骨架，可扩展为微信/支付宝小程序 |

---

## 技术栈

- **Monorepo**: pnpm workspaces + Turborepo
- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **服务端状态**: TanStack Query
- **本地数据库**: SQLite (sql.js for Web, Tauri SQLite for Desktop)
- **跨平台桌面**: Tauri v2
- **移动端**: Expo + React Native
- **小程序**: Taro 4 + React
- **AI 接口**: OpenAI / Anthropic
- **向量搜索**: text-embedding-3-small + 余弦相似度 + RRF 混合排序
- **图表**: ECharts

---

## 项目结构

```
StarVault/
├── apps/
│   ├── web/                # Web 应用（Vite + React）
│   ├── desktop/            # Tauri 桌面端
│   ├── extension/          # Chrome/Edge 浏览器扩展
│   ├── mobile/             # Expo + React Native
│   └── miniprogram/        # 微信小程序（Taro）
├── packages/
│   ├── core/               # 业务核心：数据库、搜索、AI、GitHub、工具、统计
│   ├── ui/                 # 共享 UI 组件库
│   └── config/             # 共享配置（tsconfig 等）
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 环境准备

1. **Node.js**: >= 20
2. **pnpm**: 11.16.0（项目已指定 `packageManager`）
3. **Git**: 用于版本管理和 GitHub 同步
4. **可选**
   - **Rust + Tauri 依赖**: 如需构建桌面端
   - **Android Studio / Xcode**: 如需运行移动应用
   - **微信开发者工具**: 如需运行微信小程序

推荐安装 pnpm:

```bash
corepack enable
corepack prepare pnpm@11.16.0 --activate
```

---

## 安装步骤

1. 克隆仓库

```bash
git clone git@github.com:TaotaoByte/StarVault.git
cd StarVault
```

2. 安装依赖

```bash
pnpm install
```

> 如果安装 sql.js 等包失败，请确保网络可访问 npm registry，或配置国内镜像。

3. 构建核心包和 UI 包

```bash
pnpm --filter @starvault/core build
pnpm --filter @starvault/ui build
```

---

## 启动各端应用

### Web 端

```bash
pnpm --filter @starvault/web dev
```

默认打开 http://localhost:5173

### 桌面端（Tauri）

> 需先安装 Rust 和 Tauri 系统依赖。

```bash
pnpm --filter @starvault/desktop tauri dev
```

### 浏览器扩展

1. 打开 Chrome/Edge 扩展管理页：`chrome://extensions` 或 `edge://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `apps/extension` 目录
5. 固定扩展图标到工具栏即可使用

### 移动端（Expo）

```bash
pnpm --filter @starvault/mobile install
pnpm --filter @starvault/mobile start
```

然后按提示用 Expo Go 扫描二维码，或在模拟器中运行。

### 微信小程序（Taro）

```bash
pnpm --filter @starvault/miniprogram install
pnpm --filter @starvault/miniprogram dev:weapp
```

用微信开发者工具打开 `apps/miniprogram/dist` 目录。

---

## 详细使用指南

### Web 主界面

打开 Web 应用后，左侧为功能导航栏，右侧为主内容区。当前包含四个页面：

- **收藏库**：浏览、搜索、管理所有收藏项目
- **工具箱**：JSON、Base64、URL、时间戳、正则、颜色、Markdown、二维码
- **导入导出**：JSON 备份恢复、HTML 书签导入
- **统计面板**：数据可视化与增长趋势

### 同步 GitHub Stars

1. 在左侧导航栏找到 **GitHub Token** 输入框
2. 填入你的 GitHub Personal Access Token
   - 访问 https://github.com/settings/tokens
   - 点击「Generate new token (classic)」
   - 勾选 `public_repo` 或 `repo`（访问私有仓库需要）以及 `read:user`
   - 生成后复制 Token
3. 点击「同步 GitHub Stars」按钮
4. 等待同步完成，系统会显示新增项目数量

> 首次同步可能较慢，取决于你的 Stars 数量。同步过程会并发抓取 README、Stars、语言等信息。

### 搜索与筛选

#### 搜索框

顶部搜索框支持三种模式：

- **混合**（默认）：FTS5 关键词 + 标签匹配 + 语义向量 RRF 融合排序
- **关键词**：基于 SQLite FTS5 的全文搜索
- **语义**：基于 OpenAI Embedding 的语义相似搜索，需要配置 OpenAI Key

#### 高级筛选

点击搜索框右侧「筛选」按钮展开面板：

- **类型**：GitHub / 网站 / 软件 / 工具
- **语言**：JavaScript、Python、TypeScript 等（仅 GitHub 项目）
- **标签**：点击标签 pill 进行多选/取消
- **收藏时间**：选择起止日期
- **最低 Stars**：只显示 Stars 数大于等于该值的项目

点击「清除筛选」可一键重置。

### AI 功能

#### 配置 AI Key

在左侧 **OpenAI Key（可选）** 输入框中填入你的 OpenAI API Key，或未来支持的 Anthropic Key。

#### AI 标签生成

- **批量生成**：点击「生成 AI 标签」，系统会为没有标签的项目自动推荐标签
- **单项目生成**：在项目卡片上点击「标签」按钮

#### AI 摘要

同步 GitHub Stars 时，如果已配置 AI Key，系统会自动读取 README 并生成中文摘要，存储在项目卡片中。

#### 向量 Embedding

点击「生成向量 Embedding」，系统会为每个项目生成向量表示。生成后：

- 语义搜索更准确
- 可查看「相似推荐」

#### 相似推荐

在项目卡片上点击「相似」按钮，系统会基于向量、标签重叠、编程语言推荐相关项目。

### 工具箱

左侧导航进入「工具箱」页面，当前内置 8 个工具：

| 工具 | 功能 |
| --- | --- |
| JSON 格式化 | 校验 JSON、格式化、压缩 |
| Base64 编解码 | 文本/Base64 互相转换 |
| URL 编解码 | URL encode/decode |
| 时间戳转换 | 时间戳与日期互转 |
| 正则测试 | 测试正则匹配 |
| 颜色转换 | HEX / RGB / HSL 互转 |
| Markdown 预览 | 实时渲染 Markdown |
| 二维码生成 | 文本/URL 生成二维码 |

### 导入与导出

#### 导出数据

1. 进入「导入导出」页面
2. 点击「导出 JSON」
3. 浏览器会下载 `starvault-export-YYYY-MM-DD.json`

导出的文件包含：项目、标签、分类，可用于备份或迁移。

#### 导入 JSON

1. 在「导入导出」页面点击「选择 JSON 文件」
2. 选择之前导出的 StarVault JSON
3. 系统会显示新增/更新/错误数量

#### 导入 HTML 书签

1. 从 Chrome/Edge/Firefox 导出书签为 HTML（通常文件名为 `bookmarks_YYYY_MM_DD.html`）
2. 在「导入导出」页面点击「选择 HTML 书签」
3. 系统会自动解析并导入为网站类型收藏

### 统计面板

进入「统计面板」页面，可查看：

- **汇总指标**：总项目数、GitHub/网站/工具数量、总 Stars、平均 Stars、有标签/已归档数量
- **类型分布**：饼图
- **语言分布 Top 15**：横向柱状图
- **标签统计 Top 20**：柱状图
- **Stars 分布**：不同 Stars 区间的项目数量
- **收藏增长趋势**：按月新增与累计曲线
- **高星项目 Top 10**：排序列表

> 需要有数据后才会显示图表。空数据时页面会提示先同步或导入。

### Gist 云端同步

1. 在左侧 **Gist ID（可选）** 输入框中：
   - 留空：首次同步会自动创建一个新的 Secret Gist
   - 填入已有 Gist ID：会同步到该 Gist
2. 点击「同步到 Gist」
3. 同步成功后，Gist ID 会自动保存到 localStorage
4. 在另一台设备上输入相同的 Gist ID 并同步，即可拉取数据

> 云端同步基于 CRDT 思路，上传本地修改并合并远程修改。建议定期同步备份。

### 浏览器扩展

#### 收藏当前页面

1. 安装并固定扩展
2. 浏览任意网页时，点击扩展图标
3. 确认标题、URL、备注
4. 点击「收藏到 StarVault」
5. 会自动打开 Web 应用并将当前页面添加为收藏

#### 右键收藏

在网页空白处右键选择「收藏页面到 StarVault」，或在链接上右键选择「收藏链接到 StarVault」。

#### 配置扩展

在扩展弹窗底部可修改 StarVault Web 地址，例如：

- 本地开发：`http://localhost:5173`
- 线上部署：`https://your-domain.com`

### 移动端与小程序

目前移动端（Expo）和小程序（Taro）为骨架项目，包含基础列表展示。后续可扩展：

- 登录与 Gist 同步
- 添加/编辑收藏
- 搜索与标签浏览
- 与 Web 端共享核心逻辑 `@starvault/core`

---

## 开发规范

- **TypeScript**: strict 模式
- **ESLint**: 使用 `@antfu/eslint-config`
- **组件**: 函数组件 + Hooks，避免 class 组件
- **样式**: Tailwind CSS 优先，复杂样式使用 CSS Modules
- **状态**: Zustand 管理客户端状态，TanStack Query 管理服务端状态
- **API 调用**: 统一封装，支持自动重试与错误处理
- **测试**: Vitest + React Testing Library，核心逻辑必测

常用命令：

```bash
pnpm dev          # 同时启动所有应用
pnpm build        # 构建全部
pnpm lint         # 代码检查
pnpm test         # 运行测试
pnpm typecheck    # TypeScript 类型检查
```

---

## 常见问题

**Q: 同步 GitHub Stars 时报错或没有新增？**
A: 检查 Token 是否正确，是否具有 `public_repo` 或 `repo` 权限。如果 Stars 已全部同步过，再次同步不会重复添加。

**Q: 语义搜索不可用？**
A: 需要配置 OpenAI Key，且项目已生成向量 Embedding。

**Q: 数据库存在哪里？**
A: Web 端使用 IndexedDB 持久化 sql.js 导出的二进制数据；桌面端使用 Tauri 提供的本地 SQLite。

**Q: 扩展点击后没有自动添加收藏？**
A: 检查扩展弹窗中的 StarVault Web 地址是否正确，且 Web 应用已经打开过并完成数据库初始化。

**Q: 移动端/小程序能直接使用核心包吗？**
A: `@starvault/core` 已设计为平台无关，但 sql.js 在 React Native/小程序中需要替换为对应平台的数据库实现。

---

## 许可证

[MIT](LICENSE)

---

Made by TaotaoByte
