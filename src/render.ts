import { readFileSync } from "node:fs";
import type {
  ChipKind,
  DigestData,
  DigestEntry,
  DigestSection,
  SysaidSuggestion,
} from "./types.ts";

const TEMPLATE_PATH = new URL("../templates/digest.html", import.meta.url);

const CHIP_CLASS: Record<ChipKind, string> = {
  new: "chip-new",
  feat: "chip-feat",
  break: "chip-break",
  tip: "chip-tip",
  cost: "chip-cost",
  safe: "chip-safe",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function escAllowCode(s: string): string {
  return esc(s)
    .replace(/&lt;code&gt;/g, "<code>")
    .replace(/&lt;\/code&gt;/g, "</code>");
}

function chip(kind: ChipKind, label: string): string {
  return `<span class="chip ${CHIP_CLASS[kind]}">${esc(label)}</span>`;
}

function exampleBlock(ex: { lang: string; code: string } | undefined): string {
  if (!ex) return "";
  return `<pre class="code-block"><span class="lang">${esc(ex.lang)}</span>${esc(ex.code)}</pre>`;
}

function entryCard(e: DigestEntry): string {
  return `
    <div class="card">
      <div class="card-head">
        <h3>${escAllowCode(e.title)}</h3>
        ${chip(e.chipKind, e.chipLabel)}
      </div>
      <p>${escAllowCode(e.paragraph)}</p>
      <div class="why">${escAllowCode(e.whyItMatters)}</div>
      ${exampleBlock(e.example)}
      <a class="source" href="${esc(e.sourceUrl)}">Read entry →</a>
    </div>`;
}

function suggestionCard(s: SysaidSuggestion): string {
  return `
    <div class="card suggest-card">
      <span class="num">${s.num}</span>
      <div class="card-head">
        <h3>${escAllowCode(s.title)}</h3>
        ${chip(s.chipKind, s.chipLabel)}
      </div>
      <p>${escAllowCode(s.paragraph)}</p>
      <div class="why">${escAllowCode(s.whyItMatters)}</div>
      ${exampleBlock(s.example)}
      <span class="ties-to">${esc(s.tiesTo)}</span>
    </div>`;
}

function sectionHtml(sec: DigestSection): string {
  const u = new URL(sec.sourceHomeUrl);
  return `
<section class="tab-panel" id="tab-${sec.id}">
  <div class="section-head">
    <div class="section-emoji">${sec.emoji}</div>
    <div>
      <h2>${esc(sec.label)}</h2>
      <div class="sub">Source · <a href="${esc(sec.sourceHomeUrl)}">${esc(u.host + u.pathname)}</a></div>
    </div>
  </div>
  <div class="cards">${sec.entries.map(entryCard).join("")}</div>
</section>`;
}

function ideasSectionHtml(suggestions: SysaidSuggestion[]): string {
  if (suggestions.length === 0) return "";
  const ideaWord = suggestions.length === 1 ? "idea" : "ideas";
  return `
<section class="tab-panel" id="tab-ideas">
  <div class="section-head">
    <div class="section-emoji">🎯</div>
    <div>
      <h2>Practical ideas — ${suggestions.length} ${ideaWord} this week</h2>
      <div class="sub">Concrete ways to use this week's changes in your Node / TypeScript service · each tied to a changelog item above</div>
    </div>
  </div>
  <div class="cards">${suggestions.map(suggestionCard).join("")}</div>
</section>`;
}

function tabsHtml(data: DigestData): string {
  const buttons = data.sections.map(
    (s, i) =>
      `<button data-tab="${s.id}"${i === 0 ? ' class="active"' : ""}><span class="emoji">${s.emoji}</span>${esc(s.label)}<span class="count">${s.entries.length}</span></button>`,
  );
  if (data.suggestions.length > 0) {
    buttons.push(
      `<button data-tab="ideas"><span class="emoji">🎯</span>Practical ideas<span class="count">${data.suggestions.length}</span></button>`,
    );
  }
  return buttons.join("\n  ");
}

function activateFirstSection(html: string, firstId: string): string {
  return html.replace(
    `<section class="tab-panel" id="tab-${firstId}">`,
    `<section class="tab-panel active" id="tab-${firstId}">`,
  );
}

function subtitle(data: DigestData): string {
  const dt = new Date(data.weekOf + "T00:00:00Z");
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const items = `${data.totalNewItems} fresh item${data.totalNewItems === 1 ? "" : "s"}`;
  const tools = `${data.sections.length} tool${data.sections.length === 1 ? "" : "s"}`;
  const ideas = `${data.suggestions.length} practical idea${data.suggestions.length === 1 ? "" : "s"}`;
  return `${weekday} ${data.weekOf} · ${items} across ${tools} · ${ideas}`;
}

function nextRunLine(weekOf: string): string {
  const dt = new Date(weekOf + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + 7);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  return `Next run · ${weekday} ${yyyy}-${mm}-${dd} 08:00 IDT`;
}

export function render(data: DigestData): string {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const sectionsHtml =
    data.sections.map(sectionHtml).join("") + ideasSectionHtml(data.suggestions);
  const firstActiveId =
    data.sections[0]?.id ?? (data.suggestions.length > 0 ? "ideas" : "");
  let html = template
    .replace("__SUBTITLE__", esc(subtitle(data)))
    .replace("<!-- __TABS__ -->", tabsHtml(data))
    .replace("<!-- __SECTIONS__ -->", sectionsHtml)
    .replace("__NEXT_RUN__", esc(nextRunLine(data.weekOf)));
  if (firstActiveId) html = activateFirstSection(html, firstActiveId);
  return html;
}

if (import.meta.main) {
  const dataPath = process.argv[2] ?? "data/this-week.json";
  const outPath = process.argv[3] ?? "index.html";
  const data = JSON.parse(readFileSync(dataPath, "utf8")) as DigestData;
  await Bun.write(outPath, render(data));
  console.log(`wrote ${outPath}`);
}
