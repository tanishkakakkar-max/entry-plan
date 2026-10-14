"use client";

import { useState } from "react";

// Shown under a finished plan: a comment box, saved through /api/feedback. Submit appears once they type.
export function FeedbackForm({ country, kind }: { country: string; kind: "live" | "example" }) {
  const [comment, setComment] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, country, kind, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="feedback-card no-print" aria-labelledby="feedback-title">
      <h2 id="feedback-title">How can I improve First Port?</h2>
      {sent ? (
        <p className="feedback-thanks" role="status">
          Thank you. Your feedback has been sent.
        </p>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="feedback-comment" className="feedback-lede">
            It&apos;s in beta, so any comments or suggestions on this plan help.
          </label>
          <textarea
            id="feedback-comment"
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment or suggestion"
          />
          <label className="feedback-trap" aria-hidden="true">
            Leave this empty
            <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {comment.trim() && (
            <button className="btn btn-orange feedback-submit" disabled={busy}>
              {busy ? "Sending..." : "Submit"}
            </button>
          )}
        </form>
      )}
    </aside>
  );
}
