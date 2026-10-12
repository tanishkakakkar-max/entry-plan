// Protects /api/admin/* with the ADMIN_PASSWORD env var (set in Vercel, never in code).
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

// Returns a Response to send back if the request isn't allowed, or null if it is.
export async function requireAdmin(req: Request): Promise<Response | null> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return new Response("Set ADMIN_PASSWORD in Vercel to use the admin page.", { status: 503 });
  const given = req.headers.get("x-admin-password") ?? "";
  if (given && timingSafeEqual(digest(given), digest(expected))) return null;
  await new Promise((r) => setTimeout(r, 800)); // slow down guessing
  return new Response("Wrong password.", { status: 401 });
}
