import { requireAdmin } from "@/lib/admin-auth";
import { normalizeCode, updateCode } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Body: { topUp: number } to add credits, and/or { disabled: boolean }.
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const code = normalizeCode(decodeURIComponent((await params).code));
  const body = await req.json().catch(() => ({}));
  const topUp = body.topUp === undefined ? undefined : Number(body.topUp);
  if (topUp !== undefined && (!Number.isInteger(topUp) || topUp < 1 || topUp > 1000)) {
    return new Response("Top-up must be a whole number from 1 to 1000.", { status: 400 });
  }
  const disabled = typeof body.disabled === "boolean" ? body.disabled : undefined;
  const updated = await updateCode(code, { topUp, disabled });
  return updated ? Response.json({ code: updated }) : new Response("No such code.", { status: 404 });
}
