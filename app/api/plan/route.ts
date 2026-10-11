import Anthropic from "@anthropic-ai/sdk";
import { instructions, samplePlan, countries } from "@/lib/knowledge.generated";

export const runtime = "nodejs";
export const maxDuration = 120;

const COUNTRY_NAMES: Record<string, string> = {
  japan: "Japan",
  singapore: "Singapore",
  india: "India",
  us: "United States",
};

const FIELDS = ["brand", "product", "identity", "customer", "price", "stage", "country"] as const;
type Form = Record<(typeof FIELDS)[number], string> & { accessCode?: string };

// Best-effort per-IP limit. Serverless instances don't share memory, so also set a
// monthly spend limit in the Anthropic Console - that's the real safety net.
const hits = new Map<string, number[]>();
const LIMIT = 5; // plans per IP
const WINDOW_MS = 60 * 60 * 1000; // per hour

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("Server is missing ANTHROPIC_API_KEY.", { status: 500 });
  }

  let body: Form;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request.", { status: 400 });
  }

  if (process.env.ACCESS_CODE && body.accessCode !== process.env.ACCESS_CODE) {
    return new Response("That access code isn't right.", { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return new Response("You've hit the limit of 5 plans an hour. Try again later.", { status: 429 });
  }

  for (const f of FIELDS) {
    const v = body[f];
    if (typeof v !== "string" || !v.trim()) {
      return new Response(`Please fill in: ${f}.`, { status: 400 });
    }
    if (v.length > 1500) {
      return new Response(`"${f}" is too long - keep it under 1,500 characters.`, { status: 400 });
    }
  }

  const countryKey = body.country.toLowerCase();
  const research = countries[countryKey];
  if (!research) {
    return new Response("v0 covers Japan, Singapore, India and the US.", { status: 400 });
  }
  const countryName = COUNTRY_NAMES[countryKey];

  const brief = `Write the market-entry plan for this brand.

Brand: ${body.brand}
What they sell: ${body.product}
Brand identity: ${body.identity}
Target customer: ${body.customer}
Price point: ${body.price}
Where they sell today / stage: ${body.stage}
Target country: ${countryName}`;

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 4000,
    system: [
      { type: "text", text: instructions },
      { type: "text", text: `<sample_plan>\n${samplePlan}\n</sample_plan>` },
      {
        type: "text",
        text: `<country_research country="${countryName}">\n${research}\n</country_research>`,
        // Caches the instructions + sample + country doc so repeat runs are cheaper and faster.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: brief }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error(err);
        controller.enqueue(encoder.encode("\n\n_Something went wrong while writing the plan. Please try again._"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
