// Brands that have hand-checked example plans. The plans themselves live in
// knowledge/examples/<brand>-<country>.md and are bundled at build time; a brand or country
// only shows up on the page when its file exists.
export const EXAMPLE_BRANDS = [
  { key: "olvae", name: "OLVAE", blurb: "Organic cotton and linen basics, made in India" },
  { key: "cava", name: "CAVA", blurb: "Mediterranean fast-casual restaurants, US" },
  { key: "hero", name: "Hero Cosmetics", blurb: "Acne patches and skincare, US" },
  { key: "kalo", name: "Kalo Ceramics", blurb: "Handmade stoneware, Portugal" },
] as const;
