"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND, COUNTRIES, countryLabel } from "./components/brand";
import { CountryOutline, WorldMap } from "./components/Maps";
import { PlanView } from "./components/PlanView";
import { EXAMPLES } from "./components/examples";
import { CATEGORIES } from "@/lib/categories";

const EMPTY = {
  brand: "",
  category: "",
  website: "",
  product: "",
  identity: "",
  customer: "",
  price: "",
  stage: "",
  country: "japan",
};


type FieldName = Exclude<keyof typeof EMPTY, "country">;
type Field = { name: FieldName; label: string; hint: string; kind?: "long" | "select" | "url"; optional?: boolean };

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Your brand",
    fields: [
      { name: "brand", label: "Brand name", hint: "e.g. OLVAE" },
      { name: "category", label: "Category", hint: "Choose a category", kind: "select" },
      { name: "product", label: "What you sell", hint: "Products, materials, and where they're made", kind: "long" },
      { name: "identity", label: "Brand identity", hint: "Positioning, values and voice, in your own words", kind: "long" },
      {
        name: "website",
        label: "Website",
        hint: "brand.com (we'll read it to make the plan more specific)",
        kind: "url",
        optional: true,
      },
    ],
  },
  {
    title: "Your market",
    fields: [
      { name: "customer", label: "Target customer", hint: "Who buys today, or who you want", kind: "long" },
      { name: "price", label: "Price point", hint: "e.g. $40-90 per piece, premium" },
      { name: "stage", label: "Where you sell today", hint: "e.g. pre-launch, US DTC only, Amazon + retail" },
    ],
  },
];

const STEPS = [
  { title: "Pick a market", text: "Japan, Singapore, India or the United States." },
  { title: "Tell us about your brand", text: "Six short answers about what you sell and who buys it." },
  { title: "Get a clear plan with sources", text: "One verdict, nine sections, and live web sources you can check." },
];

export default function Home() {
  const [form, setForm] = useState(EMPTY);
  const [accessCode, setAccessCode] = useState("");
  const [plan, setPlan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [planCountry, setPlanCountry] = useState("");
  const [copied, setCopied] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(-1);
  const planRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);

  // Loading progress: research -> web search -> writing (writing starts when the first words arrive).
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setPhase((p) => Math.max(p, 1)), 1400);
    return () => clearTimeout(t);
  }, [loading]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPhase(0);
    setError("");
    setPlan("");
    setPlanCountry(countryLabel(form.country));
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
        setPhase(2);
        setPlan(text);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Each click shows the next example; the first click starts at a random one.
  function tryExample() {
    const next = exampleIdx < 0 ? Math.floor(Math.random() * EXAMPLES.length) : (exampleIdx + 1) % EXAMPLES.length;
    setExampleIdx(next);
    setForm(EXAMPLES[next]);
  }

  async function copy() {
    await navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startOver() {
    setPlan("");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const progress = [
    `Reading the ${planCountry} research`,
    form.website.trim() ? "Reading your website and searching the web" : "Searching the web",
    "Writing your plan",
  ];
  const showResults = loading || plan || error;

  return (
    <>
      <header className="nav no-print">
        <div className="wrap nav-inner">
          <a href="#top" className="wordmark">
            {BRAND.name}
          </a>
          <nav aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#get-a-plan" className="nav-cta">
              Get a plan
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero no-print">
          <div className="wrap hero-inner">
            <div className="hero-copy">
              <p className="label">{BRAND.tagline}</p>
              <h1>
                {BRAND.headline.split(/(first)/).map((part, i) => (part === "first" ? <em key={i}>{part}</em> : part))}
              </h1>
              <p className="lede">
                {BRAND.description.split(/(?<=\.)\s+/).map((line) => (
                  <span key={line}>{line} </span>
                ))}
              </p>
              <a href="#get-a-plan" className="btn btn-orange">
                Get your plan <span aria-hidden="true">→</span>
              </a>
            </div>
            <figure className="hero-map">
              <WorldMap highlight={form.country} onSelect={(key) => setForm({ ...form, country: key })} />
              <figcaption>
                <span className="map-caption">Brands from anywhere. Four ports to start:</span>
                <div className="port-chips" role="radiogroup" aria-label="Choose a market">
                  {COUNTRIES.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      role="radio"
                      aria-checked={form.country === c.key}
                      className={form.country === c.key ? "port-chip selected" : "port-chip"}
                      onClick={() => setForm({ ...form, country: c.key })}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="how" className="wrap how no-print" aria-labelledby="how-title">
          <p className="label">How it works</p>
          <h2 id="how-title" className="section-title">
            Three steps to a clear call.
          </h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="get-a-plan" ref={formRef} className="wrap get-plan no-print" aria-labelledby="plan-form-title">
          <div className="pick-head">
            <p className="label">Get a plan</p>
            <h2 id="plan-form-title" className="section-title">
              Pick a market.
            </h2>
            <p className="pick-sub">Your brand can be based anywhere. Choose the first market you want to enter.</p>
          </div>
          <form onSubmit={submit}>
            <div className="country-grid" role="radiogroup" aria-label="Target market">
              {COUNTRIES.map((c) => {
                const selected = form.country === c.key;
                return (
                  <button
                    type="button"
                    key={c.key}
                    role="radio"
                    aria-checked={selected}
                    className={selected ? "country-card selected" : "country-card"}
                    onClick={() => setForm({ ...form, country: c.key })}
                  >
                    <span className="check" aria-hidden="true">
                      <svg viewBox="0 0 16 16">
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    </span>
                    <CountryOutline country={c.key} />
                    <span className="country-name">{c.label}</span>
                    <span className="country-teaser">{c.teaser}</span>
                  </button>
                );
              })}
            </div>

            <div className="field-groups">
              {GROUPS.map((g) => (
                <fieldset key={g.title} className="field-group">
                  <legend>{g.title}</legend>
                  {g.fields.map((f) => (
                    <label key={f.name} className="field">
                      <span>
                        {f.label}
                        {f.optional && <em className="optional">Optional</em>}
                      </span>
                      {f.kind === "select" ? (
                        <select
                          value={form[f.name]}
                          required
                          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                        >
                          <option value="" disabled>
                            {f.hint}
                          </option>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : f.kind === "long" ? (
                        <textarea
                          rows={3}
                          placeholder={f.hint}
                          value={form[f.name]}
                          maxLength={1500}
                          required={!f.optional}
                          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                        />
                      ) : (
                        <input
                          type={f.kind === "url" ? "text" : undefined}
                          inputMode={f.kind === "url" ? "url" : undefined}
                          autoComplete={f.kind === "url" ? "url" : undefined}
                          placeholder={f.hint}
                          value={form[f.name]}
                          maxLength={300}
                          required={!f.optional}
                          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                        />
                      )}
                      {f.kind === "select" && (
                        <small className="field-note">
                          v0 covers consumer brands in these categories. Not on the list? Get in touch below.
                        </small>
                      )}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>

            <label className="field access">
              <span>Access code (optional, if you were given one)</span>
              <input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Optional" />
            </label>

            <div className="form-actions">
              <button className="btn btn-orange" disabled={loading}>
                {loading ? "Writing your plan..." : "Let's go"} {!loading && <span aria-hidden="true">→</span>}
              </button>
              <button type="button" className="btn btn-quiet" onClick={tryExample} disabled={loading}>
                {exampleIdx < 0 ? "Try an example" : "Another example"}
              </button>
            </div>
          </form>
        </section>

        {showResults && (
          <section id="plan" ref={planRef} className="wrap results" aria-live="polite" aria-busy={loading}>
            {loading && !plan && (
              <div className="progress-card">
                <p className="label">Working on your {planCountry} plan</p>
                <ol className="progress">
                  {progress.map((p, i) => (
                    <li key={p} className={i < phase ? "done" : i === phase ? "active" : ""}>
                      <span className="tick" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            {plan && (
              <>
                <PlanView plan={plan} country={planCountry} streaming={loading} />
                {!loading && (
                  <aside className="contact-card" aria-labelledby="contact-title">
                    <div>
                      <p className="label">Go further</p>
                      <h2 id="contact-title">Want a plan built around your brand?</h2>
                      <p>
                        This is a first read from the research. For a personalised entry plan with deeper market
                        research, partner and channel introductions, and a launch roadmap, get in touch with{" "}
                        {BRAND.author}.
                      </p>
                    </div>
                    <div className="contact-links">
                      <a className="btn btn-orange" href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`${BRAND.name}: personalised entry plan`)}`}>
                        Email me <span aria-hidden="true">→</span>
                      </a>
                      <a className="btn btn-quiet" href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer">
                        LinkedIn
                      </a>
                      <span className="contact-email">{BRAND.email}</span>
                    </div>
                  </aside>
                )}
                <div className="plan-actions no-print">
                  <button className="btn btn-quiet" onClick={copy} disabled={loading}>
                    {copied ? "Copied" : "Copy plan"}
                  </button>
                  <button className="btn btn-quiet" onClick={() => window.print()} disabled={loading}>
                    Download PDF
                  </button>
                  <button className="btn btn-quiet" onClick={startOver} disabled={loading}>
                    Start another plan
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <p>
            <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer" className="no-print-link">
              Built by {BRAND.author}
            </a>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{BRAND.version}</span>
          </p>
          <p className="disclaimer">
            This is a first read, not legal or customs advice. Web sources are cited as [W1], [W2]. Anything marked
            [verify] should be checked with a primary source before you act on it.
          </p>
        </div>
      </footer>
    </>
  );
}
