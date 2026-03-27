import { ChatAnthropic } from '@langchain/anthropic';

/**
 * Shared LLM factory. Single source of truth for model config.
 * temperature=0.2 for extraction (deterministic)
 * temperature=0.4 for strategy (structured reasoning)
 * temperature=0.7 for creative (generative)
 */
export function getLLM(temperature = 0.3): ChatAnthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new ChatAnthropic({
    model: process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022',
    temperature,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/** Extract string content from LangChain message response */
export function toText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const first = content[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'text' in first) return String((first as { text: unknown }).text);
  }
  return String(content ?? '');
}

/** Parse JSON from LLM output — handles markdown code fences and raw JSON */
export function parseJSON<T>(text: string, fallback: T): T {
  try {
    // Strip markdown code fence if present
    const fenced = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    const raw = fenced ? fenced[1] : text;
    // Find the first JSON object or array
    const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    return JSON.parse(match ? match[0] : raw) as T;
  } catch {
    return fallback;
  }
}
