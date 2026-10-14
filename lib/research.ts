// Picks which research notes (knowledge/research) go into a live plan. Category-first:
// - a note is included only if its categories match the brand's category, or it's tagged [all];
// - countries are used for ranking only: notes tagged with the target country (or [all]) come first;
// - the set is capped at about 20,000 tokens.
// Example plans (knowledge/examples) are never used here.
import { researchNotes, type ResearchNote } from "./research.generated";

// App categories -> the category tags used in research front matter.
const CATEGORY_TAGS: Record<string, string[]> = {
  // Jewellery sits under accessories.
  "Apparel & accessories": ["apparel", "accessories", "fashion", "jewellery", "jewelry"],
  "Beauty & personal care": ["beauty", "personal care", "skincare", "cosmetics"],
  "Home & living": ["home goods", "home & living", "ceramics"],
  "Food & beverage": ["food & beverage", "restaurants", "food"],
  "Health & wellness": ["health & wellness", "wellness", "supplements"],
  Technology: ["technology", "tech", "electronics", "consumer electronics", "gadgets"],
};

const TOKEN_CAP = 20_000;
const tokens = (text: string) => Math.ceil(text.length / 4); // rough, good enough for a budget

export type PickedNote = ResearchNote & { why: string };

export function selectResearch(countryKey: string, category?: string): PickedNote[] {
  const wantedCats = category ? (CATEGORY_TAGS[category] ?? [category.toLowerCase()]) : [];
  const ranked = researchNotes
    .map((n) => {
      const all = n.categories.includes("all");
      const catMatch = n.categories.some((c) => wantedCats.includes(c));
      const countryMatch = n.countries.includes("all") || n.countries.includes(countryKey);
      const why = `${catMatch ? "category match" : "all"}${countryMatch ? " + country" : ""}`;
      return { n, include: catMatch || all, countryMatch, catMatch, why };
    })
    .filter((x) => x.include)
    // Target country first; then specific category matches before [all] notes; then by name.
    .sort(
      (a, b) =>
        Number(b.countryMatch) - Number(a.countryMatch) ||
        Number(b.catMatch) - Number(a.catMatch) ||
        a.n.file.localeCompare(b.n.file),
    );

  const picked: PickedNote[] = [];
  let used = 0;
  for (const { n, why } of ranked) {
    const cost = tokens(n.body) + 40;
    if (used + cost > TOKEN_CAP) continue;
    picked.push({ ...n, why });
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
