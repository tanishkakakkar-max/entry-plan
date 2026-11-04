"use client";

import { useEffect, useState } from "react";

const CODE = /^[A-Z0-9]{2,}-[A-Z0-9-]{4,}$/;

// "Get your free code": email -> a 5-plan code from /api/access, shown right here and saved on this device.
// With a code saved, it collapses to one line showing the code and plans left.
export function CodeCard({ code, onCode, refresh, notice }: { code: string; onCode: (code: string) => void; refresh: number; notice?: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"email" | "code">("email");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState("");
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<"" | "checking" | "ok" | "bad">("");
  const clean = code.trim().toUpperCase();

  useEffect(() => {
    if (!CODE.test(clean)) {
      setStatus("");
      setLeft(null);
      return;
    }
    let live = true;
    setStatus("checking");
    const t = setTimeout(() => {
      fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: clean, action: "status" }) })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          if (!live) return;
          setLeft(d.left);
          setStatus("ok");
        })
        .catch(() => live && setStatus("bad"));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [clean, refresh]);

  async function getCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      if (data.existing && data.credits === 0) {
        setError("You've already used the 5 free plans for this email. Want more? Email contact@findyourfirstport.com.");
        return;
      }
      setFresh(data.code);
      onCode(data.code);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (clean && status !== "bad") {
    return (
      <div className="code-card has-code" role="status">
        <span className="code-tick" aria-hidden="true">
          ✓
        </span>
        <span className="code-line">
          {fresh === clean ? "Your code" : "Code saved"} <strong className="code-value">{clean}</strong>
          {status === "ok" && left !== null && (
            <span className="code-left">
              {left} {left === 1 ? "plan" : "plans"} left
            </span>
          )}
        </span>
        {fresh === clean ? (
          <button
            type="button"
            className="link-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(clean);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        ) : (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setFresh("");
              setDraft("");
              setMode("code");
              onCode("");
            }}
          >
            Use a different code
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="code-card" id="code">
      {notice && (
        <p className="code-notice" role="alert">
          {notice}
        </p>
      )}
      {mode === "email" ? (
        <>
          <h2 className="code-title">Get your free code</h2>
          <p className="code-sub">5 free plans. Your code appears right here.</p>
          {status === "bad" && <p className="code-notice">The code saved on this device isn&apos;t valid, so get a free one below.</p>}
          <form onSubmit={getCode}>
            <label className="line-field">
              <span>Email</span>
              <input type="email" inputMode="email" autoComplete="email" placeholder="you@brand.com" value={email} maxLength={200} required onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Send me occasional First Port updates</span>
            </label>
            <button className="btn btn-dark btn-block" disabled={busy}>
              {busy ? "Getting your code..." : "Send code"}
            </button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="code-switch">
            <button type="button" className="link-btn accent" onClick={() => setMode("code")}>
              Already have a code? Enter it
            </button>
          </p>
        </>
      ) : (
        <>
          <h2 className="code-title">Enter your code</h2>
          {status === "bad" && <p className="code-notice">That code isn&apos;t right. Check it and try again.</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) onCode(draft.trim().toUpperCase());
            }}
          >
            <label className="line-field">
              <span>Access code</span>
              <input value={draft} placeholder="FP-XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus onChange={(e) => setDraft(e.target.value)} />
            </label>
            <button className="btn btn-dark btn-block" disabled={!draft.trim()}>
              Use this code
            </button>
          </form>
          <p className="code-switch">
            <button type="button" className="link-btn accent" onClick={() => setMode("email")}>
              No code? Get 5 free plans with your email
            </button>
          </p>
        </>
      )}
      <p className="privacy-line">We only use your email to give you a code and, if you tick the box, occasional updates.</p>
    </div>
  );
}
