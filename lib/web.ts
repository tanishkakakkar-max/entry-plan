// Live web search for each plan, via Tavily (free plan: 1,000 searches/month, no card).
// Runs 2 searches per plan (~500 plans/month). If TAVILY_API_KEY isn't set or a search
// fails, the plan is written from the research docs alone - the tool never breaks over it.

export type WebResult = { title: string; url: string; content: string; date?: string };

const SNIPPET_CHARS = 450; // keeps the whole web block ~800 tokens (Groq free tier: 8K tokens/min)

async function search(query: string): Promise<WebResult[]> {
  const res = await fetch(`${process.env.TAVILY_BASE_URL || "https://api.tavily.com"}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: 3, include_answer: false }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, string>) => ({
    title: String(r.title ?? "").slice(0, 120),
    url: String(r.url ?? ""),
    content: String(r.content ?? "").replace(/\s+/g, " ").slice(0, SNIPPET_CHARS),
    date: r.published_date,
  }));
}

export async function webResearch(product: string, country: string): Promise<WebResult[]> {
  if (!process.env.TAVILY_API_KEY) return [];
  const what = product.replace(/\s+/g, " ").slice(0, 80);
  const year = new Date().getFullYear();
  const queries = [
    `${what} market ${country} consumers competitors ${year}`,
    `${country} import rules tariffs labeling ${what} ${year}`,
  ];
  const settled = await Promise.allSettled(queries.map(search));
  const seen = new Set<string>();
  const out: WebResult[] = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") {
      console.error("web search failed", s.reason);
      continue;
    }
    for (const r of s.value) {
      if (r.url && !seen.has(r.url)) {
        seen.add(r.url);
        out.push(r);
      }
    }
  }
  return out.slice(0, 6);
}

export function formatWebResults(results: WebResult[]): string {
  if (!results.length) return "";
  const items = results
    .map((r, i) => `[W${i + 1}] ${r.title}${r.date ? ` (${r.date.slice(0, 10)})` : ""}\n${r.url}\n${r.content}`)
    .join("\n\n");
  return `<web_results searched="${new Date().toISOString().slice(0, 10)}">\n${items}\n</web_results>`;
}
