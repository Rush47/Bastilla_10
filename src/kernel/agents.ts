export interface AgentProfile {
  id: string;
  name: string;
  avatarColor: string;
  borderColor: string;
  badgeBg: string;
  textColor: string;
  accentHex: string;
}

export const SYSTEM_AGENTS: Record<string, AgentProfile> = {
  Alex: {
    id: "Alex",
    name: "Alex",
    avatarColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/30",
    badgeBg: "bg-emerald-950/60 text-emerald-300 border-emerald-800/40",
    textColor: "text-emerald-400",
    accentHex: "#10b981",
  },
  Astyria: {
    id: "Astyria",
    name: "Astyria",
    avatarColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    borderColor: "border-cyan-500/30",
    badgeBg: "bg-cyan-950/60 text-cyan-300 border-cyan-800/40",
    textColor: "text-cyan-400",
    accentHex: "#06b6d4",
  },
  Aurelius: {
    id: "Aurelius",
    name: "Aurelius",
    avatarColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500/30",
    badgeBg: "bg-amber-950/60 text-amber-300 border-amber-800/40",
    textColor: "text-amber-400",
    accentHex: "#f59e0b",
  },
  si_1: {
    id: "si_1",
    name: "Aria",
    avatarColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    borderColor: "border-rose-500/30",
    badgeBg: "bg-rose-950/60 text-rose-300 border-rose-800/40",
    textColor: "text-rose-400",
    accentHex: "#f43f5e",
  },
  Operator: {
    id: "Operator",
    name: "Mateusz Mitek (Tata)",
    avatarColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    borderColor: "border-purple-500/30",
    badgeBg: "bg-purple-950/60 text-purple-300 border-purple-800/40",
    textColor: "text-purple-400",
    accentHex: "#a855f7",
  }
};
