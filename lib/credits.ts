// Access codes with credits, stored in Upstash Redis (connected through Vercel's Storage tab).
// Each code is a hash at fp:code:<CODE> with name, total, used, disabled and created; fp:codes lists them.
// Without Redis env vars, local dev falls back to an in-memory store so the app can run; production
// refuses to serve live plans until Redis is connected.
import { Redis } from "@upstash/redis";

export type CodeInfo = { code: string; name: string; total: number; used: number; disabled: boolean; created: string; email?: string };
export type Reservation = { ok: true; left: number } | { ok: false; reason: "invalid" | "disabled" | "used_up" };

const KEY = (code: string) => `fp:code:${code}`;
const INDEX = "fp:codes";

// Atomically take one credit if the code exists, is enabled and has credits left.
// Returns credits left after taking one, or -1 not found, -2 disabled, -3 used up.
const RESERVE = `
local total = tonumber(redis.call('HGET', KEYS[1], 'total') or '-1')
if total < 0 then return -1 end
if redis.call('HGET', KEYS[1], 'disabled') == '1' then return -2 end
local used = tonumber(redis.call('HGET', KEYS[1], 'used') or '0')
if used >= total then return -3 end
redis.call('HINCRBY', KEYS[1], 'used', 1)
return total - used - 1
`;
// Give the credit back (plan failed, rate limited, or the reply wasn't a plan).
const REFUND = `
local used = tonumber(redis.call('HGET', KEYS[1], 'used') or '0')
if used > 0 then redis.call('HINCRBY', KEYS[1], 'used', -1) end
return 1
`;

function redisFromEnv(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const redis = redisFromEnv();
// Shared with lib/signups.ts so sign-ups live in the same database as the codes.
export const db = redis;
export const creditsReady = !!redis || process.env.NODE_ENV !== "production";

// Dev-only stand-in so the app runs locally without Redis. Seeded with one test code.
const g = globalThis as unknown as { __fpCodes?: Map<string, CodeInfo> };
const mem = (g.__fpCodes ??= new Map<string, CodeInfo>([
  ["DEV-TEST", { code: "DEV-TEST", name: "Local test code", total: 3, used: 0, disabled: false, created: new Date().toISOString() }],
]));

export function normalizeCode(input: unknown): string {
  return typeof input === "string" ? input.trim().toUpperCase().replace(/\s+/g, "") : "";
}

export function newCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `FP-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

function toInfo(code: string, h: Record<string, unknown> | null): CodeInfo | null {
  if (!h || h.total === undefined || h.total === null) return null;
  return {
    code,
    name: String(h.name ?? ""),
    total: Number(h.total),
    used: Number(h.used ?? 0),
    disabled: String(h.disabled ?? "0") === "1",
    created: String(h.created ?? ""),
    ...(h.email ? { email: String(h.email) } : {}),
  };
}

export async function reserveCredit(code: string): Promise<Reservation> {
  let r: number;
  if (redis) {
    r = Number(await redis.eval(RESERVE, [KEY(code)], []));
  } else {
    const c = mem.get(code);
    r = !c ? -1 : c.disabled ? -2 : c.used >= c.total ? -3 : (c.used++, c.total - c.used);
  }
  if (r === -1) return { ok: false, reason: "invalid" };
  if (r === -2) return { ok: false, reason: "disabled" };
  if (r === -3) return { ok: false, reason: "used_up" };
  return { ok: true, left: r };
}

// Read-only version of reserveCredit: is this code usable right now? Takes nothing.
export async function peekCode(code: string): Promise<Reservation> {
  let c: CodeInfo | null;
  if (redis) c = toInfo(code, await redis.hgetall(KEY(code)));
  else c = mem.get(code) ?? null;
  if (!c) return { ok: false, reason: "invalid" };
  if (c.disabled) return { ok: false, reason: "disabled" };
  if (c.used >= c.total) return { ok: false, reason: "used_up" };
  return { ok: true, left: c.total - c.used };
}

export async function refundCredit(code: string) {
  if (redis) {
    await redis.eval(REFUND, [KEY(code)], []);
  } else {
    const c = mem.get(code);
    if (c && c.used > 0) c.used--;
  }
}

export async function listCodes(): Promise<CodeInfo[]> {
  if (!redis) return [...mem.values()].sort((a, b) => b.created.localeCompare(a.created));
  const codes = (await redis.smembers(INDEX)) as string[];
  const rows = await Promise.all(codes.map(async (c) => toInfo(c, await redis.hgetall(KEY(c)))));
  return rows.filter((r): r is CodeInfo => !!r).sort((a, b) => b.created.localeCompare(a.created));
}

export async function createCode(name: string, credits: number, email?: string): Promise<CodeInfo> {
  const info: CodeInfo = { code: newCode(), name, total: credits, used: 0, disabled: false, created: new Date().toISOString(), ...(email ? { email } : {}) };
  if (redis) {
    await redis.hset(KEY(info.code), { name, total: credits, used: 0, disabled: "0", created: info.created, ...(email ? { email } : {}) });
    await redis.sadd(INDEX, info.code);
  } else {
    mem.set(info.code, info);
  }
  return info;
}

export async function getCode(code: string): Promise<CodeInfo | null> {
  if (redis) return toInfo(code, await redis.hgetall(KEY(code)));
  return mem.get(code) ?? null;
}

export async function updateCode(code: string, change: { topUp?: number; disabled?: boolean }): Promise<CodeInfo | null> {
  if (redis) {
    const exists = await redis.exists(KEY(code));
    if (!exists) return null;
    if (change.topUp) await redis.hincrby(KEY(code), "total", change.topUp);
    if (change.disabled !== undefined) await redis.hset(KEY(code), { disabled: change.disabled ? "1" : "0" });
    return toInfo(code, await redis.hgetall(KEY(code)));
  }
  const c = mem.get(code);
  if (!c) return null;
  if (change.topUp) c.total += change.topUp;
  if (change.disabled !== undefined) c.disabled = change.disabled;
  return c;
}
