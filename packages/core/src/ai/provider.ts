import type { Item, TagSuggestion } from '../types/index.js';
import { OpenAiProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';

export interface AiProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  provider: 'openai' | 'anthropic' | 'custom';
}

export interface AiProvider {
  chatCompletion(prompt: string): Promise<string>;
  embed(text: string): Promise<number[]>;
}

export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';
export const EMBEDDING_MODEL = 'text-embedding-3-small';

export function createAiProvider(config: AiProviderConfig): AiProvider {
  if (config.provider === 'anthropic') {
    return new AnthropicProvider(config);
  }
  return new OpenAiProvider(config);
}

export const SUMMARY_PROMPT = `你是一个技术文档摘要专家。请根据以下GitHub项目的README内容，生成一份简洁的中文摘要。

要求：
1. 摘要长度控制在100-200字
2. 包含：项目用途、核心功能、技术栈、适用场景
3. 语言简洁专业，适合开发者快速了解项目
4. 如果README是中文，直接提炼；如果是英文，翻译成中文

README内容：
{readme_content}

请输出纯文本摘要，不要Markdown格式：`;

export function buildTagPrompt(item: Item): string {
  return `根据以下项目信息，生成5-10个最相关的技术标签。

项目：${item.title}
描述：${item.description ?? ''}
语言：${item.githubLanguage ?? ''}
Topics：${item.githubTopics?.join(', ') ?? ''}
README摘要：${item.readmeSummary ?? ''}

要求：
1. 标签要具体，避免过于宽泛（如不用"工具"，用"CLI工具"）
2. 包含：技术领域、用途类型、语言/框架
3. 返回JSON格式：{"tags": [{"name": "...", "confidence": 0.95, "reason": "..."}]}
4. 标签名用英文，但reason用中文`;
}

export function parseTagSuggestions(response: string): TagSuggestion[] {
  try {
    const parsed = JSON.parse(response) as { tags?: { name: string; confidence: number; reason: string }[] };
    return (parsed.tags ?? []).map(t => ({
      tag: t.name,
      confidence: t.confidence,
      reason: t.reason,
    }));
  } catch {
    return [];
  }
}
