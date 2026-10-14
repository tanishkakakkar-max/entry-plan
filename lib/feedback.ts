// Feedback left under a finished plan, stored in the same Upstash Redis as the codes. Keys:
//   fp:feedback:<id>              hash {comment, brand, country, kind, created}
//   fp:feedbacks                  list of ids, newest first
//   fp:feedback-ip:<hash>:<day>   messages from one IP today (expires after 2 days)
// IPs are stored only as a salted hash, and only in the short-lived counter.
import { createHash, randomUUID } from "node:crypto";
import { db } from "./credits";

const PER_IP_PER_DAY = 10;
export const COMMENT_MAX = 2000;

export type Feedback = {
  id: string;
  comment: string;
  brand: string;
  country: string;
  kind: "live" | "example";
  created: string;
};

const g = globalThis as unknown as { __fpFeedback?: Feedback[]; __fpFeedbackCounters?: Map<string, number> };
const mem = (g.__fpFeedback ??= []);
const memCounters = (g.__fpFeedbackCounters ??= new Map());

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function allowed(ip: string): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `fp:feedback-ip:${createHash("sha256").update(`fp-feedback:${ip}`).digest("hex").slice(0, 16)}:${day}`;
  if (db) {
    const n = await db.incr(key);
    if (n === 1) await db.expire(key, 60 * 60 * 48);
    return n <= PER_IP_PER_DAY;
  }
  const n = (memCounters.get(key) ?? 0) + 1;
  memCounters.set(key, n);
  return n <= PER_IP_PER_DAY;
}

export type FeedbackResult = { ok: true } | { ok: false; status: number; message: string };

export async function saveFeedback(body: Record<string, unknown>, ip: string): Promise<FeedbackResult> {
  // Bots fill every field, including the hidden one; pretend it worked.
  if (clean(body.website, 200)) return { ok: true };

  const comment = clean(body.comment, COMMENT_MAX);
  if (!comment) return { ok: false, status: 400, message: "Write a comment first." };
  if (!(await allowed(ip))) {
    return { ok: false, status: 429, message: "Thanks, we've had a lot from this network today. Try again tomorrow." };
  }

  const item: Feedback = {
    id: randomUUID(),
    comment,
    brand: clean(body.brand, 120),
    country: clean(body.country, 60),
    kind: body.kind === "example" ? "example" : "live",
    created: new Date().toISOString(),
  };
  if (db) {
    const { id, ...fields } = item;
    await db.hset(`fp:feedback:${id}`, fields);
    await db.lpush("fp:feedbacks", id);
  } else {
    mem.unshift(item);
  }
  return { ok: true };
}

export async function listFeedback(limit = 500): Promise<Feedback[]> {
  if (!db) return mem.slice(0, limit);
  const ids = (await db.lrange("fp:feedbacks", 0, limit - 1)) as string[];
  const rows = await Promise.all(
    ids.map(async (id) => {
      const h = (await db!.hgetall(`fp:feedback:${id}`)) as Record<string, unknown> | null;
      if (!h) return null;
      const s = (k: string) => String(h[k] ?? "");
      return {
        id,
        comment: s("comment"),
        brand: s("brand"),
        country: s("country"),
        kind: s("kind") === "example" ? "example" : "live",
        created: s("created"),
      } satisfies Feedback;
    }),
  );
  return rows.filter((r): r is Feedback => !!r);
}
