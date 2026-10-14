"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { BRAND, COUNTRIES, countryLabel } from "./components/brand";
import { CountryOutline, WorldMap } from "./components/Maps";
import { LogoMark } from "./components/Logo";
import { PlanView, cleanPlanText } from "./components/PlanView";
import { FeedbackForm } from "./components/FeedbackForm";
import { YourPlans, type SavedPlan } from "./components/YourPlans";
import { AccessStep } from "./components/AccessStep";
import { EXAMPLE_BRANDS } from "./components/examples";
import { exampleKeys } from "@/lib/examples-index.generated";
import { CATEGORIES, OTHER, OTHER_MAX } from "@/lib/categories";
import { checkBriefFields, type BriefField, type BriefProblems } from "@/lib/brief";

const EMPTY = {
  brand: "",
  category: "",
  categoryOther: "",
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
// With a website, these can be left blank: the plan reads the site instead.
const SKIPPABLE_WITH_WEBSITE: FieldName[] = ["product", "identity", "customer", "price", "stage"];

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Your brand",
    fields: [
      {
        name: "website",
        label: "Website",
        hint: "brand.com",
        kind: "url",
        optional: true,
      },
      { name: "brand", label: "Brand name", hint: "e.g. OLVAE" },
      { name: "category", label: "Category", hint: "Choose a category", kind: "select" },
      { name: "product", label: "What you sell", hint: "Products, materials, and where they're made", kind: "long" },
      { name: "identity", label: "Brand identity", hint: "Positioning, values and voice, in your own words", kind: "long" },
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

// "Try with a sample brand": a realistic made-up brief that works for any of the four markets.
const SAMPLE = {
  brand: "Tidewell",
  category: "Beauty & personal care",
  categoryOther: "",
  website: "",
  product: "Reef-safe mineral sunscreens and after-sun gels, made in Australia",
  identity: "Clean, sunny and science-backed, for people who live outdoors",
  customer: "Women and men 22-40 who surf, run or travel",
  price: "$22-34 per tube",
  stage: "Australia DTC on Shopify plus 40 surf shops",
};

// The form in three steps. Titles show above the fields; the short names label the progress bar.
const FORM_STEPS = [
  { name: "Market", title: "Pick a market.", sub: "Your brand can be based anywhere. Choose the first market you want to enter." },
  { name: "Your brand", title: "Tell us about your brand.", sub: "Add your website and you can skip most questions: we'll read it for you." },
  { name: "Your market", title: "Who buys, and where you sell.", sub: "Last step. Then we check your brief and write the plan." },
];
// Which fields each form step holds, so problems are shown (and checked) step by step.
const STEP_FIELDS: Record<number, BriefField[]> = {
  1: ["website", "brand", "category", "categoryOther", "product", "identity"],
  2: ["customer", "price", "stage"],
};

// Must match the rate-limit message streamed by app/api/plan/route.ts.
const BUSY = "The free AI tier is busy right now";
const RETRY_SECONDS = 60;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const [planBrand, setPlanBrand] = useState("");
  const [copied, setCopied] = useState(false);
  const [exampleBrand, setExampleBrand] = useState<string>("");
  const [retryIn, setRetryIn] = useState(0);
  const [errorKind, setErrorKind] = useState<"" | "missing" | "used_up">("");
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [savedExample, setSavedExample] = useState(false);
  // A plan from "Your plans": "repeat" = same brief asked again (no credit used), "opened" = opened from the list.
  const [savedNote, setSavedNote] = useState<"" | "repeat" | "opened">("");
  const [planId, setPlanId] = useState("");
  const [plansVersion, setPlansVersion] = useState(0);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<BriefProblems>({});
  const [accessOpen, setAccessOpen] = useState(false);
  const accessRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // Remember the access code on this device (a convenience only; it may not be available).
  useEffect(() => {
    try {
      setAccessCode(localStorage.getItem("fp-code") ?? "");
    } catch {}
  }, []);
  function changeCode(value: string) {
    setAccessCode(value);
    try {
      localStorage.setItem("fp-code", value.trim());
    } catch {}
  }

  // Hand-checked example plans: only brands and countries with a saved file are offered.
  const hasWebsite = !!form.website.trim();
  const exampleBrands = EXAMPLE_BRANDS.filter((b) => exampleKeys.some((k) => k.startsWith(`${b.key}-`)));
  const exampleCountries = (brand: string) => COUNTRIES.filter((c) => exampleKeys.includes(`${brand}-${c.key}`));
  const planRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);

  // Loading progress: brief check -> research -> web search -> writing (writing starts when the first words arrive).
  useEffect(() => {
    if (!loading) return;
    const t1 = setTimeout(() => setPhase((p) => Math.max(p, 1)), 1200);
    const t2 = setTimeout(() => setPhase((p) => Math.max(p, 2)), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  // Sections fade in as they scroll into view (CSS skips the motion for prefers-reduced-motion).
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Opens the "get 3 free plans" step at the top of the form and brings it into view.
  function openFreeStep() {
    setAccessOpen(true);
    setTimeout(() => {
      accessRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      accessRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    }, 50);
  }

  function applyCode(code: string) {
    changeCode(code);
    if (code) setAccessOpen(false);
    setPlansVersion((v) => v + 1);
  }

  // Updates one answer and clears that field's error.
  function setField(name: FieldName, value: string) {
    setForm({ ...form, [name]: value });
    if (errors[name as BriefField]) setErrors({ ...errors, [name]: undefined });
  }

  // Shows every problem under its own field and brings the first one into view.
  function showProblems(problems: BriefProblems) {
    setErrors(problems);
    setTimeout(() => {
      const first = document.querySelector<HTMLElement>(".field.has-error");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      first?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
    }, 60);
  }

  const problemsIn = (all: BriefProblems, stepNo: number) =>
    Object.fromEntries(Object.entries(all).filter(([k]) => STEP_FIELDS[stepNo]?.includes(k as BriefField))) as BriefProblems;

  // Moves between form steps, checking the current step's answers first when going forward.
  function goTo(next: number) {
    if (next > step && step > 0) {
      const found = problemsIn(checkBriefFields(form, !!form.website.trim()), step);
      if (Object.keys(found).length) {
        showProblems(found);
        return;
      }
    }
    setStep(next);
    setTimeout(() => {
      const top = formRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      stepRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true });
    }, 30);
  }

  // Enter moves to the next step (except in long text boxes, where it adds a new line).
  function enterNext(e: React.KeyboardEvent<HTMLFormElement>) {
    const t = e.target as HTMLElement;
    if (e.key !== "Enter" || e.defaultPrevented || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || step === 2) return;
    e.preventDefault();
    goTo(step + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) {
      goTo(step + 1);
      return;
    }
    const all = checkBriefFields(form, !!form.website.trim());
    if (Object.keys(all).length) {
      // Go back to the first step with a problem; every problem shows under its own field.
      const firstStep = Object.keys(problemsIn(all, 1)).length ? 1 : 2;
      setStep(firstStep);
      showProblems(all);
      return;
    }
    // No code: open the free-code box at the top instead of an error. Nothing they typed is cleared.
    if (!accessCode.trim()) {
      openFreeStep();
      return;
    }
    setError("");
    setErrorKind("");
    setPlan("");
    setCreditsLeft(null);
    setSavedExample(false);
    setSavedNote("");
    setPlanId("");
    setPlanCountry(countryLabel(form.country));
    setPlanBrand(form.brand.trim());
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    setLoading(true);
    setPhase(0);
    try {
      // If the free tier is busy, wait out the minute with a countdown and try once more.
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, accessCode }),
        });
        if (!res.ok || !res.body) {
          const status = res.headers.get("X-Code-Status");
          setErrorKind(status === "used_up" ? "used_up" : status === "missing" ? "missing" : "");
          setError((await res.text()) || "Something went wrong.");
          return;
        }
        const left = Number(res.headers.get("X-Credits-Left"));
        const savedId = res.headers.get("X-Saved-Plan");
        if (savedId) {
          setPlan(await res.text());
          setPlanId(savedId);
          setSavedNote("repeat");
          if (Number.isFinite(left)) setCreditsLeft(left);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          if (BUSY.startsWith(text) || text.startsWith(BUSY)) continue; // don't flash the busy message
          setPhase(3);
          setPlan(text);
        }
        if (!text.startsWith(BUSY)) {
          if (text.trimStart().startsWith("#") && Number.isFinite(left)) setCreditsLeft(left);
          if (/^##\s*9\./m.test(text)) {
            setPlanId(res.headers.get("X-Plan-Id") ?? "");
            setPlansVersion((v) => v + 1); // show it in Your plans
          }
          return;
        }
        if (attempt === 2) {
          setPlan(text);
          return;
        }
        setPhase(0);
        for (let s = RETRY_SECONDS; s > 0; s--) {
          setRetryIn(s);
          await wait(1000);
        }
        setRetryIn(0);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setRetryIn(0);
      setLoading(false);
    }
  }

  // Opens a saved example plan: no code, no credits, no AI call. The plan text loads on demand.
  async function openExample(brand: string, country: string) {
    if (loading) return;
    setError("");
    setErrorKind("");
    setCreditsLeft(null);
    setSavedNote("");
    setPlanId("");
    setPlanCountry(countryLabel(country));
    setPlanBrand(EXAMPLE_BRANDS.find((b) => b.key === brand)?.name ?? brand);
    try {
      const { examplePlans } = await import("@/lib/examples.generated");
      const text = examplePlans[`${brand}-${country}`];
      if (!text) throw new Error();
      setPlan(text);
      setSavedExample(true);
    } catch {
      setPlan("");
      setError("Couldn't open that example. Please try again.");
    }
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function copy() {
    await navigator.clipboard.writeText(cleanPlanText(plan));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openSaved(p: SavedPlan) {
    if (loading) return;
    setError("");
    setErrorKind("");
    setCreditsLeft(null);
    setSavedExample(false);
    setSavedNote("opened");
    setPlanId(p.id);
    setPlanCountry(countryLabel(p.country));
    setPlanBrand(p.brand);
    setPlan(p.text);
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startOver() {
    setPlan("");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const progress = [
    "Checking your brief",
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
            {exampleBrands.length > 0 && <a href="#examples">Examples</a>}
            <a
              href="#get-a-plan"
              className="nav-cta"
              onClick={(e) => {
                e.preventDefault();
                openFreeStep();
              }}
            >
              Get 3 free plans
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero hero-dark no-print">
          <div className="wrap hero-inner">
            <div className="hero-copy">
              <p className="hero-brand">
                <LogoMark size={44} onDark />
                <span>{BRAND.name}</span>
              </p>
              <h1>
                {BRAND.headline.split(/(first)/).map((part, i) =>
                  part === "first" ? (
                    <span key={i}>
                      <br />
                      <em>{part}</em>
                    </span>
                  ) : (
                    part.trim() && <span key={i}>{part}</span>
                  ),
                )}
              </h1>
              <p className="lede">
                {BRAND.description.split(/(?<=\.)\s+/).map((line) => (
                  <span key={line}>{line} </span>
                ))}
              </p>
              <div className="hero-actions">
                <a
                  href="#get-a-plan"
                  className="btn btn-orange"
                  onClick={(e) => {
                    e.preventDefault();
                    openFreeStep();
                  }}
                >
                  Get 3 free plans <span aria-hidden="true">→</span>
                </a>
                <a href="#examples" className="btn btn-on-dark">
                  Read an example
                </a>
              </div>
            </div>
            <figure className="hero-map">
              <WorldMap highlight={form.country} onSelect={(key) => setForm({ ...form, country: key })} />
              <figcaption className="hero-ports map-ports">
                  <span className="map-caption">Four ports to start:</span>
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

        <section id="how" className="wrap how no-print reveal" aria-labelledby="how-title">
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

        {exampleBrands.length > 0 && (
          <section id="examples" className="wrap examples no-print reveal" aria-labelledby="examples-title">
            <p className="label">Example plans</p>
            <h2 id="examples-title" className="section-title">
              See a finished plan.
            </h2>
            <p className="pick-sub">
              Pick a brand, then a market. These are saved, hand-checked plans: free to read, no access code needed.
            </p>
            <div className="example-brands" role="radiogroup" aria-label="Example brand">
              {exampleBrands.map((b) => (
                <button
                  type="button"
                  key={b.key}
                  role="radio"
                  aria-checked={exampleBrand === b.key}
                  className={exampleBrand === b.key ? "example-brand selected" : "example-brand"}
                  onClick={() => setExampleBrand(b.key)}
                >
                  <span className="example-brand-name">{b.name}</span>
                  <span className="example-brand-blurb">{b.blurb}</span>
                </button>
              ))}
            </div>
            {exampleBrand && (
              <div className="example-countries">
                <p className="example-step">Now pick a market:</p>
                <div className="port-chips">
                  {exampleCountries(exampleBrand).map((c) => (
                    <button type="button" key={c.key} className="port-chip example-chip" onClick={() => openExample(exampleBrand, c.key)}>
                      {c.label} <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section id="get-a-plan" ref={formRef} className="wrap get-plan no-print reveal" aria-labelledby="plan-form-title">
          <div className="pick-head">
            <p className="label">Get a plan</p>
            <AccessStep ref={accessRef} code={accessCode} onCode={applyCode} open={accessOpen} refresh={plansVersion} />
          </div>
          <form onSubmit={submit} onKeyDown={enterNext} noValidate>
            <ol className="form-steps" aria-label="Form progress">
              {FORM_STEPS.map((st, i) => (
                <li key={st.name} className={i < step ? "done" : i === step ? "active" : ""}>
                  <button type="button" disabled={i > step} aria-current={i === step ? "step" : undefined} onClick={() => goTo(i)}>
                    <span className="form-step-num">{i < step ? "✓" : i + 1}</span>
                    {st.name}
                  </button>
                </li>
              ))}
            </ol>
            <div className="form-bar" aria-hidden="true">
              <span style={{ width: `${((step + 1) / FORM_STEPS.length) * 100}%` }} />
            </div>
            <div className="step-head">
              <h2 id="plan-form-title" className="section-title">
                {FORM_STEPS[step].title}
              </h2>
              <p className="pick-sub">{FORM_STEPS[step].sub}</p>
              {step === 1 && (
                <button type="button" className="btn btn-quiet sample-btn" onClick={() => setForm({ ...form, ...SAMPLE })}>
                  Try with a sample brand
                </button>
              )}
            </div>
            <div ref={stepRef} key={step} className="step-panel">
            {step === 0 && (
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
            )}

            {step > 0 && (
            <div className="field-groups">
              {GROUPS.filter((_, gi) => gi === step - 1).map((g) => (
                <fieldset key={g.title} className="field-group">
                  <legend>{g.title}</legend>
                  {g.fields.map((f) => (
                    <Fragment key={f.name}>
                      <label className={errors[f.name as BriefField] ? "field has-error" : "field"}>
                        <span>
                          {f.label}
                          {f.optional && <em className="optional">Optional</em>}
                          {hasWebsite && SKIPPABLE_WITH_WEBSITE.includes(f.name) && (
                            <em className="optional">Optional with your website</em>
                          )}
                        </span>
                        {f.kind === "select" ? (
                          <select
                            value={form[f.name]}
                            required
                            aria-invalid={!!errors[f.name as BriefField]}
                            onChange={(e) => setField(f.name, e.target.value)}
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
                            required={!f.optional && !(hasWebsite && SKIPPABLE_WITH_WEBSITE.includes(f.name))}
                            aria-invalid={!!errors[f.name as BriefField]}
                            onChange={(e) => setField(f.name, e.target.value)}
                          />
                        ) : (
                          <input
                            type={f.kind === "url" ? "text" : undefined}
                            inputMode={f.kind === "url" ? "url" : undefined}
                            autoComplete={f.kind === "url" ? "url" : undefined}
                            placeholder={f.hint}
                            value={form[f.name]}
                            maxLength={300}
                            required={!f.optional && !(hasWebsite && SKIPPABLE_WITH_WEBSITE.includes(f.name))}
                            aria-invalid={!!errors[f.name as BriefField]}
                            onChange={(e) => setField(f.name, e.target.value)}
                          />
                        )}
                        {errors[f.name as BriefField] && (
                          <small className="field-error" role="alert">
                            {errors[f.name as BriefField]}
                          </small>
                        )}
                        {f.kind === "url" && (
                          <small className="field-note">
                            Add your website and you can skip most of the questions below: we&apos;ll read it for you.
                          </small>
                        )}
                        {f.kind === "select" && form.category !== OTHER && (
                          <small className="field-note">Not on the list? Choose Other and type your own.</small>
                        )}
                      </label>
                      {f.kind === "select" && form.category === OTHER && (
                        <label className={errors.categoryOther ? "field has-error" : "field"}>
                          <span>Your category</span>
                          <input
                            placeholder="e.g. pet care, toys, stationery"
                            value={form.categoryOther}
                            maxLength={OTHER_MAX}
                            required
                            autoFocus
                            aria-invalid={!!errors.categoryOther}
                            onChange={(e) => setField("categoryOther", e.target.value)}
                          />
                          {errors.categoryOther && (
                            <small className="field-error" role="alert">
                              {errors.categoryOther}
                            </small>
                          )}
                        </label>
                      )}
                    </Fragment>
                  ))}
                </fieldset>
              ))}
            </div>
            )}
            </div>

            {step === 2 && (
              <label className="field access">
                <span>Access code</span>
                <input
                  value={accessCode}
                  onChange={(e) => changeCode(e.target.value)}
                  placeholder="FP-XXXX-XXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <small className="field-note">
                  No code?{" "}
                  <button type="button" className="link-btn" onClick={openFreeStep}>
                    Get 3 free plans
                  </button>{" "}
                  with your email at the top of this form.
                </small>
              </label>
            )}

            <div className="form-actions">
              {step > 0 && (
                <button type="button" className="btn btn-quiet" onClick={() => goTo(step - 1)}>
                  <span aria-hidden="true">←</span> Back
                </button>
              )}
              {step < 2 ? (
                <button type="submit" className="btn btn-orange">
                  Next <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button type="submit" className="btn btn-orange" disabled={loading}>
                  {loading ? "Writing your plan..." : "Write my plan"} {!loading && <span aria-hidden="true">→</span>}
                </button>
              )}
            </div>
          </form>
          <YourPlans code={accessCode} refresh={plansVersion} openId={planId} onOpen={openSaved} />
        </section>

        {showResults && (
          <section id="plan" ref={planRef} className="wrap results" aria-live="polite" aria-busy={loading}>
            {loading && !plan && (
              <div className="progress-card">
                <p className="label">Working on your {planCountry} plan</p>
                {retryIn > 0 && (
                  <p className="retry-note" aria-live="off">
                    The free AI tier is busy. Retrying automatically in {retryIn}s.
                  </p>
                )}
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
                {errorKind === "used_up" ? (
                  <>
                    This code is used up. Want more? <a href="#contact">Get in touch</a>.
                  </>
                ) : errorKind === "missing" ? (
                  <>
                    Live plans need an access code.{" "}
                    <button type="button" className="link-btn" onClick={openFreeStep}>
                      Get 3 free plans with your email
                    </button>
                    .
                  </>
                ) : (
                  error
                )}
              </p>
            )}

            {savedExample && plan && (
              <div className="example-label">
                <span className="example-badge">Example plan · hand-checked</span>
                <span className="no-print">
                  Want one for your brand?{" "}
                  <button type="button" className="link-btn" onClick={openFreeStep}>
                    Get 3 free plans
                  </button>{" "}
                  and fill in the form.
                </span>
              </div>
            )}

            {savedNote && plan && (
              <div className="example-label">
                <span className="example-badge">{savedNote === "repeat" ? "Saved plan · no credit used" : "Saved plan"}</span>
                <span className="no-print">
                  {savedNote === "repeat"
                    ? "You've made this plan before, so here it is again. For a fresh one, change your answers or delete it from Your plans."
                    : "From Your plans. It's kept for 30 days."}
                </span>
              </div>
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
                  {creditsLeft !== null && !loading && (
                    <p className="credits-left" role="status">
                      {creditsLeft === 0 ? (
                        <>
                          That was the last plan on this code. Want more? <a href="#contact">Get in touch</a>.
                        </>
                      ) : (
                        `${creditsLeft} ${creditsLeft === 1 ? "plan" : "plans"} left on this code`
                      )}
                    </p>
                  )}
                </div>
                {!loading && plan.trimStart().startsWith("#") && (
                  <FeedbackForm
                    key={`${planBrand}-${planCountry}-${plan.length}`}
                    country={planCountry}
                    kind={savedExample ? "example" : "live"}
                  />
                )}
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer" id="contact">
        <div className="wrap footer-inner">
          <p className="footer-contact">
            <strong>No code?</strong>{" "}
            <a
              href="#access"
              onClick={(e) => {
                e.preventDefault();
                openFreeStep();
              }}
            >
              Get 3 free plans
            </a>{" "}
            with your email, then get in touch if you&apos;d like more.
          </p>
          <p className="footer-contact">
            <strong>Get in touch</strong> for a personalised plan or more plans:{" "}
            <a href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`${BRAND.name}: personalised plan`)}`}>{BRAND.email}</a>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </p>
          <p>
            <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer" className="no-print-link">
              Built by {BRAND.author}
            </a>
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
