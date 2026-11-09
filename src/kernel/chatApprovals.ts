export type ChatApprovalAction =
  | { type: 'create-app'; id: string; appType: string }
  | { type: 'create-db'; id: string }
  | { type: 'write-file'; appId: string; filename: string; content: string }
  | { type: 'launch'; appId: string };

export type ChatApprovalCommand =
  | { type: 'propose'; action: ChatApprovalAction }
  | { type: 'approve'; approvalId: string }
  | { type: 'reject'; approvalId: string }
  | { type: 'list' }
  | { type: 'invalid'; error: string };

const APP_TYPES = new Set([
  'html5-web',
  'cyber-game',
  'python-microservice',
  'node-api',
  'quantum-agent',
  'cli-utility',
]);
const SAFE_APP_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;
const SAFE_DATABASE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/;
const SAFE_FILENAME = /^(?!app\.json$)[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/i;
const EDITABLE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.py']);
export const MAX_PROPOSED_FILE_SIZE = 20_000;

function invalid(error: string): ChatApprovalCommand {
  return { type: 'invalid', error };
}

export function parseChatApprovalCommand(message: string): ChatApprovalCommand | null {
  if (!/^\/(?:propose|approve|reject|proposals)(?:\s|$)/i.test(message)) return null;

  const newline = message.indexOf('\n');
  const firstLine = (newline === -1 ? message : message.slice(0, newline)).replace(/\r$/, '');
  const parts = firstLine.trim().split(/\s+/);
  const command = parts[0].toLowerCase();

  if (command === '/proposals') {
    return parts.length === 1 && newline === -1
      ? { type: 'list' }
      : invalid('Użycie: /proposals');
  }

  if (command === '/approve' || command === '/reject') {
    if (newline !== -1 || parts.length !== 2 || !/^[a-f0-9-]{36}$/i.test(parts[1])) {
      return invalid(`Użycie: ${command} <id-propozycji>`);
    }
    return { type: command.slice(1) as 'approve' | 'reject', approvalId: parts[1] };
  }

  if (command !== '/propose') return invalid('Nieznane polecenie zatwierdzania.');
  const action = parts[1]?.toLowerCase();

  if (action === 'create-app') {
    if (newline !== -1 || parts.length < 3 || parts.length > 4 || !SAFE_APP_ID.test(parts[2])) {
      return invalid('Użycie: /propose create-app <id> [typ]');
    }
    const appType = (parts[3] || 'html5-web').toLowerCase();
    if (!APP_TYPES.has(appType)) return invalid('Nieobsługiwany typ aplikacji.');
    return { type: 'propose', action: { type: 'create-app', id: parts[2].toLowerCase(), appType } };
  }

  if (action === 'create-db') {
    if (newline !== -1 || parts.length !== 3 || !SAFE_DATABASE_ID.test(parts[2])) {
      return invalid('Użycie: /propose create-db <id>');
    }
    return { type: 'propose', action: { type: 'create-db', id: parts[2].toLowerCase() } };
  }

  if (action === 'launch') {
    if (newline !== -1 || parts.length !== 3 || !SAFE_APP_ID.test(parts[2])) {
      return invalid('Użycie: /propose launch <id>');
    }
    return { type: 'propose', action: { type: 'launch', appId: parts[2].toLowerCase() } };
  }

  if (action === 'write-file') {
    const filename = parts[3];
    const content = newline === -1 ? '' : message.slice(newline + 1);
    if (
      parts.length !== 4 ||
      !SAFE_APP_ID.test(parts[2] || '') ||
      !filename ||
      !SAFE_FILENAME.test(filename) ||
      !EDITABLE_EXTENSIONS.has(filename.slice(filename.lastIndexOf('.')).toLowerCase()) ||
      newline === -1 ||
      content.length === 0 ||
      content.length > MAX_PROPOSED_FILE_SIZE
    ) {
      return invalid(
        `/propose write-file wymaga: /propose write-file <id-aplikacji> <plik>\n<treść pliku> (maks. ${MAX_PROPOSED_FILE_SIZE} znaków; app.json jest chroniony).`,
      );
    }
    return {
      type: 'propose',
      action: { type: 'write-file', appId: parts[2].toLowerCase(), filename, content },
    };
  }

  return invalid(
    'Dozwolone propozycje: create-app <id> [typ], create-db <id>, write-file <id-aplikacji> <plik> + treść w następnej linii, launch <id>.',
  );
}
