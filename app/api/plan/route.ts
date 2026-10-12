import Anthropic from "@anthropic-ai/sdk";
import { instructions, samplePlan, countries } from "@/lib/knowledge.generated";
import { webResearch, formatWebResults } from "@/lib/web";

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

type Send = (text: string) => void;

// Claude (paid, best quality). Switch with LLM_PROVIDER=anthropic.
async function streamClaude(system: string[], brief: string, send: Send) {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 4000,
    system: system.map((text, i) => ({
      type: "text" as const,
      text,
      // Caches instructions + sample + country doc (blocks 0-2); web results change every request.
      ...(i === 2 ? { cache_control: { type: "ephemeral" as const } } : {}),
    })),
    messages: [{ role: "user", content: brief }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") send(event.delta.text);
  }
}

// Groq (free tier). Default provider. Free limits are roughly 8K tokens per minute and
// 200K per day; each plan uses ~7K, so expect ~1 plan a minute and ~25 a day. If your
// country docs grow a lot, requests can exceed 8K - that's the moment to switch to Claude.
async function streamGroq(system: string[], brief: string, send: Send) {
  const res = await fetch(`${process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      stream: true,
      max_completion_tokens: 3500,
      reasoning_effort: "low",
      include_reasoning: false,
      messages: [
        { role: "system", content: system.join("\n\n") },
        { role: "user", content: brief },
      ],
    }),
  });

  if (res.status === 429 || res.status === 413) {
    send("The free AI tier is busy right now (rate limit). Please wait a minute and try again.");
    return;
  }
  if (!res.ok || !res.body) {
    console.error("Groq error", res.status, await res.text());
    send("_The AI service returned an error. Please try again in a minute._");
    return;
  }

  // Groq streams OpenAI-style server-sent events: lines of "data: {json}".
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;
      const payload = data.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const text = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (text) send(text);
      } catch {
        // ignore keep-alive or partial lines
      }
    }
  }
}

export async function POST(req: Request) {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  const keyName = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GROQ_API_KEY";
  if (!process.env[keyName]) {
    return new Response(`Server is missing ${keyName}.`, { status: 500 });
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

  // Live web search runs alongside the research docs (skipped if TAVILY_API_KEY isn't set).
  const webResults = await webResearch(body.product, countryName).catch(() => []);
  const web = formatWebResults(webResults);
  console.log(`web results: ${webResults.length} (${countryName})`);

  const system = [
    instructions,
    `<sample_plan>\n${samplePlan}\n</sample_plan>`,
    `<country_research country="${countryName}">\n${research}\n</country_research>`,
    ...(web ? [web] : []),
  ];

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let output = "";
      const send = (t: string) => {
        output += t;
        controller.enqueue(encoder.encode(t));
      };
      try {
        if (provider === "anthropic") {
          await streamClaude(system, brief, send);
        } else {
          await streamGroq(system, brief, send);
        }
        // The model doesn't reliably write the Sources list, so build it from the [W#] tags it actually cited.
        // Only skip if the model already wrote a Sources section with real links.
        if (!/^#+\s*Sources[\s\S]*\]\(http/im.test(output)) {
          const cited = [...new Set([...output.matchAll(/\[W(\d+)\]/g)].map((m) => Number(m[1])))]
            .filter((n) => webResults[n - 1])
            .sort((a, b) => a - b);
          if (cited.length) {
            send(`\n\n## Sources\n\n${cited.map((n) => `- [W${n}] [${webResults[n - 1].title.replace(/[[\]]/g, "")}](${webResults[n - 1].url})`).join("\n")}\n`);
          }
        }
      } catch (err) {
        console.error(err);
        send("\n\n_Something went wrong while writing the plan. Please try again in a minute._");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
