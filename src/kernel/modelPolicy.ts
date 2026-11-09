import type { LlmChainConfig } from './llmChain.ts';

/** The sole model selected by the application, including after a restart or source sync. */
export const STANDARD_OLLAMA_MODEL = 'dolphin-llama3:8b';

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= min
    ? Math.min(max, Math.floor(number))
    : fallback;
}

/**
 * Legacy .env/model/provider settings cannot silently select a different model.
 * The Ollama address and resource limits remain host settings; no model is installed here.
 */
export function buildStandardLlmConfig(env: Record<string, string | undefined>): LlmChainConfig {
  return {
    requireOllamaModelConfirmation: true,
    providers: ['ollama'],
    ollamaModel: STANDARD_OLLAMA_MODEL,
    ollamaBaseUrl: (env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
    ollamaKeepAlive: (env.OLLAMA_KEEP_ALIVE || '24h').trim(),
    ollamaNumCtx: boundedInteger(env.OLLAMA_NUM_CTX, 4096, 512, 32768),
    ollamaNumPredict: boundedInteger(env.OLLAMA_NUM_PREDICT, 3072, 1, 3072),
    ollamaNumThread: boundedInteger(env.OLLAMA_NUM_THREAD, 0, 1, 512),
  };
}
