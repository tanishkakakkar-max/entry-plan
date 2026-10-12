// "Get free access" sign-ups: one 3-credit code per email, stored in the same Upstash Redis as the
// codes. Keys:
//   fp:signup:<inbox key>        hash {email, code, consent, created}  (inbox key: see inboxKey)
//   fp:signups                   set of inbox keys
//   fp:signup-ip:<hash>:<day>    sign-ups from one IP today (expires after 2 days)
//   fp:signup-day:<day>          sign-ups today, for the global cap (expires after 2 days)
// IPs are stored only as a salted hash, and only in the short-lived counter.
import { createHash } from "node:crypto";
import { resolveMx } from "node:dns/promises";
import { createCode, db, getCode } from "./credits";

export const FREE_CREDITS = 3;
const PER_IP_PER_DAY = 3;
const PER_DAY = 50; // new free codes per day across the whole site

export type Signup = { email: string; code: string; consent: boolean; created: string };
export type SignupResult =
  | { ok: true; code: string; credits: number; existing: boolean }
  | { ok: false; kind: "invalid" | "disposable" | "ip_limit" | "daily_cap"; message: string };

// Throwaway inbox services. Not exhaustive; it stops the common ones.
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net",
  "tempmailo.com", "tempr.email", "yopmail.com", "yopmail.net", "trashmail.com", "trashmail.de", "getnada.com",
  "nada.email", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mohmal.com",
  "emailondeck.com", "mintemail.com", "mailnesia.com", "burnermail.io", "moakt.com", "mytemp.email",
  "emailfake.com", "getairmail.com", "spamgourmet.com", "mailcatch.com", "inboxkitten.com", "tmail.ws",
  "tmpmail.org", "tmpmail.net", "minuteinbox.com", "discard.email", "mail.tm", "mailpoof.com", "spambox.us",
  "33mail.com", "harakirimail.com", "mailtemp.net", "linshiyouxiang.net", "dropmail.me", "emailtemporanea.net",
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const today = () => new Date().toISOString().slice(0, 10);
const ipKey = (ip: string) => createHash("sha256").update(`fp-signup:${ip}`).digest("hex").slice(0, 16);

export function normalizeEmail(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

// One free code per inbox, ever. "name+tag@..." and, for Gmail, dots in the name reach the same
// inbox, so they count as the same email.
export function inboxKey(email: string): string {
  const [local, domain] = email.split("@");
  let user = local.split("+")[0];
  const gmail = domain === "gmail.com" || domain === "googlemail.com";
  if (gmail) user = user.replace(/\./g, "");
  return `${user}@${gmail ? "gmail.com" : domain}`;
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const mx = await Promise.race([resolveMx(domain), new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 3000))]);
    return mx.length > 0;
  } catch (err) {
    // No MX records means the domain can't receive mail; a timeout or DNS hiccup shouldn't block anyone.
    return !(err instanceof Error && /ENOTFOUND|ENODATA/.test((err as NodeJS.ErrnoException).code ?? ""));
  }
}

// Dev-only stand-in when Redis isn't connected.
const g = globalThis as unknown as { __fpSignups?: Map<string, Signup>; __fpCounters?: Map<string, number> };
const memSignups = (g.__fpSignups ??= new Map());
const memCounters = (g.__fpCounters ??= new Map());

async function bump(key: string, limit: number): Promise<boolean> {
  if (db) {
    const n = await db.incr(key);
    if (n === 1) await db.expire(key, 60 * 60 * 48);
    if (n > limit) {
      await db.decr(key);
      return false;
    }
    return true;
  }
  const n = (memCounters.get(key) ?? 0) + 1;
  if (n > limit) return false;
  memCounters.set(key, n);
  return true;
}

async function release(key: string) {
  if (db) await db.decr(key);
  else memCounters.set(key, Math.max(0, (memCounters.get(key) ?? 1) - 1));
}

// Sign-ups are stored under the inbox key; the email as typed is kept for display and export.
async function findSignup(key: string): Promise<Signup | null> {
  if (db) {
    const h = (await db.hgetall(`fp:signup:${key}`)) as Record<string, unknown> | null;
    return h && h.code
      ? { email: String(h.email ?? key), code: String(h.code), consent: String(h.consent) === "1", created: String(h.created ?? "") }
      : null;
  }
  return memSignups.get(key) ?? null;
}

export async function signUp(rawEmail: unknown, consent: boolean, ip: string): Promise<SignupResult> {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL.test(email) || email.length > 200) {
    return { ok: false, kind: "invalid", message: "Enter a valid email address." };
  }
  const domain = email.split("@")[1];
  if (DISPOSABLE.has(domain) || [...DISPOSABLE].some((d) => domain.endsWith(`.${d}`))) {
    return { ok: false, kind: "disposable", message: "Please use a permanent email address, not a temporary inbox." };
  }

  // One code per inbox, ever: show the same code again (and record a newly given opt-in).
  const key = inboxKey(email);
  const existing = await findSignup(key);
  if (existing) {
    if (consent && !existing.consent) {
      if (db) await db.hset(`fp:signup:${key}`, { consent: "1" });
      else existing.consent = true;
    }
    const info = await getCode(existing.code);
    return { ok: true, code: existing.code, credits: info ? Math.max(0, info.total - info.used) : 0, existing: true };
  }

  if (!(await domainAcceptsMail(domain))) {
    return { ok: false, kind: "invalid", message: "That email domain doesn't seem to receive mail. Check for a typo." };
  }

  const day = today();
  const ipCounter = `fp:signup-ip:${ipKey(ip)}:${day}`;
  const dayCounter = `fp:signup-day:${day}`;
  if (!(await bump(ipCounter, PER_IP_PER_DAY))) {
    return { ok: false, kind: "ip_limit", message: "Too many sign-ups from this network today. Try again tomorrow." };
  }
  if (!(await bump(dayCounter, PER_DAY))) {
    await release(ipCounter);
    return { ok: false, kind: "daily_cap", message: "Today's free codes are gone. Try tomorrow or get in touch." };
  }

  const info = await createCode(`Free sign-up: ${email}`, FREE_CREDITS, email);
  const signup: Signup = { email, code: info.code, consent, created: info.created };
  if (db) {
    await db.hset(`fp:signup:${key}`, { email, code: info.code, consent: consent ? "1" : "0", created: info.created });
    await db.sadd("fp:signups", key);
  } else {
    memSignups.set(key, signup);
  }
  return { ok: true, code: info.code, credits: FREE_CREDITS, existing: false };
}

export async function listSignups(): Promise<(Signup & { used: number; total: number })[]> {
  const keys = db ? ((await db.smembers("fp:signups")) as string[]) : [...memSignups.keys()];
  const rows = await Promise.all(
    keys.map(async (key) => {
      const s = await findSignup(key);
      if (!s) return null;
      const c = await getCode(s.code);
      return { ...s, used: c?.used ?? 0, total: c?.total ?? 0 };
    }),
  );
  return rows.filter((r): r is Signup & { used: number; total: number } => !!r).sort((a, b) => b.created.localeCompare(a.created));
}
