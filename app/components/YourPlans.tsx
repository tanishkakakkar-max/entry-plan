"use client";

import { useEffect, useState } from "react";
import { countryLabel } from "./brand";

export type SavedPlanMeta = { id: string; brand: string; country: string; category: string; created: string; expires: string };
export type SavedPlan = SavedPlanMeta & { text: string; brief?: Record<string, string> };

const CODE = /^[A-Z0-9]{2,}-[A-Z0-9-]{4,}$/;
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000));

export async function plansCall(body: object) {
  const res = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// Plans saved under this code (kept 30 days): open one, edit its answers and rerun, or delete it.
export function YourPlans({
  code,
  refresh,
  openId,
  onOpen,
  onEdit,
}: {
  code: string;
  refresh: number;
  openId: string;
  onOpen: (plan: SavedPlan) => void;
  onEdit: (plan: SavedPlan) => void;
}) {
  const [plans, setPlans] = useState<SavedPlanMeta[]>([]);
  const [confirming, setConfirming] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const clean = code.trim().toUpperCase();

  useEffect(() => {
    if (!CODE.test(clean)) {
      setPlans([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      plansCall({ code: clean, action: "list" })
        .then((d) => live && setPlans(d.plans ?? []))
        .catch(() => live && setPlans([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [clean, refresh]);

  async function fetchPlan(id: string, then: (p: SavedPlan) => void) {
    setBusy(id);
    setError("");
    try {
      const d = await plansCall({ code: clean, action: "open", id });
      then(d.plan);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError("");
    try {
      await plansCall({ code: clean, action: "delete", id });
      setPlans((p) => p.filter((x) => x.id !== id));
      setConfirming("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (!plans.length) return null;

  return (
    <section className="your-plans no-print" aria-labelledby="your-plans-title">
      <div className="your-plans-head">
        <h2 id="your-plans-title">Your plans</h2>
        <p>Saved on your code for 30 days.</p>
      </div>
      <ul>
        {plans.map((p) => (
          <li key={p.id} className={p.id === openId ? "open" : ""}>
            <button type="button" className="your-plan-main" disabled={busy === p.id} onClick={() => fetchPlan(p.id, onOpen)}>
              <span className="your-plan-name">
                {p.brand} <span aria-hidden="true">→</span> {countryLabel(p.country)}
              </span>
              <small>
                {new Date(p.created).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · deletes in {daysLeft(p.expires)}{" "}
                {daysLeft(p.expires) === 1 ? "day" : "days"}
              </small>
            </button>
            <div className="your-plan-actions">
              {confirming === p.id ? (
                <>
                  <span className="your-plan-confirm">Delete for good? It can&apos;t be recovered.</span>
                  <button type="button" className="chip-btn danger" disabled={busy === p.id} onClick={() => remove(p.id)}>
                    Delete
                  </button>
                  <button type="button" className="chip-btn" onClick={() => setConfirming("")}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="chip-btn" disabled={busy === p.id} onClick={() => fetchPlan(p.id, onEdit)}>
                    Edit &amp; rerun
                  </button>
                  <button type="button" className="chip-btn" onClick={() => setConfirming(p.id)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
