export type ChatSystemChange =
  | { type: 'app-created'; appId: string }
  | { type: 'app-file-updated'; appId: string; filename: string }
  | { type: 'app-launched'; appId: string };

const APP_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;
const FILENAME_PATTERN = /^(?!app\.json$)[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/i;

export function isChatSystemChange(value: unknown): value is ChatSystemChange {
  if (!value || typeof value !== 'object') return false;

  const change = value as Record<string, unknown>;
  if (typeof change.appId !== 'string' || !APP_ID_PATTERN.test(change.appId)) return false;

  if (change.type === 'app-created' || change.type === 'app-launched') return true;
  return change.type === 'app-file-updated' &&
    typeof change.filename === 'string' &&
    FILENAME_PATTERN.test(change.filename);
}
