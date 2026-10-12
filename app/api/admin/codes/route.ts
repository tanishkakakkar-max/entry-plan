import { requireAdmin } from "@/lib/admin-auth";
import { createCode, listCodes } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return Response.json({ codes: await listCodes() });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const credits = Number(body.credits);
  if (!name) return new Response("Give the code a name or note.", { status: 400 });
  if (!Number.isInteger(credits) || credits < 1 || credits > 1000) {
    return new Response("Credits must be a whole number from 1 to 1000.", { status: 400 });
  }
  return Response.json({ code: await createCode(name, credits) });
}
