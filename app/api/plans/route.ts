import { creditsReady, getCode, normalizeCode } from "@/lib/credits";
import { deletePlan, getPlan, listPlans, validId } from "@/lib/saved-plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Your plans": the saved plans for an access code. The code goes in the body, never the URL.
//   {code, action: "status"}           -> {left, disabled}   (plans left on the code)
//   {code, action: "list"}             -> {plans: [...]}
//   {code, action: "open", id}         -> {plan: {..., text}}
//   {code, action: "delete", id}       -> {ok: true}
export async function POST(req: Request) {
  if (!creditsReady) return Response.json({ error: "Saved plans aren't available right now." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const code = normalizeCode(body?.code);
  const info = code ? await getCode(code) : null;
  if (!info) {
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return Response.json({ error: "That access code isn't right." }, { status: 403 });
  }

  if (body.action === "status") {
    return Response.json({ left: Math.max(0, info.total - info.used), disabled: info.disabled });
  }
  if (body.action === "list") return Response.json({ plans: await listPlans(code) });
  if (!validId(body.id)) return Response.json({ error: "Plan not found." }, { status: 404 });
  if (body.action === "open") {
    const plan = await getPlan(code, body.id);
    return plan ? Response.json({ plan }) : Response.json({ error: "That plan has expired or was deleted." }, { status: 404 });
  }
  if (body.action === "delete") {
    await deletePlan(code, body.id);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}
