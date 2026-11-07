"use client";

import { useState } from "react";
import { askTani } from "../components/Tani";

type Step = { n: string; title: string; text: string; more: string };

// The three steps. A step's extra detail opens only while the mouse is on it (or after a tap on touch screens).
export function StepsDetail({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(-1);
  return (
    <section className="wrap steps-detail reveal" aria-label="The three steps" onMouseLeave={() => setActive(-1)}>
      {steps.map((s, i) => (
        <div
          key={s.n}
          className={`step-row${active === i ? " on" : ""}`}
          tabIndex={0}
          onMouseEnter={() => setActive(i)}
          onMouseLeave={() => setActive(-1)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(-1)}
          onClick={() => setActive((a) => (a === i ? -1 : i))}
        >
          <span className="how-n">{s.n}</span>
          <div>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
            <div className="step-more" aria-hidden={active !== i}>
              <div>
                <p>{s.more}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

type Source = { k: string; title: string; text: string; example: string };

// The four source tags. Hovering (or tapping) a card shows a real-world example of that kind of source.
export function SourceKinds({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState("");
  return (
    <div className="source-kinds reveal stagger">
      {sources.map((s) => (
        <button
          type="button"
          key={s.k}
          className={`source-kind${open === s.k ? " on" : ""}`}
          onMouseEnter={() => setOpen(s.k)}
          onMouseLeave={() => setOpen("")}
          onFocus={() => setOpen(s.k)}
          onBlur={() => setOpen("")}
          onClick={() => setOpen((o) => (o === s.k ? "" : s.k))}
        >
          <span className="source-kind-body">
            <span className="source-kind-title">
              <span className="cite">{s.k}1</span>
              <strong>{s.title}</strong>
            </span>
            <span className="source-kind-text">{s.text}</span>
            <span className="source-example">
              <span>
                <em>For example:</em> {s.example}
              </span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

// Questions that open and close.
export function Faq({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState(-1);
  return (
    <div className="faq-list reveal stagger">
      {items.map(([q, a], i) => (
        <div key={q} className={`faq-item${open === i ? " on" : ""}`}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{q}</span>
            <span className="faq-plus" aria-hidden="true">
              +
            </span>
          </button>
          <div className="faq-answer">
            <div>
              <p>{a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// "Still have a question?": type anything and Tani's chat opens with it already asked.
export function AskBox() {
  const [q, setQ] = useState("");
  const chips = ["Which country suits my brand?", "What does [verify] mean?", "Can I get more than 5 plans?"];
  const ask = (text: string) => {
    if (!text.trim()) return;
    askTani(text.trim());
    setQ("");
  };
  return (
    <div className="ask-box">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input value={q} maxLength={500} placeholder="Ask Tani anything about First Port, the four countries or your plan..." aria-label="Your question" onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-dark" disabled={!q.trim()}>
          Ask Tani
        </button>
      </form>
      <div className="ask-chips">
        {chips.map((c) => (
          <button type="button" key={c} onClick={() => ask(c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
