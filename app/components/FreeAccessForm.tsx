"use client";

import { useState } from "react";

// "Get 3 free plans": email (+ optional offers opt-in) -> a 3-credit access code from /api/access.
// The code is saved on this device so the plan form on the home page is already filled in.
export function FreeAccessForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ code: string; credits: number; existing: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setResult(data);
      try {
        localStorage.setItem("fp-code", data.code);
      } catch {}
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="free-access hero-free">
      <h1 className="free-title">Get 3 free plans</h1>
      <p className="free-sub">Enter your email for a free access code. One per email, no card needed.</p>
      {result && result.existing && result.credits === 0 ? (
        <div className="free-result" role="status">
          <p>You&apos;ve already used the 3 free plans for this email.</p>
          <p className="free-note">
            Free codes are one per email. Want more plans, or a personalised plan for your brand?
          </p>
          <a href="/#contact" className="btn btn-orange">
            Get in touch <span aria-hidden="true">→</span>
          </a>
        </div>
      ) : result ? (
        <div className="free-result" role="status">
          <p>
            {result.existing ? "You already have a code:" : "Your code:"} <strong className="free-code">{result.code}</strong>
            <button type="button" className="btn btn-quiet admin-small" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </p>
          <p className="free-note">
            {result.credits} {result.credits === 1 ? "plan" : "plans"} left. It&apos;s saved on this device and already filled
            in on the plan form. Keep a copy: you&apos;ll need it on other devices.
          </p>
          <a href="/#get-a-plan" className="btn btn-orange">
            Start your plan <span aria-hidden="true">→</span>
          </a>
        </div>
      ) : (
        <form className="free-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Yes, I&apos;d like to hear about First Port&apos;s latest offers and updates.</span>
          </label>
          <button className="btn btn-orange" disabled={busy}>
            {busy ? "Getting your code..." : "Get my free code"}
          </button>
          {error && (
            <p className="error free-error" role="alert">
              {error.includes("Today's free codes are gone") ? (
                <>
                  Today&apos;s free codes are gone. Try tomorrow or <a href="/#contact">get in touch</a>.
                </>
              ) : (
                error
              )}
            </p>
          )}
          <p className="privacy-line">
            We&apos;ll only use your email to give you your code and, if you opted in, occasional offers and updates.
          </p>
        </form>
      )}
    </div>
  );
}
