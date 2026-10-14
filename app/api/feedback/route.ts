import { creditsReady } from "@/lib/credits";
import { saveFeedback } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Feedback left under a finished plan: a rating and/or a comment, plus an optional email for a reply.
export async function POST(req: Request) {
  if (!creditsReady) return Response.json({ error: "Feedback isn't available right now." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const result = await saveFeedback(body && typeof body === "object" ? body : {}, ip);
  if (!result.ok) return Response.json({ error: result.message }, { status: result.status });
  return Response.json({ ok: true });
}
