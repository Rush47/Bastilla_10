import type { LlmTurn } from './llmChain';

/** Only completed exchanges addressed to this agent belong in its context. */
export function buildLlmHistory(
  chatHistory: unknown[],
  agent: string,
  limit = 8,
  textLimit = 1200,
): LlmTurn[] {
  if (limit <= 0 || textLimit <= 0) return [];
  const turns: LlmTurn[] = [];
  let userMessage: string | undefined;
  let replies: string[] = [];

  const finishExchange = () => {
    if (userMessage !== undefined && replies.length > 0) {
      turns.push({ role: 'user', text: userMessage.slice(0, textLimit) });
      turns.push(...replies.map((text): LlmTurn => ({
        role: 'assistant', text: text.slice(0, textLimit),
      })));
    }
  };

  for (const entry of chatHistory) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const { agent: author, tekst } = entry as { agent?: unknown; tekst?: unknown };
    if (author === 'Mateusz Mitek' || author === 'Operator') {
      finishExchange();
      userMessage = typeof tekst === 'string' && tekst.trim() ? tekst : undefined;
      replies = [];
    } else if (author === agent && typeof tekst === 'string' && tekst.trim()) {
      replies.push(tekst);
    }
  }
  finishExchange();

  const recent = turns.slice(-Math.floor(limit));
  // Truncation must not present an assistant reply without its operator turn.
  const firstUser = recent.findIndex((turn) => turn.role === 'user');
  return firstUser < 0 ? [] : recent.slice(firstUser);
}
