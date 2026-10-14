// Brands that have hand-checked example plans. The plans themselves live in
// knowledge/examples/<brand>-<country>.md and are bundled at build time; a brand or country
// only shows up on the page when its file exists. "brief" is what "See an example" fills into the form.
export const EXAMPLE_BRANDS = [
  {
    key: "olvae",
    name: "OLVAE",
    blurb: "Organic cotton and linen basics, made in India",
    brief: {
      brand: "OLVAE",
      category: "Apparel & accessories",
      product: "100% organic cotton, linen and hemp daily-wear basics and loungewear, made in India",
      identity: "Confidence in your own skin. Every purchase helps feed or house an animal.",
      customer: "Upper-middle-class Gen Z women in the US, inclusive sizing",
      price: "Mid-premium, $40-90 per piece",
      stage: "Pre-launch, community-first on Instagram",
    },
  },
  {
    key: "cava",
    name: "CAVA",
    blurb: "Mediterranean fast-casual restaurants, US",
    brief: {
      brand: "CAVA",
      category: "Food & beverage",
      product: "Fast-casual Mediterranean restaurants: build-your-own bowls, pitas and salads, signature dips",
      identity: "Fresh, bold Mediterranean flavour, fast and customizable",
      customer: "US office workers and suburban families who want a fresh meal fast",
      price: "$12-15 per bowl",
      stage: "476 company-owned US restaurants, digital ordering and pickup",
    },
  },
  {
    key: "hero",
    name: "Hero Cosmetics",
    blurb: "Acne patches and skincare, US",
    brief: {
      brand: "Hero Cosmetics",
      category: "Beauty & personal care",
      product: "Mighty Patch hydrocolloid acne patches plus a small acne-care range",
      identity: "Friendly, science-backed and fun",
      customer: "US teens and twenty-somethings who treat a breakout as normal and fixable",
      price: "$10-15 per pack",
      stage: "US mass retail (Amazon, Target, Walmart, Ulta) and DTC",
    },
  },
  {
    key: "kalo",
    name: "Kalo Ceramics",
    blurb: "Handmade stoneware, Portugal",
    brief: {
      brand: "Kalo Ceramics",
      category: "Home & living",
      product: "Handmade stoneware tableware made in Porto, Portugal",
      identity: "Slow, crafted, quiet earth-tone glazes",
      customer: "Design-minded couples and young professionals, 28-45",
      price: "Premium, $30-60 a piece",
      stage: "Portugal and EU through DTC, Etsy and 12 concept stores",
    },
  },
] as const;
