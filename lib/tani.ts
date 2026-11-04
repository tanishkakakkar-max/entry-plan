// Tani, the site guide: her faces and the answers she falls back on when the AI isn't reachable.
// The faces are cut from Tanishka's sticker sheet (public/tani/tani-<face>.webp).

export const FACES = ["wave", "curious", "relaxed", "thinking", "pointing", "shrug", "idea", "thumbsup", "smile"] as const;
export type Face = (typeof FACES)[number];
export const isFace = (v: unknown): v is Face => typeof v === "string" && (FACES as readonly string[]).includes(v);

export const faceSrc = (f: Face) => `/tani/tani-${f}.webp`;

export type ChatTurn = { role: "user" | "tani"; text: string; face?: Face };

export const SUGGESTIONS = ["How do codes work?", "Which countries?", "How long does a plan take?", "Who built this?", "How do I get in touch?"];

// Keyword answers for when the chat API can't be reached (or has no key in local development).
const FALLBACK: { match: RegExp; face: Face; reply: string }[] = [
  {
    match: /code|free|credit|how many/i,
    face: "pointing",
    reply: "Go to **Create**, type your email and press **Send code**. Your code shows up right there and gives you 5 free plans. Each finished plan uses one.",
  },
  {
    match: /countr|where|market|japan|singapore|india|us\b|united states/i,
    face: "smile",
    reply: "Four for now: Japan, Singapore, India and the United States. Your brand can be based anywhere.",
  },
  { match: /long|time|minute|fast/i, face: "smile", reply: "About 2 minutes once you press the button. You'll see each step as it happens." },
  {
    match: /edit|change|rerun|update/i,
    face: "idea",
    reply: "Open the plan and press **Edit inputs and rerun**. Change any answer and you get a new version; the old one stays in **Your plans**.",
  },
  {
    match: /who|built|tanishka|about you|founder/i,
    face: "relaxed",
    reply: "I'm Tanishka, a business administration student at San José State, concentrating in marketing with a minor in computer science. I built First Port to make market research for going abroad quick and affordable, even for small brands.",
  },
  {
    match: /contact|touch|email|reach|talk/i,
    face: "pointing",
    reply: "Email me at contact@findyourfirstport.com. It's also in the footer of every page.",
  },
  {
    match: /sample|example/i,
    face: "pointing",
    reply: "Head to **Samples** to read full example plans for free, no code needed.",
  },
  {
    match: /chatgpt|different|why use|ai/i,
    face: "idea",
    reply: "Every plan is built on research I've checked against official sources, like tariffs read line by line in the Federal Register, with links so you can check them too.",
  },
  { match: /^(hi|hey|hello|yo)\b/i, face: "wave", reply: "Hi! Ask me anything about First Port, the four countries, or how to get your plan." },
];

export function fallbackAnswer(q: string): { face: Face; reply: string } {
  return (
    FALLBACK.find((f) => f.match.test(q)) ?? {
      face: "shrug",
      reply: "I'm not sure about that one. Try asking how codes work, which countries I cover, or email contact@findyourfirstport.com.",
    }
  );
}
