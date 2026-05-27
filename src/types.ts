export type SourceId =
  | "claude-code"
  | "claude-agent-sdk"
  | "codex"
  | "openai-sdk"
  | "mcp";

export type ChipKind = "new" | "feat" | "break" | "tip" | "cost" | "safe";

export interface DigestEntry {
  id: string;
  chipLabel: string;
  chipKind: ChipKind;
  title: string;
  paragraph: string;
  whyItMatters: string;
  example?: { lang: string; code: string };
  sourceUrl: string;
}

export interface DigestSection {
  id: SourceId;
  label: string;
  emoji: string;
  sourceHomeUrl: string;
  entries: DigestEntry[];
}

export interface SysaidSuggestion {
  num: number;
  title: string;
  chipLabel: string;
  chipKind: ChipKind;
  paragraph: string;
  whyItMatters: string;
  example?: { lang: string; code: string };
  tiesTo: string;
}

export interface DigestData {
  weekOf: string;
  totalNewItems: number;
  sections: DigestSection[];
  suggestions: SysaidSuggestion[];
}

export interface State {
  last_run: string | null;
  last_run_status: "never" | "ok" | "ok-no-changes" | string;
  seen: Record<SourceId, { max: string | null; ids: string[] }>;
}

export interface RawEntry {
  id: string;
  title: string;
  dateOrVersion: string;
  url: string;
  rawSummary: string;
}
