import { examplePlans } from "@/lib/examples.generated";
import { COUNTRIES, countryLabel } from "../components/brand";
import { EXAMPLE_BRANDS } from "../components/examples";

// Where each example brand is from, for the "INDIA → JAPAN" line on the Samples list.
const ORIGIN: Record<string, string> = { olvae: "India", cava: "USA", hero: "USA", kalo: "Portugal" };
const SHORT: Record<string, string> = { us: "USA" };

export type Sample = {
  slug: string;
  brand: string;
  blurb: string;
  category: string;
  country: string;
  countryName: string;
  from: string;
  to: string;
  verdict: "Go" | "Test first" | "Not yet" | "";
  text: string;
};

// The verdict is whichever of Go / Test first / Not yet comes first in "1. The call".
function verdictOf(text: string): Sample["verdict"] {
  const call = text.split(/^##\s*1\..*$/m)[1]?.slice(0, 400) ?? "";
  const hits = [
    { v: "Not yet" as const, i: call.search(/\bnot yet\b/i) },
    { v: "Test first" as const, i: call.search(/\btest first\b/i) },
    { v: "Go" as const, i: call.search(/\bgo\b/i) },
  ].filter((h) => h.i >= 0);
  hits.sort((a, b) => a.i - b.i);
  return hits[0]?.v ?? "";
}

export const SAMPLES: Sample[] = EXAMPLE_BRANDS.flatMap((b) =>
  COUNTRIES.filter((c) => examplePlans[`${b.key}-${c.key}`]).map((c) => {
    const text = examplePlans[`${b.key}-${c.key}`];
    return {
      slug: `${b.key}-${c.key}`,
      brand: b.name,
      blurb: b.blurb,
      category: b.brief.category,
      country: c.key,
      countryName: countryLabel(c.key),
      from: ORIGIN[b.key] ?? "",
      to: SHORT[c.key] ?? countryLabel(c.key),
      verdict: verdictOf(text),
      text,
    };
  }),
);
