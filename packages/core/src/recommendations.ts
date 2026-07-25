export interface RecommendedItem {
  type: 'website' | 'software';
  title: string;
  sourceUrl: string;
  description: string;
  tags: string[];
  rating: number;
}

export const RECOMMENDED_ITEMS: RecommendedItem[] = [
  // 学习
  { type: 'website', title: 'MDN Web Docs', sourceUrl: 'https://developer.mozilla.org', description: 'Mozilla 维护的 Web 技术权威文档，涵盖 HTML、CSS、JavaScript 等前端核心知识。', tags: ['frontend', 'documentation', 'web', 'learning', 'reference'], rating: 10 },
  { type: 'website', title: 'freeCodeCamp', sourceUrl: 'https://www.freecodecamp.org', description: '免费的编程学习平台，提供交互式课程和项目实战，涵盖前端、后端、数据科学等。', tags: ['learning', 'programming', 'education', 'free', 'community'], rating: 9 },
  { type: 'website', title: 'Coursera', sourceUrl: 'https://www.coursera.org', description: '全球知名在线课程平台，提供来自顶尖大学和企业的认证课程。', tags: ['learning', 'education', 'online-courses', 'career'], rating: 8 },
  { type: 'website', title: 'Khan Academy', sourceUrl: 'https://www.khanacademy.org', description: '非营利性教育平台，提供免费的基础学科和计算机科学课程。', tags: ['learning', 'education', 'free', 'math', 'cs'], rating: 8 },

  // 工具
  { type: 'website', title: 'Regex101', sourceUrl: 'https://regex101.com', description: '在线正则表达式测试和调试工具，支持多种正则引擎和详细解释。', tags: ['regex', 'tool', 'developer', 'testing', 'online'], rating: 9 },
  { type: 'website', title: 'Can I Use', sourceUrl: 'https://caniuse.com', description: '查询 HTML、CSS、JavaScript 特性在各大浏览器中的支持情况。', tags: ['frontend', 'browser', 'compatibility', 'tool', 'web'], rating: 9 },
  { type: 'website', title: 'Figma', sourceUrl: 'https://www.figma.com', description: '基于云端的 UI/UX 设计协作工具，支持实时协作和原型设计。', tags: ['design', 'ui', 'ux', 'collaboration', 'tool'], rating: 9 },
  { type: 'website', title: 'Excalidraw', sourceUrl: 'https://excalidraw.com', description: '手绘风格的在线白板工具，适合快速绘制流程图、线框图和草图。', tags: ['whiteboard', 'diagram', 'collaboration', 'tool', 'design'], rating: 8 },
  { type: 'website', title: 'TinyPNG', sourceUrl: 'https://tinypng.com', description: '在线图片压缩工具，支持 PNG、JPEG 等格式，保持较高画质的同时减小体积。', tags: ['image', 'optimization', 'tool', 'web', 'performance'], rating: 8 },
  { type: 'website', title: 'Carbon', sourceUrl: 'https://carbon.now.sh', description: '生成美观的代码截图工具，支持多种主题和自定义样式。', tags: ['code', 'screenshot', 'tool', 'developer', 'sharing'], rating: 7 },
  { type: 'website', title: 'JSON Crack', sourceUrl: 'https://jsoncrack.com', description: '将 JSON 数据可视化为交互式图表，便于理解和调试复杂数据结构。', tags: ['json', 'visualization', 'tool', 'developer', 'data'], rating: 8 },
  { type: 'website', title: 'It-tools', sourceUrl: 'https://it-tools.tech', description: '开发者常用工具集合，包括编码转换、格式化、生成器等多种实用工具。', tags: ['developer', 'tools', 'utilities', 'collection', 'web'], rating: 8 },

  // AI
  { type: 'website', title: 'ChatGPT', sourceUrl: 'https://chatgpt.com', description: 'OpenAI 开发的对话式 AI 助手，支持文本生成、代码辅助、问答等多种任务。', tags: ['ai', 'chatbot', 'llm', 'openai', 'assistant'], rating: 9 },
  { type: 'website', title: 'Claude', sourceUrl: 'https://claude.ai', description: 'Anthropic 开发的 AI 助手，以长上下文和强大的推理能力著称。', tags: ['ai', 'chatbot', 'llm', 'anthropic', 'assistant'], rating: 9 },
  { type: 'website', title: 'Hugging Face', sourceUrl: 'https://huggingface.co', description: 'AI 模型和数据集的开放社区平台，提供 Transformer 模型、Spaces 演示等资源。', tags: ['ai', 'ml', 'models', 'community', 'open-source'], rating: 9 },
  { type: 'website', title: 'Poe', sourceUrl: 'https://poe.com', description: '聚合多种 AI 模型的聊天平台，可对比不同模型的回答效果。', tags: ['ai', 'chatbot', 'aggregator', 'llm', 'assistant'], rating: 8 },
  { type: 'website', title: 'Midjourney', sourceUrl: 'https://www.midjourney.com', description: '基于 AI 的图像生成工具，通过文本描述生成高质量艺术图像。', tags: ['ai', 'image-generation', 'art', 'creative', 'llm'], rating: 8 },
  { type: 'website', title: 'Perplexity', sourceUrl: 'https://www.perplexity.ai', description: 'AI 搜索引擎，能够提供带引用来源的实时问答和深入研究。', tags: ['ai', 'search', 'research', 'llm', 'assistant'], rating: 8 },

  // 资源
  { type: 'website', title: 'GitHub', sourceUrl: 'https://github.com', description: '全球最大的代码托管平台，提供 Git 仓库管理、协作和开源项目发现。', tags: ['code', 'git', 'open-source', 'collaboration', 'platform'], rating: 10 },
  { type: 'website', title: 'Unsplash', sourceUrl: 'https://unsplash.com', description: '高质量免费图片素材库，可用于个人和商业项目。', tags: ['images', 'stock', 'free', 'design', 'resources'], rating: 8 },
  { type: 'website', title: 'Font Awesome', sourceUrl: 'https://fontawesome.com', description: '流行的图标字体和 SVG 图标库，提供丰富的 Web 图标资源。', tags: ['icons', 'fonts', 'design', 'frontend', 'resources'], rating: 8 },
  { type: 'website', title: 'Dribbble', sourceUrl: 'https://dribbble.com', description: '设计师作品展示平台，汇集全球优秀的 UI、插画和品牌设计灵感。', tags: ['design', 'inspiration', 'ui', 'portfolio', 'community'], rating: 7 },
  { type: 'website', title: 'Product Hunt', sourceUrl: 'https://www.producthunt.com', description: '新产品发现和发布平台，每日推荐最新的应用、工具和服务。', tags: ['product', 'discovery', 'startup', 'tools', 'community'], rating: 8 },
  { type: 'website', title: 'AlternativeTo', sourceUrl: 'https://alternativeto.net', description: '软件替代品推荐平台，帮助用户找到特定应用的开源或免费替代方案。', tags: ['software', 'alternatives', 'reviews', 'discovery', 'tools'], rating: 8 },
  { type: 'website', title: 'Roadmap.sh', sourceUrl: 'https://roadmap.sh', description: '开发者学习路线图社区，提供前端、后端、DevOps 等方向的学习路径。', tags: ['learning', 'roadmap', 'career', 'developer', 'resources'], rating: 9 },

  // 动漫 / 娱乐
  { type: 'website', title: 'MyAnimeList', sourceUrl: 'https://myanimelist.net', description: '动漫和漫画数据库社区，提供作品信息、评分、追番管理和讨论。', tags: ['anime', 'manga', 'community', 'database', 'entertainment'], rating: 8 },
  { type: 'website', title: 'Bilibili', sourceUrl: 'https://www.bilibili.com', description: '中国知名视频平台，涵盖动画、游戏、科技、生活等多元内容。', tags: ['video', 'anime', 'community', 'china', 'entertainment'], rating: 8 },

  // 软件
  { type: 'software', title: 'Visual Studio Code', sourceUrl: 'https://code.visualstudio.com', description: '微软开发的免费代码编辑器，支持丰富的扩展生态和多语言开发。', tags: ['editor', 'ide', 'microsoft', 'code', 'tool'], rating: 10 },
  { type: 'software', title: 'Obsidian', sourceUrl: 'https://obsidian.md', description: '基于本地 Markdown 的知识管理工具，支持双向链接和丰富的插件生态。', tags: ['notes', 'knowledge-management', 'markdown', 'productivity', 'tool'], rating: 9 },
  { type: 'software', title: 'Notion', sourceUrl: 'https://www.notion.so', description: '集笔记、数据库、项目管理于一体的协作工作空间。', tags: ['notes', 'productivity', 'collaboration', 'wiki', 'tool'], rating: 9 },
  { type: 'software', title: 'Bitwarden', sourceUrl: 'https://bitwarden.com', description: '开源密码管理器，支持跨平台同步和安全的密码存储。', tags: ['security', 'password-manager', 'open-source', 'privacy', 'tool'], rating: 9 },
  { type: 'software', title: '7-Zip', sourceUrl: 'https://www.7-zip.org', description: '开源文件压缩解压工具，支持多种压缩格式和高压缩率。', tags: ['compression', 'utility', 'open-source', 'windows', 'tool'], rating: 8 },
  { type: 'software', title: 'VLC', sourceUrl: 'https://www.videolan.org/vlc', description: '开源跨平台媒体播放器，支持几乎所有音视频格式。', tags: ['media-player', 'video', 'audio', 'open-source', 'cross-platform'], rating: 9 },
  { type: 'software', title: 'ShareX', sourceUrl: 'https://getsharex.com', description: 'Windows 平台强大的截图和录屏工具，支持多种上传和自动化工作流。', tags: ['screenshot', 'screen-recording', 'tool', 'windows', 'productivity'], rating: 8 },
  { type: 'software', title: 'PowerToys', sourceUrl: 'https://github.com/microsoft/PowerToys', description: '微软官方 Windows 实用工具集合，提供窗口管理、批量重命名等增强功能。', tags: ['windows', 'utilities', 'microsoft', 'productivity', 'tool'], rating: 8 },
  { type: 'software', title: 'Docker Desktop', sourceUrl: 'https://www.docker.com/products/docker-desktop', description: '容器化应用开发环境，方便在本地构建、运行和分享容器。', tags: ['docker', 'containers', 'devops', 'development', 'tool'], rating: 9 },
  { type: 'software', title: 'Postman', sourceUrl: 'https://www.postman.com', description: 'API 开发协作平台，提供接口测试、文档生成和团队协作功能。', tags: ['api', 'testing', 'developer', 'collaboration', 'tool'], rating: 9 },
  { type: 'software', title: 'Figma Desktop', sourceUrl: 'https://www.figma.com/downloads', description: 'Figma 桌面客户端，提供更流畅的设计和原型制作体验。', tags: ['design', 'ui', 'ux', 'tool', 'desktop'], rating: 8 },
  { type: 'software', title: 'Spotify', sourceUrl: 'https://www.spotify.com', description: '全球流行的音乐流媒体服务，提供海量音乐和播客内容。', tags: ['music', 'streaming', 'entertainment', 'audio', 'app'], rating: 8 },
  { type: 'software', title: 'Telegram', sourceUrl: 'https://telegram.org', description: '注重隐私和速度的即时通讯软件，支持多端同步和频道功能。', tags: ['messaging', 'chat', 'privacy', 'cross-platform', 'communication'], rating: 8 },
  { type: 'software', title: ' KeePassXC', sourceUrl: 'https://keepassxc.org', description: '开源跨平台密码管理器，基于 KeePass 数据库格式，数据完全本地可控。', tags: ['security', 'password-manager', 'open-source', 'privacy', 'cross-platform'], rating: 8 },
];
