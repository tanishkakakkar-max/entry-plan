// Picks which research notes (knowledge/research) go into a live plan.
// A note is included if its tags match the target country OR the brand's category ("all" matches
// everything). Notes matching both come first, then category-only, then country-only, and the
// set is capped at about 20,000 tokens. Example plans (knowledge/examples) are never used here.
import { researchNotes, type ResearchNote } from "./research.generated";

// App categories -> the category tags used in research front matter.
const CATEGORY_TAGS: Record<string, string[]> = {
  "Apparel & accessories": ["apparel", "accessories", "fashion"],
  "Beauty & personal care": ["beauty", "personal care", "skincare", "cosmetics"],
  Jewellery: ["jewellery", "jewelry", "accessories", "retail products"],
  "Home & living": ["home goods", "home & living", "retail products", "ceramics"],
  "Food & beverage": ["food & beverage", "restaurants", "food"],
  "Health & wellness": ["health & wellness", "wellness", "supplements"],
};

const TOKEN_CAP = 20_000;
const tokens = (text: string) => Math.ceil(text.length / 4); // rough, good enough for a budget

export function selectResearch(countryKey: string, category?: string): ResearchNote[] {
  const wantedCats = category ? (CATEGORY_TAGS[category] ?? [category.toLowerCase()]) : [];
  const ranked = researchNotes
    .map((n) => {
      const country = n.countries.includes("all") || n.countries.includes(countryKey);
      const cat = n.categories.includes("all") || n.categories.some((c) => wantedCats.includes(c));
      return { n, rank: country && cat ? 0 : cat ? 1 : country ? 2 : -1 };
    })
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.n.file.localeCompare(b.n.file));

  const picked: ResearchNote[] = [];
  let used = 0;
  for (const { n } of ranked) {
    const cost = tokens(n.body) + 40;
    if (used + cost > TOKEN_CAP) continue;
    picked.push(n);
    used += cost;
  }
  return picked;
}

export function formatResearch(notes: ResearchNote[]): string {
  if (!notes.length) return "";
  const items = notes
    .map(
      (n) =>
        `<note file="${n.file}" countries="${n.countries.join(", ")}" categories="${n.categories.join(", ")}" updated="${n.updated}">\n${n.body}\n</note>`,
    )
    .join("\n\n");
  return `<related_research>\n${items}\n</related_research>`;
}
