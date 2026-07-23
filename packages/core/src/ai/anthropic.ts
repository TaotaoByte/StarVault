import type { AiProvider, AiProviderConfig } from './provider.js';

export class AnthropicProvider implements AiProvider {
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return (this.config.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '');
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async chatCompletion(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.config.model ?? 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic chat failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    return json.content?.[0]?.text?.trim() ?? '';
  }

  async embed(): Promise<number[]> {
    throw new Error('Anthropic does not provide embeddings. Use an OpenAI-compatible provider for embeddings.');
  }
}
