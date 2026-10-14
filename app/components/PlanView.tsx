"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type Section = { id: string; heading: string; body: string };
// kind W = web page, S = peer-reviewed paper (shown under "Research").
type Source = { kind: "W" | "S"; n: string; title: string; url: string };

const slug = (s: string) =>
  "sec-" +
  s
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Splits the streamed markdown into the title, numbered sections and the Sources list.
function parsePlan(md: string) {
  let title = "";
  const preamble: string[] = [];
  const sections: Section[] = [];
  for (const line of md.split("\n")) {
    if (!title && !sections.length && /^#\s/.test(line)) {
      title = line.replace(/^#\s+/, "").trim();
    } else if (/^##\s/.test(line)) {
      const heading = line.replace(/^##\s+/, "").trim();
      sections.push({ id: slug(heading), heading, body: "" });
    } else if (sections.length) {
      sections[sections.length - 1].body += line + "\n";
    } else {
      preamble.push(line);
    }
  }
  // If the model skipped the "## 1. The call" heading and wrote the call above section 2, treat that text as
  // the call (keeping an "Already in market" line, if any, as the preamble).
  if (!sections.some((s) => /^1\./.test(s.heading)) && preamble.join("").trim()) {
    const text = preamble.join("\n").trim();
    const m = text.match(/^(Already in market:[^\n]*)\n+([\s\S]+)$/i);
    if (!/^Already in market:/i.test(text) || m) {
      sections.unshift({ id: slug("1. The call"), heading: "1. The call", body: (m ? m[2] : text) + "\n" });
      preamble.length = 0;
      if (m) preamble.push(m[1]);
    }
  }
  const sourcesIdx = sections.findIndex((s) => /^sources\b/i.test(s.heading));
  const sourcesSection = sourcesIdx >= 0 ? sections.splice(sourcesIdx, 1)[0] : null;
  const sources: Source[] = [];
  for (const m of (sourcesSection?.body ?? "").matchAll(/\[S(\d+)\]\s*(.+?)\s+(https?:\/\/\S+)\s*$/gm)) {
    sources.push({ kind: "S", n: m[1], title: m[2], url: m[3] });
  }
  for (const m of (sourcesSection?.body ?? "").matchAll(/\[W(\d+)\]\s*\[([^\]]+)\]\((https?:[^)\s]+)\)/g)) {
    sources.push({ kind: "W", n: m[1], title: m[2], url: m[3] });
  }
  return { title, preamble: preamble.join("\n").trim(), sections, sources, sourcesSection };
}

// Reads the call in section 1: whichever of Go / Test first / Not yet appears first.
// "Fresh-entry verdict: ..." is used for brands already in the market (how they'd enter if launching today).
function readVerdict(text: string, inMarket = true) {
  const head = text.slice(0, 400);
  const fresh = inMarket && head.match(/fresh[- ]entry verdict:?\**\s*(not yet|test first|go)\b/i);
  if (fresh) {
    const v = fresh[1].toLowerCase();
    return v === "go" ? "Fresh entry: Go" : v === "not yet" ? "Fresh entry: Not yet" : "Fresh entry: Test first";
  }
  const hits = [
    { label: "Not yet", i: head.search(/\bnot yet\b/i) },
    { label: "Test first", i: head.search(/\btest first\b/i) },
    { label: "Go", i: head.search(/\bgo\b/i) },
  ].filter((h) => h.i >= 0);
  hits.sort((a, b) => a.i - b.i);
  return hits[0]?.label ?? null;
}

function verdictHeadline(verdict: string, country: string) {
  if (verdict === "Fresh entry: Go") return `Launching today: go.`;
  if (verdict === "Fresh entry: Not yet") return `Launching today: not yet.`;
  if (verdict === "Fresh entry: Test first") return `Launching today: test first.`;
  if (verdict === "Go") return `Go to ${country}.`;
  if (verdict === "Not yet") return `Not ${country}, not yet.`;
  return `Test ${country} first.`;
}

// The model overuses dashes as punctuation. After a bold lead-in a dash becomes a colon,
// elsewhere a spaced dash becomes a comma; dashes inside ranges and words become plain hyphens.
export function cleanDashes(md: string) {
  return md
    .replace(/(\*\*[^*\n]+\*\*)\s*[–—]\s*/g, "$1: ")
    .replace(/(^|\n)(\s*)[–—]\s+/g, "$1$2- ")
    .replace(/\s+[–—]\s+/g, ", ")
    .replace(/[–—‑‐]/g, "-");
}

// Some models write 【W4】; treat it as [W4] (same for [S#] papers).
const normalizeCitations = (md: string) => md.replace(/【([WS])(\d+)】/g, "[$1$2]");

// Once the plan is complete, drop any [W#] that has no matching source (the model cited a number
// that wasn't in the results). While streaming, the Sources list hasn't arrived yet, so keep them.
export function tidyCitations(md: string, valid: Set<string>) {
  return md.replace(/ ?\[([WS])(\d+)\](?!\()/g, (m, k, n) => (valid.has(k + n) ? m : ""));
}

// [W3] / [S1] -> a link to the matching source, rendered as a small badge.
const linkCitations = (md: string) =>
  md.replace(/\[([WS])(\d+)\](?!\()/g, (_m, k: string, n) => `[${k}${n}](#source-${k.toLowerCase()}${n})`);

const mdComponents: Components = {
  a: ({ href = "", children, ...props }) =>
    href.startsWith("#source-") ? (
      <a href={href} className="cite" aria-label={`Source ${String(children)}`}>
        {children}
      </a>
    ) : (
      <a href={href} {...props} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
};

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {linkCitations(children)}
    </ReactMarkdown>
  );
}

// The text Copy plan puts on the clipboard: same clean-up as the screen.
export function cleanPlanText(plan: string) {
  const md = normalizeCitations(cleanDashes(plan));
  const valid = new Set(parsePlan(md).sources.map((s) => s.kind + s.n));
  return tidyCitations(md, valid);
}

export function PlanView({ plan, country, streaming }: { plan: string; country: string; streaming: boolean }) {
  const parsed = parsePlan(normalizeCitations(cleanDashes(plan)));
  const valid = new Set(parsed.sources.map((s) => s.kind + s.n));
  const { title, preamble, sections, sources, sourcesSection } = streaming
    ? parsed
    : parsePlan(tidyCitations(normalizeCitations(cleanDashes(plan)), valid));

  // Not a plan (e.g. the rate-limit message): show it as a notice.
  if (!title && !sections.length) {
    return (
      <div className="notice" role="status">
        <Markdown>{plan}</Markdown>
      </div>
    );
  }

  const [call, ...rest] = /the call/i.test(sections[0]?.heading ?? "") ? sections : [null, ...sections];
  // "Fresh entry" verdicts only make sense for a brand the plan says is already in the market.
  const verdict = call ? readVerdict(call.body, /already in market/i.test(preamble)) : null;

  return (
    <div className="plan-layout">
      <nav className="toc no-print" aria-label="Plan sections">
        <p className="label">In this plan</p>
        <ol>
          {call && (
            <li>
              <a href="#sec-the-call">The call</a>
            </li>
          )}
          {rest.map((s) => (
            <li key={s!.id}>
              <a href={`#${s!.id}`}>{s!.heading.replace(/^\d+\.\s*/, "")}</a>
            </li>
          ))}
          {sources.length > 0 && (
            <li>
              <a href="#sec-sources">Sources</a>
            </li>
          )}
        </ol>
      </nav>

      <article className="memo">
        {title && <p className="label memo-title">{title.replace(/->/g, "→")}</p>}
        {preamble && (
          <div className="memo-preamble">
            <Markdown>{preamble}</Markdown>
          </div>
        )}

        {call && (
          <section id="sec-the-call" className="verdict-card">
            <p className="label">Market verdict</p>
            {verdict && <span className="verdict-tag">{verdict}</span>}
            {verdict && <h2 className="verdict-headline">{verdictHeadline(verdict, country)}</h2>}
            <div className="verdict-body">
              <Markdown>{call.body}</Markdown>
            </div>
          </section>
        )}

        {rest.map((s) => (
          <section key={s!.id} id={s!.id} className="memo-section">
            <h2>{s!.heading}</h2>
            <Markdown>{s!.body}</Markdown>
          </section>
        ))}

        {sources.length > 0 ? (
          <section id="sec-sources" className="sources">
            <h2>Sources</h2>
            {(["S", "W"] as const).map((kind) => {
              const list = sources.filter((s) => s.kind === kind);
              if (!list.length) return null;
              return (
                <div key={kind}>
                  <h3>{kind === "S" ? "Research" : "Web"}</h3>
                  <ol>
                    {list.map((s) => (
                      <li key={kind + s.n} id={`source-${kind.toLowerCase()}${s.n}`}>
                        <span className="cite">
                          {kind}
                          {s.n}
                        </span>
                        {kind === "S" ? (
                          <span>
                            {s.title}{" "}
                            <a href={s.url} target="_blank" rel="noopener noreferrer">
                              {s.url.replace(/^https?:\/\//, "")}
                            </a>
                          </span>
                        ) : (
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            {s.title}
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        ) : (
          sourcesSection &&
          !streaming && (
            <section id="sec-sources" className="sources">
              <h2>Sources</h2>
              <Markdown>{sourcesSection.body}</Markdown>
            </section>
          )
        )}
      </article>
    </div>
  );
}
