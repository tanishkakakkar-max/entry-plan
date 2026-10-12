"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const COUNTRIES = [
  { key: "japan", label: "Japan" },
  { key: "singapore", label: "Singapore" },
  { key: "india", label: "India" },
  { key: "us", label: "United States" },
];

const EMPTY = { brand: "", product: "", identity: "", customer: "", price: "", stage: "", country: "japan" };

const EXAMPLE = {
  brand: "Hero Cosmetics",
  product: "Skincare - hydrocolloid acne patches (Mighty Patch) plus a small range of acne-care products",
  identity: "Friendly, science-backed, fun. Makes acne care feel less embarrassing. Hero-product focus.",
  customer: "Gen Z and millennial women and men with occasional breakouts, discovering products on TikTok",
  price: "Mass-premium, roughly $10-15 per pack",
  stage: "Selling in the US via Amazon, Target, Walmart, Ulta and DTC",
  country: "india",
};

const FIELDS: { name: keyof typeof EMPTY; label: string; hint: string; long?: boolean }[] = [
  { name: "brand", label: "Brand name", hint: "e.g. OLVAE" },
  { name: "product", label: "What you sell", hint: "Product and category", long: true },
  { name: "identity", label: "Brand identity", hint: "Positioning, values, voice - in your own words", long: true },
  { name: "customer", label: "Target customer", hint: "Who buys today, or who you want", long: true },
  { name: "price", label: "Price point", hint: "e.g. $40-90 per piece, premium" },
  { name: "stage", label: "Where you sell today", hint: "e.g. pre-launch, US DTC only, Amazon + retail" },
];

export default function Home() {
  const [form, setForm] = useState(EMPTY);
  const [accessCode, setAccessCode] = useState("");
  const [plan, setPlan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPlan("");
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accessCode }),
      });
      if (!res.ok || !res.body) {
        setError((await res.text()) || "Something went wrong.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setPlan(text);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">Entry Plan · v0</p>
        <h1>Where should your brand go next - and how should it get in?</h1>
        <p className="lede">
          Describe your brand and pick a country. You get a market-entry plan that takes a position: the entry point, the
          route, what local buyers actually believe, and the risks worth knowing before you spend.
        </p>
        <p className="byline">
          Built by Tanishka Kakkar on original country research for Japan, Singapore, India and the US, checked against live web sources.
        </p>
      </header>

      <div className="grid">
        <form onSubmit={submit} className="card">
          <div className="country-row" role="radiogroup" aria-label="Target country">
            {COUNTRIES.map((c) => (
              <button
                type="button"
                key={c.key}
                role="radio"
                aria-checked={form.country === c.key}
                className={form.country === c.key ? "chip active" : "chip"}
                onClick={() => setForm({ ...form, country: c.key })}
              >
                {c.label}
              </button>
            ))}
          </div>

          {FIELDS.map((f) => (
            <label key={f.name} className="field">
              <span>{f.label}</span>
              {f.long ? (
                <textarea
                  rows={3}
                  placeholder={f.hint}
                  value={form[f.name]}
                  maxLength={1500}
                  required
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              ) : (
                <input
                  placeholder={f.hint}
                  value={form[f.name]}
                  maxLength={300}
                  required
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              )}
            </label>
          ))}

          <label className="field">
            <span>Access code (if you were given one)</span>
            <input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Optional" />
          </label>

          <div className="actions">
            <button className="primary" disabled={loading}>
              {loading ? "Writing your plan…" : "Get my entry plan"}
            </button>
            <button type="button" className="ghost" onClick={() => setForm(EXAMPLE)} disabled={loading}>
              Try an example
            </button>
          </div>
        </form>

        <section ref={planRef} className="card plan" aria-live="polite">
          {!plan && !error && !loading && (
            <div className="empty">
              <p className="empty-title">Your plan appears here.</p>
              <ol>
                <li>The call: go, test first, or not yet</li>
                <li>Recommended entry point</li>
                <li>Phased entry strategy</li>
                <li>Consumer psychology</li>
                <li>Brand adaptation</li>
                <li>Competitive reality</li>
                <li>Risks, with mitigation</li>
                <li>Rewards</li>
                <li>What to validate before you spend</li>
              </ol>
            </div>
          )}
          {loading && !plan && <p className="muted pulse">Reading the country research and searching the web…</p>}
          {error && <p className="error">{error}</p>}
          {plan && (
            <>
              <div className="plan-tools">
                <button className="ghost small" onClick={copy} disabled={loading}>
                  {copied ? "Copied" : "Copy plan"}
                </button>
              </div>
              <article className="prose">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{ a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
                >
                  {plan}
                </ReactMarkdown>
              </article>
              {!loading && (
                <p className="disclaimer">
                  This is a first read, not legal or customs advice. Web sources are cited as [W1], [W2]. Anything marked
                  [verify] should be checked with a primary source before you act on it.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
