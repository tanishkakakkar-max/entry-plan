// Picks which research notes (knowledge/research) go into a live plan. Category-first:
// - a note is included only if its categories match the brand's category, or it's tagged [all];
// - countries are used for ranking only: notes tagged with the target country (or [all]) come first,
//   and among those, notes tagged with only the target country come before multi-country notes;
// - the set is capped at about 20,000 tokens.
// For "Other", the founder's typed category is matched to note tags by keyword (OTHER_KEYWORDS),
// and the emerging/specialty routing note for the target country is always included.
// Example plans (knowledge/examples) are never used here.
import { researchNotes, type ResearchNote } from "./research.generated";

// App categories -> the category tags used in research front matter.
const CATEGORY_TAGS: Record<string, string[]> = {
  // Jewellery sits under accessories.
  "Apparel & accessories": ["apparel", "apparel & accessories", "accessories", "fashion", "jewellery", "jewelry"],
  "Beauty & personal care": ["beauty", "beauty & personal care", "personal care", "skincare", "cosmetics"],
  "Home & living": ["home goods", "home & living", "ceramics"],
  "Food & beverage": ["food & beverage", "restaurants", "food"],
  "Health & wellness": ["health & wellness", "wellness", "supplements"],
  Technology: ["technology", "tech", "electronics", "consumer electronics", "gadgets"],
};

// "Other": keywords in the founder's typed category -> the note tag they map to.
const OTHER_KEYWORDS: [string, string[]][] = [
  ["pet care", ["pet", "dog", "cat"]],
  ["baby", ["baby", "kid", "toddler", "nursery"]],
  ["toys", ["toy", "game", "puzzle", "collectible", "hobby"]],
  ["sports", ["fitness", "gym", "sport", "outdoor", "camping", "cycling"]],
  ["automotive", ["car", "auto", "vehicle", "e-bike", "scooter", "charging"]],
  ["education", ["tutoring", "course", "education", "training", "consulting", "coaching"]],
];
const ROUTING_TAG = "emerging";

// Whole words only, allowing plurals ("dogs", "toys", "e-bikes", "hobbies").
const hasWord = (text: string, word: string) => {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stem = w.endsWith("y") ? `(?:${w}|${w.slice(0, -1)}ies)` : w;
  return new RegExp(`(^|[^a-z])${stem}(s|es)?([^a-z]|$)`, "i").test(text);
};

export function otherTags(typed: string): string[] {
  return OTHER_KEYWORDS.filter(([, words]) => words.some((w) => hasWord(typed, w))).map(([tag]) => tag);
}

const TOKEN_CAP = 20_000;
const tokens = (text: string) => Math.ceil(text.length / 4); // rough, good enough for a budget

export type PickedNote = ResearchNote & { why: string; catMatch: boolean };

// category: an app category, or for "Other" the founder's typed text with isOther = true.
export function selectResearch(countryKey: string, category?: string, isOther = false): PickedNote[] {
  const wantedCats = isOther
    ? otherTags(category ?? "")
    : category
      ? (CATEGORY_TAGS[category] ?? [category.toLowerCase()])
      : [];
  const ranked = researchNotes
    .map((n) => {
      const all = n.categories.includes("all");
      const catMatch = n.categories.some((c) => wantedCats.includes(c));
      const countryMatch = n.countries.includes("all") || n.countries.includes(countryKey);
      const countryOnly = n.countries.length === 1 && n.countries[0] === countryKey;
      const routing = isOther && !catMatch && n.categories.includes(ROUTING_TAG) && n.countries.includes(countryKey);
      const why = `${catMatch ? "category match" : routing ? "routing note" : "all"}${countryOnly ? " + country only" : countryMatch ? " + country" : ""}`;
      return { n, include: catMatch || all || routing, countryMatch, countryOnly, catMatch, why };
    })
    .filter((x) => x.include)
    // Target country first; then single-country notes before multi-country ones;
    // then specific category matches before [all] notes; then by name.
    .sort(
      (a, b) =>
        Number(b.countryMatch) - Number(a.countryMatch) ||
        Number(b.countryOnly) - Number(a.countryOnly) ||
        Number(b.catMatch) - Number(a.catMatch) ||
        a.n.file.localeCompare(b.n.file),
    );

  const picked: PickedNote[] = [];
  let used = 0;
  for (const { n, why, catMatch } of ranked) {
    const cost = tokens(n.body) + 40;
    if (used + cost > TOKEN_CAP) continue;
    picked.push({ ...n, why, catMatch });
    used += cost;
  }
  return picked;
}

// A neutral title for a note: its first "# " heading, never the file name.
export function noteTitle(n: ResearchNote) {
  const h = n.body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return h ? h.replace(/[[\]]/g, "") : "Category research";
}

// Notes are numbered [R2], [R3]... in the order given; [R1] is the country research.
export function formatResearch(notes: ResearchNote[]): string {
  if (!notes.length) return "";
  const items = notes
    .map(
      (n, i) =>
        `<note id="R${i + 2}" title="${noteTitle(n)}" countries="${n.countries.join(", ")}" categories="${n.categories.join(", ")}">\n${n.body}\n</note>`,
    )
    .join("\n\n");
  return `<related_research>\n${items}\n</related_research>`;
}
