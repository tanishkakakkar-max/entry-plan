import { requireAdmin } from "@/lib/admin-auth";
import { listSignups } from "@/lib/signups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return Response.json({ signups: await listSignups() });
}
