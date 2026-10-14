import { requireAdmin } from "@/lib/admin-auth";
import { listFeedback } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return Response.json({ feedback: await listFeedback() });
}
