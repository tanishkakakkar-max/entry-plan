"use client";

import { forwardRef, useEffect, useState } from "react";

const CODE = /^[A-Z0-9]{2,}-[A-Z0-9-]{4,}$/;

// Top of "Get a plan": get a free code by email right here (same /api/access as /free-access), or see the
// code saved on this device and how many plans are left. The code also fills the Access code field below.
export const AccessStep = forwardRef<HTMLDivElement, { code: string; onCode: (code: string) => void; open: boolean; refresh: number }>(
  function AccessStep({ code, onCode, open, refresh }, ref) {
    const [email, setEmail] = useState("");
    const [consent, setConsent] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [fresh, setFresh] = useState(""); // a code we just got: shown as "Your code" with a Copy button
    const [copied, setCopied] = useState(false);
    const [left, setLeft] = useState<number | null>(null);
    const [status, setStatus] = useState<"" | "checking" | "ok" | "bad">("");
    const clean = code.trim().toUpperCase();

    useEffect(() => {
      if (open) setExpanded(true);
    }, [open]);

    // Plans left on the saved code (also tells us if the code is wrong).
    useEffect(() => {
      if (!CODE.test(clean)) {
        setStatus("");
        setLeft(null);
        return;
      }
      let live = true;
      setStatus("checking");
      const t = setTimeout(() => {
        fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: clean, action: "status" }),
        })
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((d) => {
            if (!live) return;
            setLeft(d.left);
            setStatus("ok");
          })
          .catch(() => live && setStatus("bad"));
      }, 300);
      return () => {
        live = false;
        clearTimeout(t);
      };
    }, [clean, refresh]);

    async function getFreeCode(e: React.SyntheticEvent) {
      e.preventDefault();
      if (!email.trim()) return;
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
        if (data.existing && data.credits === 0) {
          setError("You've already used the 3 free plans for this email. Want more? Get in touch at the bottom of the page.");
          return;
        }
        setFresh(data.code);
        setExpanded(false);
        onCode(data.code);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        setBusy(false);
      }
    }

    async function copy() {
      try {
        await navigator.clipboard.writeText(clean);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {}
    }

    const haveCode = !!clean && status !== "bad";
    const plansLeft =
      status === "ok" && left !== null ? (
        <>
          {" "}
          · {left} {left === 1 ? "plan" : "plans"} left
        </>
      ) : null;

    if (haveCode) {
      return (
        <div ref={ref} id="access" className="access-step has-code" role="status">
          <span className="access-tick" aria-hidden="true">
            ✓
          </span>
          {fresh && fresh === clean ? (
            <span>
              <strong>Your code:</strong> <span className="access-code">{clean}</span>
              {plansLeft}
            </span>
          ) : (
            <span>
              <strong>Code saved</strong>
              {plansLeft}
            </span>
          )}
          {fresh && fresh === clean ? (
            <button type="button" className="btn btn-quiet admin-small" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          ) : (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setFresh("");
                onCode("");
                setExpanded(true);
              }}
            >
              use a different code
            </button>
          )}
        </div>
      );
    }

    return (
      <div ref={ref} id="access" className={`access-step${expanded ? " is-open" : ""}`}>
        <p className="access-title">
          <strong>Get 3 free plans:</strong> enter your email and your code appears right here.
        </p>
        {status === "bad" && <p className="access-note">The code saved on this device isn&apos;t valid, so get a free one below.</p>}
        <form className="access-row" onSubmit={getFreeCode}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="Email"
            value={email}
            maxLength={200}
            required
            onFocus={() => setExpanded(true)}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn btn-orange" disabled={busy}>
            {busy ? "Getting your code..." : "Get my free code"}
          </button>
        </form>
        {error && (
          <p className="error access-error" role="alert">
            {error}
          </p>
        )}
        {expanded && (
          <div className="access-more">
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Yes, I&apos;d like to hear about First Port&apos;s latest offers and updates.</span>
            </label>
            <p className="privacy-line">
              We&apos;ll only use your email to give you your code and, if you opted in, occasional offers and updates.
            </p>
          </div>
        )}
      </div>
    );
  },
);
