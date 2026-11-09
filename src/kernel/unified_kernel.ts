
// Unified HyperOS Kernel (TypeScript)

export interface LogEntry {
  timestamp: string;
  agent: string;
  input: string;
  output: string;
}

export class UnifiedHyperOS {
  private log: LogEntry[] = [];

  constructor() {
    this.addLog("SYSTEM", "INIT", "HyperOS Unified Kernel initialized.");
  }

  private addLog(agent: string, input: string, output: string) {
    this.log.push({
      timestamp: new Date().toISOString(),
      agent,
      input,
      output,
    });
  }

  public processCommand(input: string, alexReply?: string): LogEntry[] {
    this.addLog("OPERATOR", input, "Command processed by internal kernel.");
    if (alexReply) {
      this.addLog("ALEX", input, alexReply);
    }
    return this.log;
  }

  public getLog() {
    return this.log;
  }
}
