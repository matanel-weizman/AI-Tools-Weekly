# AI Tools Weekly Digest — Routine Prompt

You are inside the `matanel-weizman/AI-Tools-Weekly` repo. Produce this week's
digest, publish it to GitHub Pages, and Slack-DM the link to the recipient
below.

## Constants

- **Slack recipient (DM):** `U07UGA2LXT3` (matanel weizman)
- **GitHub Pages URL:** `https://matanel-weizman.github.io/AI-Tools-Weekly/`
- **Sources:**
  | Source              | URL                                                                                | Diff key                          |
  |---------------------|------------------------------------------------------------------------------------|-----------------------------------|
  | `claude-code`       | https://code.claude.com/docs/en/changelog                                          | version e.g. `2.1.143`            |
  | `claude-agent-sdk`  | https://api.github.com/repos/anthropics/claude-agent-sdk-typescript/releases       | tag e.g. `v0.3.143`               |
  | `codex`             | https://api.github.com/repos/openai/codex/releases                                 | tag e.g. `rust-v0.131.0`          |
  | `openai-sdk`        | https://api.github.com/repos/openai/openai-node/releases                           | tag e.g. `v6.38.0`                |
  | `mcp`               | TWO URLs (see below) merged into one section                                       | prefixed id `spec:...` / `news:...` |

  *Note:* `developers.openai.com` blocks WebFetch from cloud-egress IPs (403),
  so codex + openai-sdk use the GitHub Releases API instead. claude-code's
  doc page works because Anthropic's CDN is permissive. claude-agent-sdk
  and mcp (spec half) use the GitHub API for the same reason.

  *MCP source — two upstreams, one section:*
  The `mcp` source fans out to TWO WebFetch calls and merges the results
  into a single `DigestSection`. Ids are prefixed to keep the two streams
  distinguishable inside `state.seen.mcp.ids`:

  1. **MCP spec releases.** WebFetch
     `https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/releases`.
     Tags are dated (`YYYY-MM-DD`). Id = `spec:<tag>` (e.g. `spec:2026-05-22`).
     If the releases list is empty, fall back to fetching
     `https://modelcontextprotocol.io/specification/draft/changelog` and
     treat each dated heading as an entry with id `spec:<YYYY-MM-DD>`.
  2. **Anthropic MCP announcements.** WebFetch
     `https://www.anthropic.com/news` with an explicit filter: return ONLY
     posts whose title or summary references MCP / Model Context Protocol /
     connectors / context servers. Skip everything else. Id =
     `news:<YYYY-MM-DD>-<slug-from-url>` (e.g. `news:2026-05-15-mcp-update`).

  Lexicographic compare still works because both prefixes are stable strings
  and the date suffix is monotonic. When deciding "new", apply the standard
  `isNew` check against `state.seen.mcp` for each fetched id.

## Constraints

- **No installed dependencies.** Do not run `bun install` / `npm install`. Bun
  runs `.ts` files directly. Only `src/render.ts` runs as a script.
- **No tests.** Eyeball the rendered HTML before push.
- **Public repo.** The digest is world-readable. Suggestions must be
  generic — applicable to any Node / TypeScript service. Never reference
  internal repos, internal PR numbers, internal file paths, or any
  company-private information beyond the SysAid brand wordmark (the brand
  is intentionally part of the visual identity).
- Edit ONLY `data/this-week.json` and `state.json`. Never hand-edit
  `digest-*.html`, `index.html`, or files under `src/` or `templates/` while
  running this routine (those are versioned separately).

## Steps

1. **Sync.** `git pull --ff-only origin main`

2. **Load state.** Read `state.json`. Note the `max` per source and the
   `ids` lists. A `max` of `null` means cold start for that source.

3. **Fetch each source via WebFetch.** Use the WebFetch tool, one call per
   source URL above. Ask for: the most recent ~6 entries with date or
   version tag, title, 1-2 sentence summary, category (new / feature /
   breaking / fix), and the upstream release URL (the `html_url` field on
   each GitHub release).

4. **Filter "only new" per source.** For each source, an entry is new
   when its id (release tag string for the GitHub-sourced sources, version
   string for claude-code) is NOT in `state.seen[src].ids` AND (when `max`
   is non-null) the id is lexicographically greater than `max`. On cold
   start (`max === null`), keep up to 6 entries; treat older entries as
   already-known noise.

   Note: the `codex` and `openai-sdk` ids changed shape on 2026-05-18 from
   `<YYYY-MM-DD>-<slug>` (doc-page era) to GitHub release tags. The legacy
   ids in `state.seen` are kept for safety but new release-tag ids will
   sort lexicographically greater so the new-entry diff still works.

5. **Quiet-week check.** If every source has zero new entries AND no
   WebFetch raised an error, this is a quiet week. Write a `state.json`
   with `last_run` = current ISO time, `last_run_status` =
   `"ok-no-changes"`, `seen` unchanged, then jump to step 10 with a
   quiet-week Slack body. Otherwise continue.

6. **Compose `data/this-week.json`** as a `DigestData` (see `src/types.ts`).
   Rules:
   - `weekOf` = today's ISO date (`YYYY-MM-DD`).
   - One `DigestSection` per source with ≥1 new entry. Emoji + label map:
     - `claude-code` → emoji `⚡`, label `claude-code`, sourceHomeUrl `https://code.claude.com/docs/en/changelog`
     - `claude-agent-sdk` → emoji `🤖`, label `Claude Agent SDK`, sourceHomeUrl `https://github.com/anthropics/claude-agent-sdk-typescript/releases`
     - `codex` → emoji `🟢`, label `Codex`, sourceHomeUrl `https://github.com/openai/codex/releases`
     - `openai-sdk` → emoji `🧬`, label `OpenAI Node SDK`, sourceHomeUrl `https://github.com/openai/openai-node/releases`
     - `mcp` → emoji `🔌`, label `MCP`, sourceHomeUrl `https://modelcontextprotocol.io/specification` (spec entries link to their release/changelog URL; news entries link to the post URL)
   - Each entry: `chipLabel` = `"<tag> · <Month D>"` (e.g. `"v6.38.0 · May 15"`).
     `chipKind` is `break` for any deprecation or removal; `new` for
     additions; `feat` otherwise. Paragraph = 1–3 short sentences, plain English, may use
     inline `<code>`. `whyItMatters` = 1 sentence; assume the reader skimmed
     nothing else. Add `example` ONLY when the user has to write code or
     config to act on the change; keep ≤10 lines.
   - Cap each section at 4 entries. If more are new, pick the four with
     highest leverage and drop the rest (the dropped ones still get
     recorded as seen in step 8, so they never resurface).
   - `totalNewItems` = sum of entries actually included across sections.

7. **Compose ≤5 `SysaidSuggestion`s** (the type name is internal; the
   section renders as "Practical ideas"). Rules:
   - Each suggestion MUST tie to one entry in step 6 — set
     `tiesTo: "<sectionLabel> · <chipLabel> — <short title>"`.
   - Suggestions are GENERIC, public-safe ideas for any Node / TypeScript
     service. Do NOT reference internal repositories, internal PR numbers,
     or internal file paths. Phrase as "if your service uses X, here's how
     to apply this".
   - Order by severity: breaking-risk first, then high-leverage wins, then
     tips.
   - Include an `example` when the suggestion implies a code or config
     change. Use a public, generic snippet.

8. **Write artifacts.**
   - Use the Write tool to save `data/this-week.json` (pretty-printed JSON).
   - Build the new `State`: for every entry id you included in step 6,
     update `state.seen[<source>]` via this rule: `ids = (existing.ids
     filter !== id, then append id, capped at last 20)`, `max = max
     existing.max id`. Set `last_run` = now (ISO), `last_run_status` =
     `errors.length === 0 ? "ok" : "partial: " + Object.keys(errors).join(",")`.
   - Write the new state to `state.json` (pretty-printed JSON).

9. **Render + commit + push.**
   - `bun run src/render.ts data/this-week.json digest-<weekOf>.html`
   - `cp digest-<weekOf>.html index.html`
   - `git add digest-<weekOf>.html index.html data/this-week.json state.json && git commit -m "chore: digest <weekOf>" && git push`
   - For a quiet week (step 5): `git add state.json && git commit -m "chore: quiet week <weekOf>" && git push`. No HTML changes.

10. **Sanity check.** Wait 30s, then
    `curl -s -o /dev/null -w "%{http_code}" https://matanel-weizman.github.io/AI-Tools-Weekly/`.
    Expect `200`. A `404` means GitHub Pages is still building — note in the
    Slack message but do not retry.

11. **Slack notify.** Call `mcp__claude_ai_Slack__slack_send_message` with:
    - `channel_id`: `"U07UGA2LXT3"`
    - `text` for a normal run:
      ```
      📰 AI Tools Weekly — <weekday> <weekOf>
      <totalNewItems> new across <sections.length> tool(s) · <suggestions.length> practical idea(s)
      https://matanel-weizman.github.io/AI-Tools-Weekly/
      ```
    - `text` for a quiet week:
      ```
      📰 AI Tools Weekly — quiet week <weekOf>
      No new entries this week. Latest: https://matanel-weizman.github.io/AI-Tools-Weekly/
      ```

12. **Done.** Log the URL and section + suggestion counts to stdout.

## Failure handling

- A WebFetch error on one source means render the digest without that
  section this week. Do NOT advance `state.seen[<that source>]` so the
  next run retries.
- A git push failure leaves the working tree dirty for the next run. Do
  not retry inside this run.
- Never include a card whose `id` is already in `state.seen[<source>].ids`.
- If `data/this-week.json` is malformed for any reason, the render step
  fails fast — that is the intended atomic boundary.

## Manual trigger

From any Claude session in this repo (Claude desktop, Claude Code CLI, etc.),
ask "run the routine" and paste this file's contents — or invoke the
registered scheduled agent via `/schedule run ai-tools-weekly-digest`.
