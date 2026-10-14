"use client";

import { useEffect, useState } from "react";
import { countryLabel } from "./brand";

export type SavedPlanMeta = { id: string; brand: string; country: string; category: string; created: string; expires: string };
export type SavedPlan = SavedPlanMeta & { text: string };

const CODE = /^[A-Z0-9]{2,}-[A-Z0-9-]{4,}$/;
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000));

async function call(body: object) {
  const res = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// Plans saved under this access code (kept 30 days). Open one to read it again, or delete it.
export function YourPlans({
  code,
  refresh,
  openId,
  onOpen,
}: {
  code: string;
  refresh: number;
  openId: string;
  onOpen: (plan: SavedPlan) => void;
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
      call({ code: clean, action: "list" })
        .then((d) => live && setPlans(d.plans ?? []))
        .catch(() => live && setPlans([]));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [clean, refresh]);

  async function open(id: string) {
    setBusy(id);
    setError("");
    try {
      const d = await call({ code: clean, action: "open", id });
      onOpen(d.plan);
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
      await call({ code: clean, action: "delete", id });
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
      <h3 id="your-plans-title">Your plans</h3>
      <p className="your-plans-note">Saved on this code for 30 days, then deleted automatically.</p>
      <ul>
        {plans.map((p) => (
          <li key={p.id} className={p.id === openId ? "open" : ""}>
            <div className="your-plan-info">
              <strong>
                {p.brand} <span aria-hidden="true">→</span> {countryLabel(p.country)}
              </strong>
              <small>
                {new Date(p.created).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · deletes in {daysLeft(p.expires)}{" "}
                {daysLeft(p.expires) === 1 ? "day" : "days"}
              </small>
            </div>
            <div className="your-plan-actions">
              {confirming === p.id ? (
                <>
                  <span className="your-plan-confirm">Delete this plan?</span>
                  <button type="button" className="btn btn-quiet admin-small danger" disabled={busy === p.id} onClick={() => remove(p.id)}>
                    {busy === p.id ? "Deleting..." : "Delete"}
                  </button>
                  <button type="button" className="btn btn-quiet admin-small" onClick={() => setConfirming("")}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-quiet admin-small" disabled={busy === p.id} onClick={() => open(p.id)}>
                    {busy === p.id ? "Opening..." : p.id === openId ? "Showing" : "Open"}
                  </button>
                  <button type="button" className="btn btn-quiet admin-small" onClick={() => setConfirming(p.id)}>
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
