// Working name and copy live here so the brand is easy to change in one place.
export const BRAND = {
  name: "First Port",
  tagline: "Arrive like a local.",
  headline: "Find your first port.",
  description: "An expert guide to entering new markets. Built on real research.",
  author: "Tanishka Kakkar",
  authorUrl: "https://www.linkedin.com/in/tanishka-kakkar98",
  email: "tanishka.kakkar05@gmail.com",
  version: "v0",
};

export const COUNTRIES = [
  { key: "japan", label: "Japan", teaser: "Trust is earned slowly. Craft and quality open the door." },
  { key: "singapore", label: "Singapore", teaser: "Small, wealthy and wired. A test bed for Southeast Asia." },
  { key: "india", label: "India", teaser: "Vast and value-minded. Marketplaces and creators lead." },
  { key: "us", label: "United States", teaser: "Big, crowded and loud. Own one niche before you scale." },
] as const;

export const countryLabel = (key: string) => COUNTRIES.find((c) => c.key === key)?.label ?? key;
