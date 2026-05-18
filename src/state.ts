import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import type { SourceId, State } from "./types.ts";

const SOURCES: SourceId[] = [
  "claude-code",
  "claude-agent-sdk",
  "codex",
  "openai-sdk",
];
const MAX_KEPT = 20;

export function emptyState(): State {
  return {
    last_run: null,
    last_run_status: "never",
    seen: Object.fromEntries(
      SOURCES.map((s) => [s, { max: null, ids: [] }]),
    ) as State["seen"],
  };
}

export function loadState(path: string): State {
  if (!existsSync(path)) return emptyState();
  return JSON.parse(readFileSync(path, "utf8")) as State;
}

export function saveState(path: string, state: State): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  renameSync(tmp, path);
}

export function isNew(
  seen: { max: string | null; ids: string[] },
  id: string,
): boolean {
  if (seen.ids.includes(id)) return false;
  if (seen.max === null) return true;
  return id > seen.max;
}

export function recordSeen(
  seen: { max: string | null; ids: string[] },
  id: string,
): { max: string; ids: string[] } {
  const ids = [...seen.ids.filter((x) => x !== id), id].slice(-MAX_KEPT);
  const max = seen.max === null || id > seen.max ? id : seen.max;
  return { max, ids };
}
