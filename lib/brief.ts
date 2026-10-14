// Catches keyboard-mash and empty briefs before a plan is generated (and before a credit is spent).
// Shared by the page (instant feedback) and the API (the real gate). Deliberately simple: it stops
// nonsense like "sjdb" or "kuku", not every bad brief.

type Brief = { website?: string; brand: string; product: string; identity: string; customer: string; price: string; stage: string; category?: string; categoryOther?: string };

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’&.\-]*/gu;
const NON_LATIN = /[^\p{Script=Latin}\p{N}\p{P}\p{S}\s]/u; // Hindi, Japanese etc: don't judge spelling

// Placeholder and keyboard words that are never a real answer.
const JUNK = /^(abc|abcd|asdf\w*|qwer\w*|zxcv\w*|hjkl|test\w*|lorem|ipsum|xxx+|n\/?a|none|nothing|idk|blah|stuff|things|whatever|anything|something)$/i;

// "abcd", "bcde", "wxyz": four or more letters in alphabet order.
const alphabetRun = (s: string) => s.length >= 4 && [...s].every((c, i) => i === 0 || c.charCodeAt(0) === s.charCodeAt(i - 1) + 1);

// A word looks real if it has a vowel, no long run of consonants ("ehdbf", "sjdb" fail), no letter repeated
// 3+ times in a row ("aaa"), isn't an alphabet run ("abcd") and isn't a placeholder ("test", "asdf").
function realWord(w: string) {
  const s = w.toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return /\d/.test(w); // numbers count
  if (JUNK.test(s) || alphabetRun(s) || /(.)\1\1/.test(s)) return false;
  if (s.length <= 2) return true; // "a", "of", "us", "uk"
  return /[aeiouy]/.test(s) && !/[^aeiouy]{5,}/.test(s);
}

function looksReal(text: string, minWords: number) {
  const t = text.trim();
  if (NON_LATIN.test(t)) return t.length >= 4;
  const words = t.match(WORD) ?? [];
  if (words.length < minWords) return false;
  const real = words.filter(realWord).length;
  return real > 0 && real / words.length >= 0.7;
}

const STAGE_WORDS = /\b(pre[- ]?launch|launching|idea|prototype|dtc|d2c|online|shopify|amazon|etsy|retail|wholesale|stores?|marketplaces?|stockists?|website|instagram|restaurants?|cafes?|pop[- ]?ups?|local|nationwide|exporting)\b/i;

const PRICE_WORDS = /\b(premium|luxury|budget|mass|mid|affordable|value|cheap|expensive|high[- ]end|entry[- ]level|free)\b/i;

export type BriefField = "website" | "brand" | "category" | "categoryOther" | "product" | "identity" | "customer" | "price" | "stage";
export type BriefProblems = Partial<Record<BriefField, string>>;

// Every problem in the brief, keyed by field, so the form can show each one under its own field.
// With a website, the other answers are optional (the plan reads the site).
export function checkBriefFields(b: Brief, hasWebsite = false): BriefProblems {
  const out: BriefProblems = {};
  const skip = (v: string) => hasWebsite && !v.trim();
  // One real word is enough ("Lemonade", "Students"); keyboard mash and placeholders are still refused.
  const min = 1;
  const orBlank = hasWebsite ? " Or leave it blank and we'll read your site." : "";
  if (b.website?.trim() && !/^(https?:\/\/)?[^\s/?#]+\.[a-z]{2,}([/?#]\S*)?$/i.test(b.website.trim()))
    out.website = 'Enter a link like "brand.com".';
  // Brand names can be anything ("BCBG", "H&M"), so only placeholders like "ABCD" or "test" are refused.
  const brandWords = (b.brand.match(WORD) ?? []).map((w) => w.toLowerCase().replace(/[^a-z]/g, ""));
  const junkBrand = brandWords.length > 0 && brandWords.every((w) => w && (JUNK.test(w) || alphabetRun(w) || /(.)\1\1/.test(w)));
  if (!/\p{L}/u.test(b.brand) || b.brand.trim().length < 2 || junkBrand) out.brand = "Add your brand name.";
  if (b.category !== undefined && !b.category) out.category = "Choose a category.";
  if (b.category === "Other") {
    const c = (b.categoryOther ?? "").trim();
    if (c.length < 3 || !looksReal(c, 1) || /^(other|others|misc|products?|category)$/i.test(c))
      out.categoryOther = 'Type your category, like "pet care" or "stationery".';
  }
  if (!skip(b.product) && !looksReal(b.product, min))
    out.product = `Say what you sell in a few words, like "cold-pressed juice" or "leather wallets".${orBlank}`;
  if (!skip(b.identity) && !looksReal(b.identity, min))
    out.identity = `Describe your brand in a few words, like "playful and bold" or "calm, premium, made to last".${orBlank}`;
  if (!skip(b.customer) && !looksReal(b.customer, min))
    out.customer = `Say who buys, like "busy parents" or "students 18-24".${orBlank}`;
  if (!skip(b.price) && !/\d/.test(b.price) && !PRICE_WORDS.test(b.price) && !(hasWebsite && looksReal(b.price, 1)))
    out.price = `Add a price or a level, like "$15-25" or "premium".${orBlank}`;
  if (!skip(b.stage) && !STAGE_WORDS.test(b.stage) && !looksReal(b.stage, min))
    out.stage = `Say where you sell today, like "pre-launch" or "own website and Amazon".${orBlank}`;
  return out;
}

// The first problem as one message (the API uses this), or null if the brief looks real.
export function checkBrief(b: Brief, hasWebsite = false): string | null {
  return Object.values(checkBriefFields(b, hasWebsite))[0] ?? null;
}
