// Peer-reviewed papers for each plan, via OpenAlex (free, no key). One query per plan; if it fails,
// the plan is written without them, like the web search. Set OPENALEX_EMAIL to use the faster "polite pool".

export type Paper = { title: string; authors: string; year: number; journal: string; url: string; abstract: string };

const ABSTRACT_CHARS = 600;

type Work = {
  display_name?: string;
  authorships?: { author?: { display_name?: string } }[];
  publication_year?: number;
  primary_location?: { source?: { display_name?: string } | null } | null;
  doi?: string | null;
  abstract_inverted_index?: Record<string, number[]> | null;
};

// App categories -> search words for the academic literature.
const CATEGORY_WORDS: Record<string, string> = {
  "Apparel & accessories": "apparel fashion",
  "Beauty & personal care": "cosmetics beauty",
  "Home & living": "home furnishings",
  "Food & beverage": "food",
  "Health & wellness": "health wellness products",
  Technology: "technology products",
};

// OpenAlex stores abstracts as {word: [positions]}; put the words back in order.
function rebuildAbstract(index: Record<string, number[]> | null | undefined): string {
  if (!index) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  return words.filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, ABSTRACT_CHARS);
}

function authorList(authorships: { author?: { display_name?: string } }[] = []): string {
  const names = authorships.map((a) => a.author?.display_name).filter((n): n is string => !!n);
  if (!names.length) return "Unknown author";
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} et al.` : names.join(" and ");
}

export async function scholarlyResearch(category: string | undefined, country: string): Promise<Paper[]> {
  const words = (category && CATEGORY_WORDS[category]) || category || "consumer products";
  const params = new URLSearchParams({
    search: `${words} consumer behavior market entry ${country}`,
    // Journal articles with a DOI and an abstract: the closest free proxy for peer-reviewed.
    filter: "type:article,has_abstract:true,has_doi:true,primary_location.source.type:journal,publication_year:>2010",
    sort: "relevance_score:desc",
    per_page: "3",
    select: "display_name,authorships,publication_year,primary_location,doi,abstract_inverted_index",
  });
  if (process.env.OPENALEX_EMAIL) params.set("mailto", process.env.OPENALEX_EMAIL);
  try {
    const res = await fetch(`https://api.openalex.org/works?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
    const data = await res.json();
    return (data.results ?? [])
      .map((w: Work) => ({
        title: String(w.display_name ?? "").replace(/<[^>]+>/g, "").slice(0, 200),
        authors: authorList(w.authorships),
        year: Number(w.publication_year) || 0,
        journal: String(w.primary_location?.source?.display_name ?? ""),
        url: String(w.doi ?? ""),
        abstract: rebuildAbstract(w.abstract_inverted_index),
      }))
      .filter((p: Paper) => p.title && p.url && p.abstract);
  } catch (err) {
    console.error("scholar search failed", err);
    return [];
  }
}

export function formatScholarly(papers: Paper[]): string {
  if (!papers.length) return "";
  const items = papers
    .map((p, i) => `[S${i + 1}] ${p.authors} (${p.year}). ${p.title}. ${p.journal}.\n${p.url}\nAbstract: ${p.abstract}`)
    .join("\n\n");
  return `<scholarly_sources>\n${items}\n</scholarly_sources>`;
}

// One line for the Sources list: "[S1] Authors (Year). Title. Journal. https://doi.org/..."
export const paperCitation = (p: Paper, n: number) =>
  `[S${n}] ${p.authors} (${p.year}). ${p.title.replace(/[[\]]/g, "")}. ${p.journal}. ${p.url}`;
