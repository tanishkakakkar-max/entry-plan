// Shared by the plan API (before saving) and the plan page (once a plan has finished streaming),
// so the screen, the saved copy and Copy plan all show the same citations.
//
// Sources are P# (official and primary sources linked inside First Port's research), W# (web pages),
// S# (peer-reviewed papers) and R# (First Port's own research and judgment, no outside link).
// finalizeCitations renumbers each kind 1, 2, 3... in the order the plan first cites them, drops
// citations with no matching source, and drops listed sources the plan never cites.
// scrubInternal removes the research author's name, internal labels and file names.

export type SourceKind = "P" | "W" | "S" | "R";
export type ParsedSource = { kind: SourceKind; n: number; title: string; url: string };

const KINDS: SourceKind[] = ["P", "W", "S", "R"];
const HEADINGS: Record<SourceKind, string> = {
  P: "Official and primary sources",
  W: "Web",
  S: "Peer-reviewed papers",
  R: "First Port research",
};

// 【W4】 -> [W4]; [W3, W5] or [W3, 5] -> [W3] [W5].
export function normalizeCitations(md: string) {
  return md
    .replace(/【([PRWS])(\d+)】/g, "[$1$2]")
    .replace(/\[([PRWS])(\d+)((?:\s*[,;]\s*[PRWS]?\d+)+)\]/g, (_m, k: string, n: string, rest: string) => {
      const parts = [`${k}${n}`];
      let kind = k;
      for (const p of rest.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
        const m = p.match(/^([PRWS])?(\d+)$/);
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
    const w = line.match(/\[([PW])(\d+)\]\s*\[([^\]]+)\]\((https?:[^)\s]+)\)/);
    if (w) {
      out.push({ kind: w[1] as SourceKind, n: Number(w[2]), title: w[3].trim(), url: w[4] });
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
  if (s.kind === "W" || s.kind === "P") return `- [${s.kind}${s.n}] [${s.title.replace(/[[\]]/g, "")}](${s.url})`;
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

const CITE = /[ \t]?\[([PRWS])(\d+)\](?!\()/g;

// Run on a finished plan (body plus the Sources section). Idempotent.
export function finalizeCitations(md: string): string {
  const text = normalizeCitations(md);
  const at = text.search(SOURCES_HEADING);
  const body = at >= 0 ? text.slice(0, at) : text;
  const sources = at >= 0 ? parseSources(text.slice(at)) : [];
  const have = new Map(sources.map((s) => [s.kind + s.n, s]));

  // New numbers per kind, in order of first citation in the body; only for numbers that have a source.
  const map = new Map<string, number>();
  const next: Record<SourceKind, number> = { P: 0, W: 0, S: 0, R: 0 };
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
    .replace(/(\[[PRWS]\d+\])([ \t]?\1)+/g, "$1");

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

// Links inside the research become numbered primary sources: "[CBP rule](https://cbp.gov/...)" -> "CBP rule [P3]",
// and a bare https://... link -> "[P4]". Numbering is shared across all the texts and repeated URLs keep one number.
export function extractPrimary(texts: string[]): { texts: string[]; sources: ParsedSource[] } {
  const byUrl = new Map<string, ParsedSource>();
  const num = (url: string, title: string) => {
    const clean = url.replace(/[.,;:]+$/, "");
    let s = byUrl.get(clean);
    if (!s) {
      s = { kind: "P", n: byUrl.size + 1, title: title.trim() || hostOf(clean), url: clean };
      byUrl.set(clean, s);
    }
    return s.n;
  };
  const out = texts.map((t) =>
    t
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, title: string, url: string) => `${title} [P${num(url, title)}]`)
      .replace(/(^|[\s(:])(https?:\/\/[^\s)<>\]]+)/g, (_m, pre: string, url: string) => `${pre}[P${num(url, "")}]`),
  );
  return { texts: out, sources: [...byUrl.values()] };
}

// A readable title for a bare link: the host plus the page's slug, e.g.
// "federalregister.gov: Adjusting imports of timber, lumber and their derivative products...".
function hostOf(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const slug = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "")
      .replace(/\.[a-z]{2,4}$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    if (slug.length < 12 || !/[a-z]{3,}\s+[a-z]{3,}/i.test(slug)) return host;
    const words = slug.charAt(0).toUpperCase() + slug.slice(1);
    return `${host}: ${words.length > 90 ? words.slice(0, 87).replace(/\s+\S*$/, "") + "..." : words}`;
  } catch {
    return url;
  }
}

export function hasInternal(md: string) {
  return /tanishka|\btani\b|\.md\b/i.test(md);
}

export function scrubInternal(md: string) {
  let out = md;
  for (const [re, to] of INTERNAL) out = out.replace(re, to);
  return out.replace(/First Port research research/g, "First Port research");
}
