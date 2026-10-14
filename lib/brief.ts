// Catches keyboard-mash and empty briefs before a plan is generated (and before a credit is spent).
// Shared by the page (instant feedback) and the API (the real gate). Deliberately simple: it stops
// nonsense like "sjdb" or "kuku", not every bad brief.

type Brief = { brand: string; product: string; identity: string; customer: string; price: string; stage: string; category?: string; categoryOther?: string };

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’&.\-]*/gu;
const NON_LATIN = /[^\p{Script=Latin}\p{N}\p{P}\p{S}\s]/u; // Hindi, Japanese etc: don't judge spelling

// A word looks real if it has a vowel and no long run of consonants ("ehdbf", "sjdb" fail).
function realWord(w: string) {
  const s = w.toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return /\d/.test(w); // numbers count
  if (s.length <= 2) return true; // "a", "of", "us", "uk"
  return /[aeiouy]/.test(s) && !/[^aeiouy]{5,}/.test(s);
}

function looksReal(text: string, minWords: number) {
  const t = text.trim();
  if (NON_LATIN.test(t)) return t.length >= 4;
  const words = t.match(WORD) ?? [];
  if (words.length < minWords) return false;
  const real = words.filter(realWord).length;
  return real / words.length >= 0.7;
}

const STAGE_WORDS = /\b(pre[- ]?launch|launching|idea|prototype|dtc|d2c|online|shopify|amazon|etsy|retail|wholesale|stores?|marketplaces?|stockists?|website|instagram|restaurants?|cafes?|pop[- ]?ups?|local|nationwide|exporting)\b/i;

const PRICE_WORDS = /\b(premium|luxury|budget|mass|mid|affordable|value|cheap|expensive|high[- ]end|entry[- ]level|free)\b/i;

// Returns a friendly message for the first field that looks wrong, or null if the brief looks real.
// With a website, the other answers are optional (the plan reads the site), and anything typed only needs to
// be a real word or two ("Skincare", "Gen Z", "DTC"); keyboard mash is still caught.
export function checkBrief(b: Brief, hasWebsite = false): string | null {
  const skip = (v: string) => hasWebsite && !v.trim();
  const min = hasWebsite ? 1 : 2;
  if (!/\p{L}/u.test(b.brand) || b.brand.trim().length < 2) return "Add your brand name.";
  if (b.category === "Other") {
    const c = (b.categoryOther ?? "").trim();
    if (c.length < 3 || !looksReal(c, 1) || /^(other|others|misc|n\/?a|none|test|testing|stuff|things|products?|asdf\w*|qwerty|abc|xyz|blah|idk|whatever|anything|everything|category)$/i.test(c))
      return 'Type your category, for example "pet care", "toys" or "stationery".';
  }
  if (!skip(b.product) && !looksReal(b.product, min))
    return hasWebsite
      ? 'That doesn\'t look like a product. Leave it blank (we\'ll read your site) or write something like "skincare".'
      : 'Describe what you sell in a short phrase, for example "organic cotton basics made in India".';
  if (!skip(b.identity) && !looksReal(b.identity, min))
    return hasWebsite
      ? 'That doesn\'t look like a brand identity. Leave it blank or write something like "playful".'
      : 'Describe your brand identity in a few words, for example "calm, crafted, made to last".';
  if (!skip(b.customer) && !looksReal(b.customer, min))
    return hasWebsite
      ? 'That doesn\'t look like a customer. Leave it blank or write something like "students".'
      : 'Describe your target customer in a few words, for example "women 25-40 who buy natural fabrics".';
  if (!skip(b.price) && !/\d/.test(b.price) && !PRICE_WORDS.test(b.price) && !(hasWebsite && looksReal(b.price, 1)))
    return 'Add a price point with a number or a level, for example "$40-90 per piece" or "premium".';
  if (!skip(b.stage) && !STAGE_WORDS.test(b.stage) && !looksReal(b.stage, min))
    return 'Say where you sell today, for example "pre-launch" or "US DTC and Amazon".';
  return null;
}
