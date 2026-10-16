import Anthropic from "@anthropic-ai/sdk";
import { instructions, samplePlan, countries } from "@/lib/knowledge.generated";
import { webResearch, formatWebResults, cleanWebsiteUrl, readWebsite, formatWebsite } from "@/lib/web";
import { CATEGORIES, OTHER, OTHER_MAX } from "@/lib/categories";
import { checkBrief } from "@/lib/brief";
import { creditsReady, getCode, normalizeCode, peekCode, refundCredit, reserveCredit } from "@/lib/credits";
import { briefId, getPlan, savePlan } from "@/lib/saved-plans";
import { aiCheckBrief } from "@/lib/brief-check";
import { formatResearch, selectResearch } from "@/lib/research";
import { formatScholarly, paperCitation, scholarlyResearch } from "@/lib/scholar";

export const runtime = "nodejs";
export const maxDuration = 300; // Hobby plan maximum with Fluid compute (Vercel docs, Oct 2026)

const COUNTRY_NAMES: Record<string, string> = {
  japan: "Japan",
  singapore: "Singapore",
  india: "India",
  us: "United States",
};

const FIELDS = ["brand", "product", "identity", "customer", "price", "stage", "country"] as const;
// Answers a brand can skip when it gives its website (the plan reads the site instead).
// Where they sell today stays required: a website can't show stage, stores or wholesale reliably.
const OPTIONAL_WITH_WEBSITE = ["product", "identity", "customer", "price"] as const;
// Plain-English names for the form fields, used in the server's messages (same wording as the form).
const FIELD_NAMES: Record<(typeof FIELDS)[number], string> = {
  brand: "your brand name",
  product: "what you sell",
  identity: "your brand identity",
  customer: "your target customer",
  price: "your price point",
  stage: "where you sell today",
  country: "the market you want to enter",
};
type Form = Record<(typeof FIELDS)[number], string> & { accessCode?: string; category?: string; categoryOther?: string; website?: string };

type Send = (text: string) => void;

// Claude (paid, best quality). Switch with LLM_PROVIDER=anthropic.
async function streamClaude(system: string[], brief: string, send: Send, cacheIndex: number) {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    // Sonnet 5.5 thinks before writing and those hidden tokens count against max_tokens; 4,500 cut
    // plans off mid-way. Room for thinking + a ~3k-token plan, with effort "medium" to keep thinking lean.
    // (Claude only; the Groq cap is set separately in streamGroq.)
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: system.map((text, i) => ({
      type: "text" as const,
      text,
      // Caches the stable blocks (instructions, sample, country doc, related research); website and
      // web results change every request.
      ...(i === cacheIndex ? { cache_control: { type: "ephemeral" as const } } : {}),
    })),
    messages: [{ role: "user", content: brief }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") send(event.delta.text);
  }
  // Why the model stopped and what it used: a plan cut short shows up here as max_tokens or similar.
  const final = await stream.finalMessage();
  const u = final.usage;
  console.log(
    `claude: stop=${final.stop_reason} out=${u.output_tokens} in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}`,
  );
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
      max_completion_tokens: 3000, // plans use ~2,500; Groq free tier counts input + this cap against 8K tokens/min
      reasoning_effort: "low",
      include_reasoning: false,
      messages: [
        { role: "system", content: system.join("\n\n") },
        { role: "user", content: brief },
      ],
    }),
  });

  // The page watches for this exact message and retries once by itself, so keep them in sync.
  if (res.status === 429) {
    send("The free AI tier is busy right now (rate limit). Please wait a minute and try again.");
    return;
  }
  if (res.status === 413) {
    send("This plan is too large for the free AI tier. Try shorter answers or leave out the website.");
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

  // Live plans need an access code with credits left. The page tells codes apart by X-Code-Status.
  const codeError = (status: number, reason: string, message: string) =>
    new Response(message, { status, headers: { "X-Code-Status": reason } });
  if (!creditsReady) {
    return new Response("Access codes aren't set up yet. Please try again later.", { status: 503 });
  }
  const code = normalizeCode(body.accessCode);
  if (!code) return codeError(401, "missing", "Enter your access code to get a live plan.");

  // With a website, the detail fields are optional: the plan reads the site instead.
  const website = cleanWebsiteUrl(body.website);
  if (body.website?.trim() && !website) {
    return new Response("That website link doesn't look right - try something like brand.com.", { status: 400 });
  }
  for (const f of FIELDS) {
    const v = body[f];
    if (website && (OPTIONAL_WITH_WEBSITE as readonly string[]).includes(f) && (v === undefined || v === null || v === "")) {
      body[f] = "";
      continue;
    }
    if (typeof v !== "string" || !v.trim()) {
      return new Response(`Please add ${FIELD_NAMES[f]}.`, { status: 400 });
    }
    if (v.length > 1500) {
      return new Response(`Please keep ${FIELD_NAMES[f]} under 1,500 characters.`, { status: 400 });
    }
  }

  // Reject nonsense before any credit is spent.
  const problem = checkBrief(body, !!website);
  if (problem) return new Response(problem, { status: 400 });

  // Optional extras: category must be one we support; website must be a plain http(s) link.
  const picked = CATEGORIES.find((c) => c === body.category);
  if (body.category && !picked) {
    return new Response("Please pick a category from the list.", { status: 400 });
  }
  // "Other": the founder's own category, e.g. "pet care". Used as the category everywhere below.
  const otherText = typeof body.categoryOther === "string" ? body.categoryOther.trim().slice(0, OTHER_MAX) : "";
  body.categoryOther = picked === OTHER ? otherText : "";
  const category = picked === OTHER ? otherText.toLowerCase() : picked;
  const countryKey = body.country.toLowerCase();
  const research = countries[countryKey];
  if (!research) {
    return new Response("v0 covers Japan, Singapore, India and the US.", { status: 400 });
  }
  const countryName = COUNTRY_NAMES[countryKey];

  // Same brief, same country, same code: hand back the saved plan. No credit, no AI call.
  // (Works even when the code is used up, as long as it exists and isn't switched off.)
  const planId = briefId({ ...body, website: website ?? "", category: category ?? "", country: countryKey });
  const codeInfo = await getCode(code);
  if (codeInfo && !codeInfo.disabled) {
    const saved = await getPlan(code, planId).catch(() => null);
    if (saved) {
      return new Response(saved.text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Saved-Plan": saved.id,
          "X-Credits-Left": String(Math.max(0, codeInfo.total - codeInfo.used)),
        },
      });
    }
  }

  // Check the code before spending anything on the AI brief check.
  const codeState = await peekCode(code);
  const refuse = (r: { reason: string }) =>
    r.reason === "used_up"
      ? codeError(402, "used_up", "This code is used up.")
      : r.reason === "disabled"
        ? codeError(403, "disabled", "This code has been switched off.")
        : codeError(403, "invalid", "That access code isn't right. Check it and try again.");
  if (!codeState.ok) return refuse(codeState);


  // Blank answers + website: read the site now, before any credit is spent, and stop if it's unreadable.
  const blanks = OPTIONAL_WITH_WEBSITE.filter((f) => !body[f].trim());
  let siteText: string | null = null;
  if (website) {
    siteText = await readWebsite(website).catch((err) => {
      console.error("website read failed", err);
      return "";
    });
    if (blanks.length && siteText.length < 300) {
      return new Response(
        "We couldn't read enough from your website. Please fill in what you sell, your customer and your price.",
        { status: 400 },
      );
    }
  }

  // Does the brief make enough sense to build a strategy on? Rejections cost no credit.
  const notUsable = await aiCheckBrief(
    { ...body, category: picked === OTHER ? `Other: ${otherText}` : category, country: countryName, website, websiteText: siteText ?? undefined },
    provider,
  );
  if (notUsable) return new Response(notUsable, { status: 400, headers: { "X-Brief": "not_usable" } });

  // Take the credit now (so two tabs can't overspend it) and give it back if no plan comes out.
  const reservation = await reserveCredit(code);
  if (!reservation.ok) return refuse(reservation);

  // Tagged research notes that match this country or category. Example plans are never included.
  const related = selectResearch(countryKey, category, picked === OTHER);
  console.log(
    `research used (${related.length}, ${picked ?? "no category"} -> ${countryName}): ${related.map((n) => `${n.file} [${n.why}]`).join(", ") || "none"}`,
  );
  // "No category-specific research" only when no category note covers the target country.
  const noCategoryResearch = !related.some(
    (n) => n.catMatch && (n.countries.includes(countryKey) || n.countries.includes("all")),
  );

  const fromSite = (v: string) => v.trim() || "(not given - work it out from the brand website)";
  const brief = `Write the market-entry plan for this brand.

Brand: ${body.brand}
${category ? `Category: ${category}${noCategoryResearch ? " (no category-specific research: use the country research, web results and the brief, and mark category rules [verify])" : ""}\n` : ""}What they sell: ${fromSite(body.product)}
Brand identity: ${fromSite(body.identity)}
Target customer: ${fromSite(body.customer)}
Price point: ${fromSite(body.price)}
Where they sell today / stage: ${fromSite(body.stage)}
Target country: ${countryName}${website ? `\nWebsite: ${website}` : ""}`;

  // Live web search runs alongside the research docs (skipped if TAVILY_API_KEY isn't set).
  const searchTopic = body.product.trim() || `${body.brand} ${category ?? ""}`.trim();
  const [webResults, siteRead, papers] = await Promise.all([
    webResearch(category ? `${category} ${searchTopic}` : searchTopic, countryName, body.brand, website).catch(() => []),
    siteText !== null
      ? Promise.resolve(siteText)
      : website
        ? readWebsite(website).catch((err) => {
            console.error("website read failed", err);
            return "";
          })
        : Promise.resolve(""),
    // Peer-reviewed papers (OpenAlex), cited as [S#] for lasting insights.
    scholarlyResearch(picked === OTHER ? otherText : picked, countryName),
  ]);
  siteText = siteRead;
  const web = formatWebResults(webResults);
  const scholarly = formatScholarly(papers);
  const site = website ? formatWebsite(website, siteText) : "";
  console.log(`web results: ${webResults.length}, papers: ${papers.length} (${countryName})${website ? `, website chars: ${siteText.length}` : ""}`);

  const relatedBlock = formatResearch(related);

  const system = [
    instructions,
    `<sample_plan>\n${samplePlan}\n</sample_plan>`,
    `<country_research country="${countryName}">\n${research}\n</country_research>`,
    ...(relatedBlock ? [relatedBlock] : []),
    ...(site ? [site] : []),
    ...(web ? [web] : []),
    ...(scholarly ? [scholarly] : []),
  ];
  const cacheIndex = relatedBlock ? 3 : 2;

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
          await streamClaude(system, brief, send, cacheIndex);
        } else {
          await streamGroq(system, brief, send);
        }
        // The model doesn't reliably write the Sources list, so build it from the [S#] and [W#] tags it
        // actually cited: papers under "Research", web pages under "Web".
        // Only skip if the model already wrote a Sources section with real links.
        if (!/^#+\s*Sources[\s\S]*(\]\(http|https?:\/\/doi)/im.test(output)) {
          const citedOf = (tag: "W" | "S", list: unknown[]) =>
            [...new Set([...output.matchAll(new RegExp(`[\\[【]${tag}(\\d+)[\\]】]`, "g"))].map((m) => Number(m[1])))]
              .filter((n) => list[n - 1])
              .sort((a, b) => a - b);
          const citedW = citedOf("W", webResults);
          const citedS = citedOf("S", papers);
          const research = citedS.map((n) => `- ${paperCitation(papers[n - 1], n)}`).join("\n");
          const webList = citedW
            .map((n) => `- [W${n}] [${webResults[n - 1].title.replace(/[[\]]/g, "")}](${webResults[n - 1].url})`)
            .join("\n");
          if (research || webList) {
            send(
              `\n\n## Sources\n${research ? `\n### Research\n\n${research}\n` : ""}${webList ? `\n### Web\n\n${webList}\n` : ""}`,
            );
          }
        }
      } catch (err) {
        console.error(err);
        try {
          send("\n\n_Something went wrong while writing the plan. Please try again in a minute._");
        } catch {
          // the reader has gone away
        }
      } finally {
        // Only a finished plan costs a credit: errors, rate limits and non-plan replies are refunded.
        // A plan counts as finished only if it reached section 9; anything cut short is refunded.
        const finished =
          output.trimStart().startsWith("#") && /^##\s*9\./m.test(output) && !output.includes("Something went wrong while writing");
        if (!finished) console.log(`plan not finished (${output.length} chars), credit refunded`);
        if (!finished) await refundCredit(code).catch((e) => console.error("refund failed", e));
        else
          await savePlan(code, planId, { brand: body.brand.trim(), country: countryKey, category: category ?? "", text: output }).catch((e) =>
            console.error("saving plan failed", e),
          );
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Credits left if this plan finishes; the page only shows it after a successful plan.
      "X-Credits-Left": String(reservation.left),
      "X-Plan-Id": planId,
    },
  });
}
