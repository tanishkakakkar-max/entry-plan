// "Try an example" cycles through these. Hero and CAVA are real brands (CAVA from Tanishka's
// CAVA -> Japan project); Kalo, Tara and Daybreak are made up, so they have no website.
export const EXAMPLES = [
  {
    brand: "Hero Cosmetics",
    category: "Beauty & personal care",
    website: "https://www.herocosmetics.us",
    product: "Skincare: hydrocolloid acne patches (Mighty Patch) plus a small range of acne-care products",
    identity: "Friendly, science-backed, fun. Makes acne care feel less embarrassing. Hero-product focus.",
    customer: "Gen Z and millennial women and men with occasional breakouts, discovering products on Instagram Reels and YouTube Shorts",
    price: "Mass-premium, roughly $10-15 per pack",
    stage: "Selling in the US via Amazon, Target, Walmart, Ulta and DTC",
    country: "india",
  },
  {
    brand: "CAVA",
    category: "Food & beverage",
    website: "https://cava.com",
    product:
      "Fast-casual Mediterranean restaurants: build-your-own bowls, pitas and salads with proprietary dips and spreads (Crazy Feta), plus digital ordering and pickup",
    identity:
      "Fresh, healthy, customizable Mediterranean food made with clean, high-quality ingredients. Founded by three Greek-American friends. Sells a lifestyle, not just a meal.",
    customer:
      "Health-conscious urban office workers and Gen Z in Tokyo who want a quick, quality lunch above convenience-store options",
    price: "Around ¥1,200-1,800 per bowl, above konbini and below sit-down restaurants",
    stage: "350+ US locations, NYSE-listed since 2023; no international stores yet",
    country: "japan",
  },
  {
    brand: "Kalo Ceramics",
    category: "Home & living",
    website: "",
    product: "Handmade stoneware tableware: plates, bowls, mugs and serving pieces, glazed and fired in Porto, Portugal",
    identity: "Slow, crafted, made to be used daily. Every piece is slightly different. Quiet earth-tone glazes.",
    customer: "Design-minded couples and young professionals, 28-45, setting up a home and hosting friends",
    price: "Premium, roughly $30-60 per piece, $180-260 for a dinner set",
    stage: "Selling in Portugal and the EU via own DTC site, Etsy and 12 concept stores",
    country: "singapore",
  },
  {
    brand: "Tara Silver",
    category: "Jewellery",
    website: "",
    product: "Recycled sterling silver jewellery: stackable rings, hoops and pendants, hand-finished by artisans in Jaipur, India",
    identity: "Everyday heirlooms. Modern shapes with Indian craft details. Fair wages and recycled metal, said simply.",
    customer: "Women 22-35 who buy jewellery for themselves, follow small brands on Instagram, and care about ethics",
    price: "Accessible premium, roughly $35-120 per piece",
    stage: "Selling in India via own site, Nykaa Fashion and pop-ups; making everything in Jaipur",
    country: "us",
  },
  {
    brand: "Daybreak",
    category: "Health & wellness",
    website: "",
    product: "Functional drink powders: morning mixes with matcha, mushrooms and electrolytes, in single-serve sachets. Made in California",
    identity: "Calm energy, no crash. Clean labels, bright colours, a little playful. Science-backed but never preachy.",
    customer: "Busy professionals 25-40 who have cut back on coffee and want a better morning routine",
    price: "Premium, about $2 per serving, $40-55 for a 30-sachet box",
    stage: "US DTC subscription plus Whole Foods and Erewhon; no international sales yet",
    country: "india",
  },
];

// Saved plan for each example, served from public/examples so it's free and needs no code.
export const exampleFile = (ex: (typeof EXAMPLES)[number]) =>
  `/examples/${ex.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${ex.country}.md`;
