// Shared by the plan API (before saving) and the plan page (once a plan has finished streaming),
// so the screen, the saved copy and Copy plan all show the same citations.
//
// Sources are R# (First Port research), S# (peer-reviewed papers) and W# (web pages).
// finalizeCitations renumbers each kind 1, 2, 3... in the order the plan first cites them, drops
// citations with no matching source, and drops listed sources the plan never cites.
// scrubInternal removes the research author's name, internal labels and file names.

export type SourceKind = "R" | "S" | "W";
export type ParsedSource = { kind: SourceKind; n: number; title: string; url: string };

const KINDS: SourceKind[] = ["R", "S", "W"];
const HEADINGS: Record<SourceKind, string> = { R: "First Port research", S: "Peer-reviewed papers", W: "Web" };

// 【W4】 -> [W4]; [W3, W5] or [W3, 5] -> [W3] [W5].
export function normalizeCitations(md: string) {
  return md
    .replace(/【([RWS])(\d+)】/g, "[$1$2]")
    .replace(/\[([RWS])(\d+)((?:\s*[,;]\s*[RWS]?\d+)+)\]/g, (_m, k: string, n: string, rest: string) => {
      const parts = [`${k}${n}`];
      let kind = k;
      for (const p of rest.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
        const m = p.match(/^([RWS])?(\d+)$/);
        if (!m) continue;
        kind = m[1] ?? kind;
        parts.push(`${kind}${m[2]}`);
      }
      return parts.map((p) => `[${p}]`).join(" ");
    });
}

const SOURCES_HEADING = /^##\s*Sources\b.*$/im;

// Lines of the Sources section the API writes:
//   - [R1] First Port research: Japan market notes
//   - [S2] Authors (2024). Title. Journal. https://doi.org/...
//   - [W3] [Page title](https://...)
export function parseSources(section: string): ParsedSource[] {
  const out: ParsedSource[] = [];
  for (const line of section.split("\n")) {
    const w = line.match(/\[W(\d+)\]\s*\[([^\]]+)\]\((https?:[^)\s]+)\)/);
    if (w) {
      out.push({ kind: "W", n: Number(w[1]), title: w[2].trim(), url: w[3] });
      continue;
    }
    const s = line.match(/\[S(\d+)\]\s*(.+?)\s+(https?:\/\/\S+)\s*$/);
    if (s) {
      out.push({ kind: "S", n: Number(s[1]), title: s[2].trim(), url: s[3] });
      continue;
    }
    const r = line.match(/\[R(\d+)\]\s*(.+?)\s*$/);
    if (r) out.push({ kind: "R", n: Number(r[1]), title: r[2].trim(), url: "" });
  }
  return out;
}

export function formatSourceLine(s: ParsedSource) {
  if (s.kind === "W") return `- [W${s.n}] [${s.title.replace(/[[\]]/g, "")}](${s.url})`;
  if (s.kind === "S") return `- [S${s.n}] ${s.title} ${s.url}`;
  return `- [R${s.n}] ${s.title}`;
}

export function formatSources(list: ParsedSource[]) {
  const blocks = KINDS.map((k) => {
    const items = list.filter((s) => s.kind === k);
    return items.length ? `\n### ${HEADINGS[k]}\n\n${items.map(formatSourceLine).join("\n")}\n` : "";
  }).join("");
  return blocks ? `## Sources\n${blocks}` : "";
}

export const sourceHeading = (k: SourceKind) => HEADINGS[k];

const CITE = /[ \t]?\[([RWS])(\d+)\](?!\()/g;

// Run on a finished plan (body plus the Sources section). Idempotent.
export function finalizeCitations(md: string): string {
  const text = normalizeCitations(md);
  const at = text.search(SOURCES_HEADING);
  const body = at >= 0 ? text.slice(0, at) : text;
  const sources = at >= 0 ? parseSources(text.slice(at)) : [];
  const have = new Map(sources.map((s) => [s.kind + s.n, s]));

  // New numbers per kind, in order of first citation in the body; only for numbers that have a source.
  const map = new Map<string, number>();
  const next: Record<SourceKind, number> = { R: 0, S: 0, W: 0 };
  for (const m of body.matchAll(CITE)) {
    const key = m[1] + m[2];
    if (!have.has(key) || map.has(key)) continue;
    map.set(key, ++next[m[1] as SourceKind]);
  }

  // Rewrite the body: renumber valid citations, drop ones with no source, and collapse repeats like [W1] [W1].
  const newBody = body
    .replace(CITE, (m, k: string, n: string) => {
      const to = map.get(k + n);
      return to ? m.replace(`${k}${n}`, `${k}${to}`) : "";
    })
    .replace(/(\[[RWS]\d+\])([ \t]?\1)+/g, "$1");

  const kept = sources
    .filter((s) => map.has(s.kind + s.n))
    .map((s) => ({ ...s, n: map.get(s.kind + s.n)! }))
    .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.n - b.n);
  const list = formatSources(kept);
  return list ? `${newBody.trimEnd()}\n\n${list}` : newBody.trimEnd() + "\n";
}

// The research author's name, internal labels and file names must never reach a customer.
const INTERNAL: [RegExp, string][] = [
  [/\s*\[TANI[^\]]*\]/gi, ""],
  // "Tanishka's ceramics notes", "Tani's own research" -> "First Port research".
  [/\bTan(?:ishka|i)(?:\s+Kakkar)?['’]s\s+(?:[\w-]+\s+){0,3}?(?:observations|notes?|research|project|work|paper)\b/gi, "First Port research"],
  [/\bTanishka(?:\s+Kakkar)?['’]s\b/gi, "First Port's"],
  [/\bTanishka(?:\s+Kakkar)?\b/gi, "First Port"],
  [/\bTani['’]s\b/g, "First Port's"],
  [/\bTANI\b|\bTani\b/g, "First Port"],
  [/\(?`?\b[\w-]+(?:\.[\w-]+)*\.md\b`?\)?/g, "First Port research"],
];

export function hasInternal(md: string) {
  return /tanishka|\btani\b|\.md\b/i.test(md);
}

export function scrubInternal(md: string) {
  let out = md;
  for (const [re, to] of INTERNAL) out = out.replace(re, to);
  return out.replace(/First Port research research/g, "First Port research");
}
