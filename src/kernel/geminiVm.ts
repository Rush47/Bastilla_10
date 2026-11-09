export const GEMINI_VM_NAME = 'VM_Gemini_4';
export const GEMINI_PRIMARY_MODEL = 'gemini-3.8-flash';
export const GEMINI_FALLBACK_MODELS_DEFAULT = 'gemini-3.7-flash';
const MODEL_NAME_PATTERN = /^[a-zA-Z0-9._-]{1,100}$/;

export interface GeminiVmStatus {
  name: typeof GEMINI_VM_NAME;
  provider: 'Google Gemini API';
  primaryModel: string;
  fallbackModels: string[];
  configured: boolean;
  modelNameValid: boolean;
  runtimeType: 'remote-model-profile';
}

export function parseGeminiModelChain(primaryModel: string, fallbackModels: string): {
  models: string[];
  valid: boolean;
} {
  const models = [...new Set([primaryModel, ...fallbackModels.split(',')].map((model) => model.trim()))]
    .filter(Boolean);
  return {
    models,
    valid: models.length > 0 && models.every((model) => MODEL_NAME_PATTERN.test(model)),
  };
}

export async function runWithGeminiFallback<T>(
  models: readonly string[],
  generate: (model: string) => Promise<T>,
  shouldFallback: (error: unknown) => boolean,
): Promise<{ model: string; result: T }> {
  if (models.length === 0) {
    throw new Error('Brak skonfigurowanych modeli Gemini.');
  }

  for (const [index, model] of models.entries()) {
    try {
      return { model, result: await generate(model) };
    } catch (error) {
      if (index === models.length - 1 || !shouldFallback(error)) {
        throw error;
      }
    }
  }

  throw new Error('Nie udało się wygenerować odpowiedzi modelem Gemini.');
}

export function getGeminiVmStatus(
  apiKey: string,
  primaryModel: string,
  fallbackModels: string,
): GeminiVmStatus {
  const chain = parseGeminiModelChain(primaryModel, fallbackModels);
  return {
    name: GEMINI_VM_NAME,
    provider: 'Google Gemini API',
    primaryModel,
    fallbackModels: chain.models.filter((model) => model !== primaryModel),
    configured: apiKey.trim().length > 0,
    modelNameValid: chain.valid,
    runtimeType: 'remote-model-profile',
  };
}
