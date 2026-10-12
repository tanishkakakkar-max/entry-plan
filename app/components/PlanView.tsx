"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type Section = { id: string; heading: string; body: string };
type Source = { n: string; title: string; url: string };

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
  const sourcesIdx = sections.findIndex((s) => /^sources\b/i.test(s.heading));
  const sourcesSection = sourcesIdx >= 0 ? sections.splice(sourcesIdx, 1)[0] : null;
  const sources: Source[] = [];
  for (const m of (sourcesSection?.body ?? "").matchAll(/\[W(\d+)\]\s*\[([^\]]+)\]\((https?:[^)\s]+)\)/g)) {
    sources.push({ n: m[1], title: m[2], url: m[3] });
  }
  return { title, preamble: preamble.join("\n").trim(), sections, sources, sourcesSection };
}

// Reads the call in section 1: whichever of Go / Test first / Not yet appears first.
function readVerdict(text: string) {
  const head = text.slice(0, 400);
  const hits = [
    { label: "Not yet", i: head.search(/\bnot yet\b/i) },
    { label: "Test first", i: head.search(/\btest first\b/i) },
    { label: "Go", i: head.search(/\bgo\b/i) },
  ].filter((h) => h.i >= 0);
  hits.sort((a, b) => a.i - b.i);
  return hits[0]?.label ?? null;
}

function verdictHeadline(verdict: string, country: string) {
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

// Some models write 【W4】; treat it as [W4].
const normalizeCitations = (md: string) => md.replace(/【W(\d+)】/g, "[W$1]");

// Once the plan is complete, drop any [W#] that has no matching source (the model cited a number
// that wasn't in the results). While streaming, the Sources list hasn't arrived yet, so keep them.
export function tidyCitations(md: string, valid: Set<string>) {
  return md.replace(/ ?\[W(\d+)\](?!\()/g, (m, n) => (valid.has(n) ? m : ""));
}

// [W3] -> a link to the matching source, rendered as a small badge.
const linkCitations = (md: string) => md.replace(/\[W(\d+)\](?!\()/g, "[W$1](#source-w$1)");

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
  const valid = new Set(parsePlan(md).sources.map((s) => s.n));
  return tidyCitations(md, valid);
}

export function PlanView({ plan, country, streaming }: { plan: string; country: string; streaming: boolean }) {
  const parsed = parsePlan(normalizeCitations(cleanDashes(plan)));
  const valid = new Set(parsed.sources.map((s) => s.n));
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
  const verdict = call ? readVerdict(call.body) : null;

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
            <ol>
              {sources.map((s) => (
                <li key={s.n} id={`source-w${s.n}`}>
                  <span className="cite">W{s.n}</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
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
