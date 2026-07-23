import type { AiProvider, AiProviderConfig } from './provider.js';

export class OpenAiProvider implements AiProvider {
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return (this.config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async chatCompletion(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: this.config.model ?? 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI chat failed: ${res.status} ${text}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI embed failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as {
      data?: { embedding?: number[] }[];
    };
    return json.data?.[0]?.embedding ?? [];
  }
}
