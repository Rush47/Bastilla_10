export const AGENT_PROTOCOL_COMMANDS = [
  'SYSTEM_STATUS',
  'DATA_STORE_AUDIT',
  'VERSION_TIMELINE',
  'SIGNAL_ANALYSIS',
] as const;

export const ASTYRIA_MISSION_ACTIONS = [
  'deep_scan',
  'vm_firewall_audit',
  'vm_snapshot_now',
  'vm_memory_optimize',
  'repair_schemas',
  'sync_versions',
  'deploy_vm_ten_system',
  'internet_self_update',
  'ollama_optimize',
] as const;

export type AstyriaMissionAction = (typeof ASTYRIA_MISSION_ACTIONS)[number];

export const ASTYRIA_MISSION_LABELS: Record<AstyriaMissionAction, string> = {
  deep_scan: 'Skan logów i telemetrii',
  vm_firewall_audit: 'Audyt zapory i usług VM',
  vm_snapshot_now: 'Zapisz migawkę VM',
  vm_memory_optimize: 'Optymalizuj pamięć VM',
  repair_schemas: 'Sprawdź dane i zapisz migawkę',
  sync_versions: 'Synchronizuj system i aplikacje',
  deploy_vm_ten_system: 'Wdróż konfigurację VM_Ten_System',
  internet_self_update: 'Aktualizacja z internetu i GitHub',
  ollama_optimize: 'Optymalizacja i konfiguracja Ollamy',
};

export type AgentProtocolCommand = (typeof AGENT_PROTOCOL_COMMANDS)[number];
export const TRIAD_AGENT_NAMES = ['Alex', 'Astyria', 'si_1', 'Aurelius'] as const;
export type TriadAgentName = (typeof TRIAD_AGENT_NAMES)[number];

export interface AgentProtocolPayload {
  signal?: string;
  omega?: number;
  time?: number;
}

export interface AgentProtocolRequest {
  command: AgentProtocolCommand;
  agent: TriadAgentName | 'triad';
  payload?: AgentProtocolPayload;
}

export function parseChatProtocolCommand(
  message: string,
  defaultAgent: AgentProtocolRequest['agent'] = 'triad',
): AgentProtocolRequest | null {
  const trimmed = message.trim();
  let agent = defaultAgent;
  let commandText = trimmed;

  const targetedCommand = trimmed.match(
    /^\/agent\s+(triad|Alex|Astyria|Aurelius|si_1|Aria)\s+(status|audit|history|SYSTEM_STATUS|DATA_STORE_AUDIT|VERSION_TIMELINE)$/i,
  );
  if (targetedCommand) {
    const target = targetedCommand[1].toLowerCase();
    agent = target === 'triad'
      ? 'triad'
      : target === 'alex'
      ? 'Alex'
      : target === 'astyria'
      ? 'Astyria'
      : target === 'aurelius'
      ? 'Aurelius'
      : 'si_1';
    commandText = targetedCommand[2];
  } else {
    const directCommand = trimmed.match(/^(?:\/command\s+)?(SYSTEM_STATUS|DATA_STORE_AUDIT|VERSION_TIMELINE)$/i);
    if (!directCommand) return null;
    commandText = directCommand[1];
  }

  const normalizedCommand = commandText.toUpperCase();
  const command: AgentProtocolCommand | null = normalizedCommand === 'STATUS' || normalizedCommand === 'SYSTEM_STATUS'
    ? 'SYSTEM_STATUS'
    : normalizedCommand === 'AUDIT' || normalizedCommand === 'DATA_STORE_AUDIT'
    ? 'DATA_STORE_AUDIT'
    : normalizedCommand === 'HISTORY' || normalizedCommand === 'VERSION_TIMELINE'
    ? 'VERSION_TIMELINE'
    : null;

  return command ? { agent, command } : null;
}

export interface AgentProtocolReply {
  agent: TriadAgentName;
  command: AgentProtocolCommand;
  data: Record<string, unknown>;
}

export interface AgentProtocolValidation {
  valid: boolean;
  request?: AgentProtocolRequest;
  error?: string;
}

export interface AgentProtocolTranscriptEntry {
  agent: string;
  tekst: string;
}

const AGENT_PROTOCOL_AGENTS = ['triad', ...TRIAD_AGENT_NAMES] as const;
const REQUEST_KEYS = ['command', 'agent', 'payload'];
const PAYLOAD_KEYS = ['signal', 'omega', 'time'];
const MAX_SIGNAL_LENGTH = 256;
const MAX_OMEGA = 1_000;
const MAX_TIME = 1_000_000;

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const AGENT_PROTOCOL_LABELS: Record<AgentProtocolCommand, string> = {
  SYSTEM_STATUS: 'Status systemu',
  DATA_STORE_AUDIT: 'Kontrola DATA_STORE',
  VERSION_TIMELINE: 'Historia wersji',
  SIGNAL_ANALYSIS: 'Analiza sygnału',
};

export function isAgentProtocolCommand(value: unknown): value is AgentProtocolCommand {
  return typeof value === 'string' &&
    (AGENT_PROTOCOL_COMMANDS as readonly string[]).includes(value);
}

export function isTriadAgent(value: unknown): value is TriadAgentName {
  return value === 'Alex' || value === 'Astyria' || value === 'Aurelius' || value === 'si_1';
}

export function validateAgentProtocolRequest(value: unknown): AgentProtocolValidation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'Request must be a JSON object.' };
  }

  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !REQUEST_KEYS.includes(key))) {
    return { valid: false, error: 'Request contains unknown fields.' };
  }
  if (!isAgentProtocolCommand(input.command)) {
    return { valid: false, error: 'Unknown command.' };
  }
  if (!(AGENT_PROTOCOL_AGENTS as readonly unknown[]).includes(input.agent)) {
    return { valid: false, error: 'Unknown agent.' };
  }

  let payload: AgentProtocolPayload | undefined;
  if (input.payload !== undefined) {
    if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
      return { valid: false, error: 'Payload must be an object.' };
    }
    const rawPayload = input.payload as Record<string, unknown>;
    if (Object.keys(rawPayload).some((key) => !PAYLOAD_KEYS.includes(key))) {
      return { valid: false, error: 'Payload contains unknown fields.' };
    }
    if (rawPayload.signal !== undefined &&
      (typeof rawPayload.signal !== 'string' || rawPayload.signal.trim().length === 0 || rawPayload.signal.length > MAX_SIGNAL_LENGTH)) {
      return { valid: false, error: `Signal must contain 1 to ${MAX_SIGNAL_LENGTH} characters.` };
    }
    if (rawPayload.omega !== undefined &&
      (typeof rawPayload.omega !== 'number' || !Number.isFinite(rawPayload.omega) || rawPayload.omega <= 0 || rawPayload.omega > MAX_OMEGA)) {
      return { valid: false, error: `Omega must be a finite number greater than 0 and at most ${MAX_OMEGA}.` };
    }
    if (rawPayload.time !== undefined &&
      (typeof rawPayload.time !== 'number' || !Number.isFinite(rawPayload.time) || rawPayload.time < 0 || rawPayload.time > MAX_TIME)) {
      return { valid: false, error: `Time must be a finite number from 0 to ${MAX_TIME}.` };
    }
    payload = {
      ...(rawPayload.signal !== undefined ? { signal: rawPayload.signal as string } : {}),
      ...(rawPayload.omega !== undefined ? { omega: rawPayload.omega as number } : {}),
      ...(rawPayload.time !== undefined ? { time: rawPayload.time as number } : {}),
    };
  }

  if (input.command === 'SIGNAL_ANALYSIS' && !payload?.signal) {
    return { valid: false, error: 'SIGNAL_ANALYSIS requires payload.signal.' };
  }

  return {
    valid: true,
    request: {
      command: input.command,
      agent: input.agent as AgentProtocolRequest['agent'],
      ...(payload ? { payload } : {}),
    },
  };
}

export function buildAgentProtocolReplies(
  request: AgentProtocolRequest,
  store: Record<string, any>,
  signalAnalysis?: unknown
): { data: Record<string, unknown>; replies: Partial<Record<TriadAgentName, AgentProtocolReply>> } {
  const config = isRecord(store.config) ? store.config : {};
  const updates = Array.isArray(store.update_history) ? store.update_history : [];
  const chatHistory = Array.isArray(store.chat_history) ? store.chat_history : [];
  const currentVersion = store.sys_version || config.sys_version || null;

  let data: Record<string, unknown>;
  switch (request.command) {
    case 'SYSTEM_STATUS':
      data = {
        version: currentVersion,
        mode: config.mode ?? null,
        activeProfiles: Array.isArray(config.active_profiles) ? config.active_profiles : [],
        configurationKeyCount: Object.keys(config).length,
        updateHistoryCount: updates.length,
        chatHistoryCount: chatHistory.length,
      };
      break;
    case 'DATA_STORE_AUDIT': {
      const issues: string[] = [];
      if (!isRecord(store.config)) issues.push('config');
      if (!Array.isArray(store.update_history)) {
        issues.push('update_history');
      } else if (updates.some((entry: any) =>
        !isRecord(entry) || typeof entry.wersja !== 'string' ||
        typeof entry.data !== 'string' || typeof entry.opis !== 'string')) {
        issues.push('update_history.entries');
      }
      if (!Array.isArray(store.chat_history)) {
        issues.push('chat_history');
      } else if (chatHistory.some((entry: any) =>
        !isRecord(entry) || typeof entry.agent !== 'string' || typeof entry.tekst !== 'string')) {
        issues.push('chat_history.entries');
      }
      data = {
        valid: issues.length === 0,
        issues,
        configurationKeyCount: Object.keys(config).length,
        updateHistoryCount: updates.length,
        chatHistoryCount: chatHistory.length,
      };
      break;
    }
    case 'VERSION_TIMELINE':
      data = {
        currentVersion,
        timeline: updates.map((entry: any) => ({
          version: typeof entry?.wersja === 'string' ? entry.wersja : null,
          date: typeof entry?.data === 'string' ? entry.data : null,
          description: typeof entry?.opis === 'string' ? entry.opis : null,
        })),
      };
      break;
    case 'SIGNAL_ANALYSIS':
      data = {
        signal: request.payload?.signal,
        omega: request.payload?.omega ?? 1.5,
        time: request.payload?.time ?? 1.0,
        analysis: signalAnalysis ?? null,
      };
      break;
  }

  const agents: TriadAgentName[] = request.agent === 'triad' ? [...TRIAD_AGENT_NAMES] : [request.agent];
  const replies: Partial<Record<TriadAgentName, AgentProtocolReply>> = {};
  for (const agent of agents) {
    replies[agent] = {
      agent,
      command: request.command,
      data,
    };
  }
  return { data, replies };
}

export function hasPersistedAgentProtocolTranscript(
  state: unknown,
  expectedTranscript: readonly AgentProtocolTranscriptEntry[],
  minimumStartIndex = 0
): boolean {
  if (!isRecord(state) || !isRecord(state.store) || !Array.isArray(state.store.chat_history)) {
    return false;
  }

  const history = state.store.chat_history;
  for (let start = Math.max(0, minimumStartIndex); start <= history.length - expectedTranscript.length; start++) {
    if (expectedTranscript.every((expected, index) => {
      const persisted = history[start + index];
      return isRecord(persisted) &&
        persisted.agent === expected.agent &&
        persisted.tekst === expected.tekst;
    })) {
      return true;
    }
  }
  return false;
}
