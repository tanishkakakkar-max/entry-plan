// Live web search for each plan, via Tavily (free plan: 1,000 searches/month, no card).
// Runs 2 searches per plan (~500 plans/month). If TAVILY_API_KEY isn't set or a search
// fails, the plan is written from the research docs alone - the tool never breaks over it.

export type WebResult = { title: string; url: string; content: string; date?: string };

const SNIPPET_CHARS = 450; // keeps the whole web block ~800 tokens (Groq free tier: 8K tokens/min)

// Generic SEO and marketing content farms, forums and essay mills: never market evidence.
const EXCLUDE_DOMAINS = [
  "medium.com", "linkedin.com", "quora.com", "reddit.com", "pinterest.com", "facebook.com", "youtube.com",
  "hubspot.com", "semrush.com", "neilpatel.com", "ahrefs.com", "moz.com", "oberlo.com", "sellbrite.com",
  "marketing91.com", "feedough.com", "startupnation.com", "businessmodelanalyst.com", "blogspot.com",
  "wordpress.com", "scribd.com", "slideshare.net", "coursehero.com", "studocu.com", "ivypanda.com", "ukessays.com",
];

// Prefer government, trade bodies and serious news; demote how-to and listicle pages.
const GOV = /(^|\.)(gov|gov\.[a-z]{2}|go\.jp|gob\.[a-z]{2}|nic\.in|int|europa\.eu)$/i;
const TRADE = /(^|\.)(jetro\.go\.jp|ibef\.org|wto\.org|oecd\.org|worldbank\.org|enterprisesg\.gov\.sg|investindia\.gov\.in|trade\.gov|amcham[a-z.]*|[a-z]+chamber[a-z.]*)$/i;
const NEWS = /(^|\.)(reuters\.com|bloomberg\.com|nikkei\.com|ft\.com|wsj\.com|cnbc\.com|bbc\.(com|co\.uk)|apnews\.com|nytimes\.com|economist\.com|japantimes\.co\.jp|straitstimes\.com|businesstimes\.com\.sg|channelnewsasia\.com|economictimes\.indiatimes\.com|livemint\.com|business-standard\.com|thehindubusinessline\.com|techcrunch\.com|businesswire\.com|prnewswire\.com)$/i;
const FLUFF = /\/(blog|blogs)\/|\b(ultimate-guide|how-to|tips|top-\d+|best-\d+|step-by-step)\b/i;

function sourceScore(url: string): number {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (GOV.test(host) || TRADE.test(host)) return 3;
    if (NEWS.test(host)) return 2;
    return FLUFF.test(u.pathname) ? -2 : 0;
  } catch {
    return -2;
  }
}

async function search(query: string): Promise<WebResult[]> {
  const res = await fetch(`${process.env.TAVILY_BASE_URL || "https://api.tavily.com"}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ query, search_depth: "basic", max_results: 5, include_answer: false, exclude_domains: EXCLUDE_DOMAINS }),
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

// Same page with different tracking parameters counts once.
function pageKey(url: string) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")).toLowerCase();
  } catch {
    return url;
  }
}

const SHOPS = /(^|\.)(amazon|walmart|target|ulta|sephora|ebay|etsy|flipkart|nykaa|myntra|rakuten|zozo|shopee|lazada)\./i;

// The brand's own site and its own product listings are not market evidence.
function isBrandOwn(r: WebResult, brand?: string, website?: string | null) {
  let host = "";
  try {
    host = new URL(r.url).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
  if (website) {
    try {
      const own = new URL(website).hostname.replace(/^www\./, "");
      if (host === own || host.endsWith(`.${own}`)) return true;
    } catch {}
  }
  const name = brand?.trim().toLowerCase();
  return !!name && name.length > 2 && SHOPS.test(host) && r.title.toLowerCase().includes(name);
}

// Software, apps, websites and services: no goods cross a border, so search digital rules instead of tariffs.
export const DIGITAL = /\b(software|saas|app|apps|platform|website|web ?app|online tool|ai tool|subscription|service|services|consulting|agency|marketplace|plugin|api)\b/i;

export async function webResearch(
  product: string,
  country: string,
  brand?: string,
  website?: string | null,
): Promise<WebResult[]> {
  if (!process.env.TAVILY_API_KEY) return [];
  const what = product.replace(/\s+/g, " ").slice(0, 80);
  const year = new Date().getFullYear();
  const queries = [
    `${what} market ${country} consumers competitors ${year}`,
    DIGITAL.test(what)
      ? `${country} rules for ${what} data privacy payments digital services tax ${year}`
      : `${country} import rules tariffs labeling ${what} ${year}`,
  ];
  // Is the brand already there? Lets the plan say "Already in market" with a source.
  const name = brand?.trim();
  if (name && name.length > 2) queries.push(`"${name}" ${country} stores launch presence`);
  const settled = await Promise.allSettled(queries.map(search));
  const seen = new Set<string>();
  const out: WebResult[] = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") {
      console.error("web search failed", s.reason);
      continue;
    }
    for (const r of s.value) {
      const key = pageKey(r.url);
      if (r.url && !seen.has(key) && !isBrandOwn(r, brand, website) && sourceScore(r.url) > -2) {
        seen.add(key);
        out.push(r);
      }
    }
  }
  // Best sources first (stable within a score, so search order breaks ties). Fewer is fine: no padding.
  return out
    .map((r, i) => ({ r, i, score: sourceScore(r.url) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 6)
    .map((x) => x.r);
}

// Reads the brand's own website via Tavily Extract (1 credit per page), so our server never
// fetches arbitrary URLs itself. Trimmed hard to stay inside the Groq free tier's token budget.
const WEBSITE_CHARS = 1500;

export function cleanWebsiteUrl(input: unknown): string | null {
  if (typeof input !== "string" || !input.trim() || input.length > 300) return null;
  const raw = input.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) return null;
    // Drop ad and tracking parameters (?tw_source=..., utm_..., gclid...) people copy from ads.
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export async function readWebsite(url: string): Promise<string> {
  if (!process.env.TAVILY_API_KEY) return "";
  const res = await fetch(`${process.env.TAVILY_BASE_URL || "https://api.tavily.com"}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ urls: [url], extract_depth: "basic" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Tavily extract ${res.status}`);
  const data = await res.json();
  const text = String(data.results?.[0]?.raw_content ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // keep link text, drop URLs
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, WEBSITE_CHARS);
}

export function formatWebsite(url: string, text: string): string {
  if (!text) return "";
  return `<brand_website url="${url}">\n${text}\n</brand_website>`;
}

export function formatWebResults(results: WebResult[]): string {
  if (!results.length) return "";
  const items = results
    .map((r, i) => `[W${i + 1}] ${r.title}${r.date ? ` (${r.date.slice(0, 10)})` : ""}\n${r.url}\n${r.content}`)
    .join("\n\n");
  return `<web_results searched="${new Date().toISOString().slice(0, 10)}">\n${items}\n</web_results>`;
}
