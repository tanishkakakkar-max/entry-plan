"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BRAND, COUNTRIES, countryLabel } from "../components/brand";
import { CountryOutline } from "../components/Maps";
import { PlanView, cleanPlanText } from "../components/PlanView";
import { FeedbackForm } from "../components/FeedbackForm";
import { YourPlans, type SavedPlan } from "../components/YourPlans";
import { CodeCard } from "../components/CodeCard";
import { TaniFace, TaniTip } from "../components/Tani";
import { CATEGORIES, OTHER, OTHER_MAX } from "@/lib/categories";
import { checkBriefFields, type BriefField, type BriefProblems } from "@/lib/brief";
import type { Face } from "@/lib/tani";

const EMPTY = {
  website: "",
  brand: "",
  product: "",
  customer: "",
  price: "",
  country: "japan",
  category: "",
  categoryOther: "",
  identity: "",
  stage: "",
};
type Form = typeof EMPTY;
type FieldName = keyof Form;

// With a website, these can be left blank: the plan reads the site and searches the web instead.
const SKIPPABLE_WITH_WEBSITE: FieldName[] = ["product", "identity", "customer", "price"];
const STEP_FIELDS: BriefField[][] = [
  ["website", "brand", "product", "customer", "price"],
  ["category", "categoryOther", "identity", "stage"],
];

// Must match the rate-limit message streamed by app/api/plan/route.ts.
const BUSY = "The free AI tier is busy right now";
const RETRY_SECONDS = 60;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CODE_RE = /^[A-Z0-9]{2,}-[A-Z0-9-]{4,}$/;

export function CreateApp() {
  const params = useSearchParams();
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0); // 0 brand, 1 market, 2 plan
  const [errors, setErrors] = useState<BriefProblems>({});
  const [code, setCode] = useState("");
  const [codeNotice, setCodeNotice] = useState("");
  const [plan, setPlan] = useState("");
  const [planCountry, setPlanCountry] = useState("");
  const [planBrand, setPlanBrand] = useState("");
  const [planId, setPlanId] = useState("");
  const [savedNote, setSavedNote] = useState<"" | "repeat" | "opened">("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [retryIn, setRetryIn] = useState(0);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"" | "missing" | "used_up">("");
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false); // came back from a plan via "Edit inputs and rerun"
  const topRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const hasWebsite = !!form.website.trim();
  const hasCode = CODE_RE.test(code.trim().toUpperCase());

  useEffect(() => {
    try {
      setCode(localStorage.getItem("fp-code") ?? "");
    } catch {}
    const c = params.get("country");
    if (c && COUNTRIES.some((x) => x.key === c)) setForm((f) => ({ ...f, country: c }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) return;
    const t1 = setTimeout(() => setPhase((p) => Math.max(p, 1)), 1400);
    const t2 = setTimeout(() => setPhase((p) => Math.max(p, 2)), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  function changeCode(value: string) {
    setCode(value);
    setCodeNotice("");
    setRefresh((r) => r + 1);
    try {
      localStorage.setItem("fp-code", value.trim());
    } catch {}
  }

  const scrollTop = () => setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);

  function setField(name: FieldName, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name as BriefField]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function problemsFor(stepNo: number) {
    const all = checkBriefFields(form, hasWebsite);
    return Object.fromEntries(Object.entries(all).filter(([k]) => STEP_FIELDS[stepNo].includes(k as BriefField))) as BriefProblems;
  }

  function showProblems(p: BriefProblems) {
    setErrors(p);
    setTimeout(() => {
      const first = document.querySelector<HTMLElement>(".line-field.has-error");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      first?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
    }, 60);
  }

  function goTo(next: number) {
    if (next > step && step < 2) {
      const p = problemsFor(step);
      if (Object.keys(p).length) return showProblems(p);
    }
    setStep(next);
    scrollTop();
    setTimeout(() => panelRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true }), 350);
  }

  async function write(e?: React.FormEvent) {
    e?.preventDefault();
    for (const s of [0, 1]) {
      const p = problemsFor(s);
      if (Object.keys(p).length) {
        setStep(s);
        return showProblems(p);
      }
    }
    if (!hasCode) {
      setStep(0);
      setCodeNotice("Get your free code first. Your answers are kept.");
      scrollTop();
      return;
    }
    setError("");
    setErrorKind("");
    setPlan("");
    setCreditsLeft(null);
    setSavedNote("");
    setPlanId("");
    setEditing(false);
    setPlanCountry(countryLabel(form.country));
    setPlanBrand(form.brand.trim());
    setStep(2);
    scrollTop();
    setLoading(true);
    setPhase(0);
    try {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, accessCode: code }),
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
          if (BUSY.startsWith(text) || text.startsWith(BUSY)) continue;
          setPhase(3);
          setPlan(text);
        }
        if (!text.startsWith(BUSY)) {
          if (text.trimStart().startsWith("#") && Number.isFinite(left)) setCreditsLeft(left);
          if (/^##\s*9\./m.test(text)) {
            setPlanId(res.headers.get("X-Plan-Id") ?? "");
            setRefresh((r) => r + 1);
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

  function openSaved(p: SavedPlan) {
    if (loading) return;
    setError("");
    setErrorKind("");
    setCreditsLeft(null);
    setSavedNote("opened");
    setPlanId(p.id);
    setPlanCountry(countryLabel(p.country));
    setPlanBrand(p.brand);
    setPlan(p.text);
    if (p.brief) setForm({ ...EMPTY, ...p.brief });
    setStep(2);
    scrollTop();
  }

  // "Edit inputs and rerun": back to step 1 with the answers filled in. A rerun uses one plan.
  function editInputs(p?: SavedPlan) {
    if (loading) return;
    if (p?.brief) setForm({ ...EMPTY, ...p.brief });
    else if (p) setForm({ ...EMPTY, brand: p.brand, country: p.country });
    setErrors({});
    setEditing(true);
    setStep(0);
    scrollTop();
  }

  function newPlan() {
    if (loading) return;
    setForm({ ...EMPTY, country: form.country });
    setErrors({});
    setPlan("");
    setPlanId("");
    setError("");
    setEditing(false);
    setStep(0);
    scrollTop();
  }

  // What Tani says at each point.
  const tip: { face: Face; text: React.ReactNode; ask?: string } =
    step === 0
      ? !hasCode
        ? { face: "pointing", text: "Start here: pop in your email and I'll give you a code with 5 free plans. Each plan uses one.", ask: "How do codes work?" }
        : editing
          ? { face: "idea", text: "Change whatever you like, then press Continue. Your old version stays in Your plans." }
          : { face: "idea", text: "Got a website? Add it and you can skip what you sell, who buys it and the price. I'll read your site." }
      : step === 1
        ? { face: "curious", text: "Where to? Pick a country, then tell me how your brand feels and where you sell today." }
        : loading
          ? { face: "thinking", text: `Reading the ${planCountry} research and checking official sources. About 2 minutes. You can watch it write.` }
          : error
            ? { face: "shrug", text: "Hmm, that didn't work. Check the message below, or ask me." }
            : savedNote === "repeat"
              ? { face: "thumbsup", text: "You've made this exact plan before, so here it is again, free. Change an answer for a fresh one." }
              : { face: "thumbsup", text: "Done! Start with the verdict. Want to change something? Press Edit inputs and rerun.", ask: "How do I read the sources?" };

  const progress = [
    "Checking your brief",
    `Reading the ${planCountry} research`,
    hasWebsite ? "Reading your website and searching the web" : "Searching the web",
    "Writing your plan",
  ];

  const field = (name: FieldName, label: string, hint: string, opts: { long?: boolean; optional?: boolean; max?: number } = {}) => {
    const err = errors[name as BriefField];
    const skippable = hasWebsite && SKIPPABLE_WITH_WEBSITE.includes(name);
    const Tag = opts.long ? "textarea" : "input";
    return (
      <label className={err ? "line-field has-error" : "line-field"}>
        <span>
          {label}
          {opts.optional && <em> (optional)</em>}
          {skippable && <em> (optional with your website)</em>}
        </span>
        <Tag
          placeholder={hint}
          value={form[name]}
          maxLength={opts.max ?? (opts.long ? 1500 : 300)}
          rows={opts.long ? 1 : undefined}
          // Long answers start one line tall, like the other fields, and grow as you type.
          onInput={
            opts.long
              ? (e: React.FormEvent<HTMLTextAreaElement | HTMLInputElement>) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${t.scrollHeight}px`;
                }
              : undefined
          }
          aria-invalid={!!err}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField(name, e.target.value)}
          {...(name === "website" ? { inputMode: "url" as const, autoComplete: "url" } : {})}
        />
        {err && (
          <small className="field-error" role="alert">
            {err}
          </small>
        )}
      </label>
    );
  };

  return (
    <main className={`wrap page create${step === 2 ? " create-plan" : ""}`} ref={topRef}>
      <header className="page-head">
        <p className="kicker">
          Step {step + 1} of 3 {editing && step < 2 ? "· editing" : ""}
        </p>
        <div className="stepper" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < step ? "done" : i === step ? "on" : ""} />
          ))}
        </div>
        <h1 key={step} className="rise">
          {step === 0 ? (
            <>
              Tell us about <em>your brand</em>
            </>
          ) : step === 1 ? (
            <>
              Where to, <em>and how it feels</em>
            </>
          ) : (
            <>
              {planBrand || "Your plan"} <em>→ {planCountry}</em>
            </>
          )}
        </h1>
      </header>

      <YourPlans code={code} refresh={refresh} openId={planId} onOpen={openSaved} onEdit={(p) => editInputs(p)} />

      {!(loading && !plan) && (
        <TaniTip face={tip.face} ask={tip.ask} className="create-tip">
          {tip.text}
        </TaniTip>
      )}

      <div className="create-grid">
        <div className="create-main">
          {step === 0 && (
            <div className="step-panel" ref={panelRef as React.RefObject<HTMLDivElement>} key="s0">
              <CodeCard code={code} onCode={changeCode} refresh={refresh} notice={codeNotice} />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goTo(1);
                }}
                noValidate
              >
                {field("website", "Brand website", "yourbrand.com", { optional: true })}
                {field("brand", "Brand name", "e.g. Kumo Candles")}
                {field("product", "What you sell", "e.g. soy candles in ceramic vessels, made in Melbourne", { long: true })}
                {field("customer", "Who buys it", "e.g. women 25-40 who buy home fragrance as gifts", { long: true })}
                {field("price", "Price range", "e.g. $28-45")}
                <button className="btn btn-dark btn-block">Continue</button>
                <p className="form-aside">
                  Not sure yet?{" "}
                  <Link href="/samples" className="link-btn accent">
                    Read a sample plan first
                  </Link>
                </p>
              </form>
            </div>
          )}

          {step === 1 && (
            <form className="step-panel" ref={panelRef as React.RefObject<HTMLFormElement>} key="s1" onSubmit={write} noValidate>
              <div className="countries" role="radiogroup" aria-label="Target country">
                {COUNTRIES.map((c) => (
                  <button
                    type="button"
                    key={c.key}
                    role="radio"
                    aria-checked={form.country === c.key}
                    className={form.country === c.key ? "country on" : "country"}
                    onClick={() => setField("country", c.key)}
                  >
                    <CountryOutline country={c.key} />
                    <span className="country-name">{c.label}</span>
                    <span className="country-teaser">{c.teaser}</span>
                  </button>
                ))}
              </div>
              <label className={errors.category ? "line-field has-error" : "line-field"}>
                <span>Category</span>
                <select value={form.category} aria-invalid={!!errors.category} onChange={(e) => setField("category", e.target.value)}>
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <small className="field-error" role="alert">
                    {errors.category}
                  </small>
                )}
              </label>
              {form.category === OTHER && field("categoryOther", "Your category", "e.g. pet care, toys, consulting", { max: OTHER_MAX })}
              {field("identity", "How your brand feels", "e.g. calm, natural, made to last", { long: true })}
              {field("stage", "Where you sell today", "e.g. pre-launch, Shopify DTC, 40 boutiques in Australia")}
              <div className="form-row">
                <button type="button" className="btn btn-line" onClick={() => goTo(0)}>
                  <span aria-hidden="true">←</span> Back
                </button>
                <button className="btn btn-dark" disabled={loading}>
                  {editing ? "Rerun my plan" : "Write my plan"} <span aria-hidden="true">→</span>
                </button>
              </div>
              {hasCode && <p className="privacy-line">This uses one plan from your code. A plan that fails is refunded.</p>}
            </form>
          )}

          {step === 2 && (
            <div className="step-panel plan-step" key="s2" aria-live="polite" aria-busy={loading}>
              {loading && !plan && (
                <div className="progress-card">
                  <TaniFace face="thinking" size={88} idle />
                  <div>
                    <p className="kicker">Working on your {planCountry} plan</p>
                    <p className="progress-say">Reading the {planCountry} research and checking official sources. About 2 minutes, and you can watch it write.</p>
                    {retryIn > 0 && <p className="retry-note">The AI is busy. Retrying in {retryIn}s.</p>}
                    <ol className="progress">
                      {progress.map((p, i) => (
                        <li key={p} className={i < phase ? "done" : i === phase ? "active" : ""}>
                          <span className="tick" aria-hidden="true" />
                          {p}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {error && (
                <p className="error" role="alert">
                  {errorKind === "used_up" ? (
                    <>
                      This code is used up. Want more? Email <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
                    </>
                  ) : errorKind === "missing" ? (
                    <>
                      Live plans need a code.{" "}
                      <button type="button" className="link-btn accent" onClick={() => goTo(0)}>
                        Get 5 free plans
                      </button>
                      .
                    </>
                  ) : (
                    error
                  )}
                </p>
              )}

              {savedNote && plan && <p className="saved-note">{savedNote === "repeat" ? "Saved plan · no plan used" : "From Your plans · kept for 30 days"}</p>}

              {plan && (
                <>
                  <div className="plan-actions no-print sticky-actions">
                    <button type="button" className="btn btn-dark" disabled={loading} onClick={() => editInputs()}>
                      Edit inputs and rerun
                    </button>
                    <button type="button" className="btn btn-line" disabled={loading} onClick={newPlan}>
                      + New plan
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={loading}
                      onClick={async () => {
                        await navigator.clipboard.writeText(cleanPlanText(plan));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? "Copied" : "Copy plan"}
                    </button>
                    <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => window.print()}>
                      Download PDF
                    </button>
                    {creditsLeft !== null && !loading && (
                      <span className="credits-left">
                        {creditsLeft === 0 ? "That was the last plan on this code." : `${creditsLeft} ${creditsLeft === 1 ? "plan" : "plans"} left`}
                      </span>
                    )}
                  </div>
                  <div className="plan-wrap">
                    <PlanView plan={plan} country={planCountry} streaming={loading} />
                  </div>
                  {!loading && (
                    <aside className="contact-card">
                      <div>
                        <p className="kicker kicker-light">Go further</p>
                        <h2>
                          Want a plan built <em>around your brand?</em>
                        </h2>
                        <p>For a personalised entry plan with deeper research, partner introductions and a launch roadmap, get in touch.</p>
                      </div>
                      <div className="contact-links">
                        <a className="btn btn-light" href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`${BRAND.name}: personalised entry plan`)}`}>
                          Email me
                        </a>
                        <a className="btn btn-line-light" href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer">
                          LinkedIn
                        </a>
                      </div>
                    </aside>
                  )}
                  {!loading && plan.trimStart().startsWith("#") && <FeedbackForm key={`${planBrand}-${planCountry}-${plan.length}`} country={planCountry} kind="live" />}
                </>
              )}
              {!plan && !loading && (
                <div className="form-row">
                  <button type="button" className="btn btn-line" onClick={() => goTo(1)}>
                    <span aria-hidden="true">←</span> Back to my answers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="create-side no-print">
          <YourPlans code={code} refresh={refresh} openId={planId} onOpen={openSaved} onEdit={(p) => editInputs(p)} />
          {step < 2 && (
            <div className="side-card">
              <p className="kicker">Not sure yet?</p>
              <p>Read a finished plan first. They&apos;re free.</p>
              <Link href="/samples" className="link-btn accent">
                See sample plans <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
