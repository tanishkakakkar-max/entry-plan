"use client";

import Link from "next/link";
import { useState } from "react";
import { COUNTRIES } from "../components/brand";
import { TaniTip } from "../components/Tani";
import type { Sample } from "./data";

type Item = Omit<Sample, "text">;

const verdictClass = (v: string) => (v === "Go" ? "go" : v === "Not yet" ? "no" : "test");

export function SampleList({ samples }: { samples: Item[] }) {
  const [country, setCountry] = useState("all");
  const shown = samples.filter((s) => country === "all" || s.country === country);
  const name = country === "all" ? "" : COUNTRIES.find((c) => c.key === country)?.label;

  return (
    <>
      <TaniTip face={country === "all" ? "pointing" : "thumbsup"} className="rise rise-2">
        {country === "all"
          ? "Tap any plan to read it. Start with the verdict at the top, then the Risks table. Filter by country to compare."
          : `Nice. Here's how each brand would enter ${name}. Notice how the verdict changes with the brand.`}
      </TaniTip>

      <div className="filters" role="tablist" aria-label="Filter by country">
        {[{ key: "all", label: "All" }, ...COUNTRIES].map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={country === c.key}
            className={country === c.key ? "filter on" : "filter"}
            onClick={() => setCountry(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ul className="sample-list" key={country}>
        {shown.map((s, i) => (
          <li key={s.slug} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
            <Link href={`/samples/${s.slug}`}>
              <span className="sample-route">
                {s.from} <span aria-hidden="true">→</span> {s.to}
              </span>
              <span className="sample-brand">{s.brand}</span>
              <span className="sample-meta">
                {s.category}
                {s.verdict && (
                  <>
                    {" "}
                    · <span className={`verdict-dot ${verdictClass(s.verdict)}`}>{s.verdict}</span>
                  </>
                )}
              </span>
              <span className="sample-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

    </>
  );
}
