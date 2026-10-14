// Finished plans, saved under the access code that made them for 30 days. Keys:
//   fp:plan:<code>:<id>   hash {brand, country, category, created, text}   (expires after 30 days)
//   fp:plans:<code>       sorted set of ids, scored by when they were saved
// The id is a hash of the brief, so the same brief for the same country maps to the same saved plan:
// asking again returns it free. To get a fresh plan, change an answer or delete the saved one.
//   fp:shared:<id>        hash {text, created}   (expires after 30 days)
// The same brief from a different code reuses the shared copy (instant, no AI call) but still costs a credit.
import { createHash } from "node:crypto";
import { db } from "./credits";

export const KEEP_DAYS = 30;
const KEEP_MS = KEEP_DAYS * 24 * 60 * 60 * 1000;
const MAX_PLANS = 50; // per code; the oldest drop off past this

export type SavedPlanMeta = { id: string; brand: string; country: string; category: string; created: string; expires: string };
export type SavedPlan = SavedPlanMeta & { text: string };

const planKey = (code: string, id: string) => `fp:plan:${code}:${id}`;
const indexKey = (code: string) => `fp:plans:${code}`;
const sharedKey = (id: string) => `fp:shared:${id}`;

// Same answers (ignoring case and spacing) for the same country give the same id.
export function briefId(b: Record<string, unknown>): string {
  const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().replace(/\s+/g, " ") : "");
  const parts = ["website", "brand", "category", "product", "identity", "customer", "price", "stage", "country"].map((k) => norm(b[k]));
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 16);
}

export const validId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{16}$/.test(id);

// Dev-only stand-in when Redis isn't connected.
const g = globalThis as unknown as { __fpPlans?: Map<string, SavedPlan> };
const mem = (g.__fpPlans ??= new Map());
const memShared = ((g as { __fpShared?: Map<string, { text: string; created: string }> }).__fpShared ??= new Map());

const withExpiry = (p: Omit<SavedPlan, "expires">): SavedPlan => ({
  ...p,
  expires: new Date(new Date(p.created).getTime() + KEEP_MS).toISOString(),
});

export async function savePlan(code: string, id: string, plan: { brand: string; country: string; category: string; text: string }) {
  const created = new Date().toISOString();
  if (db) {
    await db.hset(planKey(code, id), { ...plan, created });
    await db.expire(planKey(code, id), KEEP_DAYS * 24 * 60 * 60);
    await db.zadd(indexKey(code), { score: Date.now(), member: id });
    await db.expire(indexKey(code), KEEP_DAYS * 24 * 60 * 60);
    if (!(await db.exists(sharedKey(id)))) {
      await db.hset(sharedKey(id), { text: plan.text, created });
      await db.expire(sharedKey(id), KEEP_DAYS * 24 * 60 * 60);
    }
    // Keep the newest MAX_PLANS.
    const extra = (await db.zcard(indexKey(code))) - MAX_PLANS;
    if (extra > 0) {
      const old = (await db.zrange(indexKey(code), 0, extra - 1)) as string[];
      await db.zremrangebyrank(indexKey(code), 0, extra - 1);
      await Promise.all(old.map((o) => db!.del(planKey(code, o))));
    }
    return;
  }
  mem.set(planKey(code, id), withExpiry({ id, ...plan, created }));
  if (!memShared.has(id)) memShared.set(id, { text: plan.text, created });
}

// A plan someone else already made from exactly this brief, if it's less than 30 days old.
export async function getSharedPlan(id: string): Promise<string | null> {
  if (db) {
    const text = await db.hget(sharedKey(id), "text");
    return typeof text === "string" && text ? text : null;
  }
  const p = memShared.get(id);
  return p && Date.now() - Date.parse(p.created) < KEEP_MS ? p.text : null;
}

export async function getPlan(code: string, id: string): Promise<SavedPlan | null> {
  if (db) {
    const h = (await db.hgetall(planKey(code, id))) as Record<string, unknown> | null;
    if (!h || !h.text) return null;
    const s = (k: string) => String(h[k] ?? "");
    return withExpiry({ id, brand: s("brand"), country: s("country"), category: s("category"), created: s("created"), text: s("text") });
  }
  const p = mem.get(planKey(code, id));
  return p && Date.parse(p.expires) > Date.now() ? p : null;
}

export async function listPlans(code: string): Promise<SavedPlanMeta[]> {
  let plans: SavedPlan[];
  if (db) {
    await db.zremrangebyscore(indexKey(code), 0, Date.now() - KEEP_MS); // drop ids whose plans have expired
    const ids = (await db.zrange(indexKey(code), 0, -1, { rev: true })) as string[];
    plans = (await Promise.all(ids.map((id) => getPlan(code, id)))).filter((p): p is SavedPlan => !!p);
  } else {
    plans = [...mem.entries()]
      .filter(([k, p]) => k.startsWith(`fp:plan:${code}:`) && Date.parse(p.expires) > Date.now())
      .map(([, p]) => p)
      .sort((a, b) => b.created.localeCompare(a.created));
  }
  return plans.map(({ text: _text, ...meta }) => meta);
}

export async function deletePlan(code: string, id: string) {
  if (db) {
    // Deleting also drops the shared copy, so the next request for this brief gets a freshly written plan.
    await db.del(planKey(code, id), sharedKey(id));
    await db.zrem(indexKey(code), id);
    return;
  }
  mem.delete(planKey(code, id));
  memShared.delete(id);
}
