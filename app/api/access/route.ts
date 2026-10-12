import { creditsReady } from "@/lib/credits";
import { signUp } from "@/lib/signups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Get free access": email (+ optional marketing opt-in) -> a 3-credit code, one per email.
export async function POST(req: Request) {
  if (!creditsReady) return Response.json({ error: "Free access isn't available right now." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const result = await signUp(body.email, body.consent === true, ip);
  if (!result.ok) {
    const status = result.kind === "daily_cap" || result.kind === "ip_limit" ? 429 : 400;
    return Response.json({ error: result.message, kind: result.kind }, { status });
  }
  return Response.json(result);
}
