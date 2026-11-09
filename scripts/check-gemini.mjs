import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
const fallbackModels = process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.7-flash';
const modelChain = [...new Set([model, ...fallbackModels.split(',')].map((entry) => entry.trim()))]
  .filter(Boolean);

if (!apiKey) {
  console.error('Gemini is not configured. Add GEMINI_API_KEY to .env or .env.local.');
  process.exit(1);
}

if (modelChain.length === 0 || modelChain.some((entry) => !/^[a-zA-Z0-9._-]{1,100}$/.test(entry))) {
  console.error('GEMINI_MODEL or GEMINI_FALLBACK_MODELS has an invalid format.');
  process.exit(1);
}

let hasFailure = false;
const client = new GoogleGenAI({ apiKey });

for (const model of modelChain) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    console.log(`Checking Gemini model ${model}...`);
    const interaction = await client.interactions.create({
      model,
      input: 'Reply with the single word OK.',
      generation_config: { max_output_tokens: 8, temperature: 0 },
      store: false,
    }, { signal: controller.signal });
    const reply = interaction.output_text?.trim();
    if (!reply) {
      hasFailure = true;
      console.error(`Gemini model ${model} returned no text.`);
    } else {
      console.log(`Gemini model ${model} is reachable. Model reply: ${reply}`);
    }
  } catch (error) {
    hasFailure = true;
    const status = error && typeof error === 'object' && 'status' in error
      && typeof error.status === 'number'
      ? error.status
      : undefined;
    let reason;
    if (status === 401 || status === 403) {
      reason = 'check the API key and its Gemini API access';
    } else if (status === 404) {
      reason = 'check that the configured model is available';
    } else if (status === 429) {
      reason = 'Gemini returned HTTP 429; check the model quota, billing, and rate limits';
    } else if (status !== undefined) {
      reason = `provider returned HTTP ${status}`;
    } else if (error instanceof Error && error.name === 'AbortError') {
      reason = 'health check timed out after 20 seconds';
    } else {
      reason = 'health check could not reach the provider';
    }
    console.error(`Gemini model ${model} failed: ${reason}.`);
  } finally {
    clearTimeout(timeout);
  }
}

if (hasFailure) process.exitCode = 1;
