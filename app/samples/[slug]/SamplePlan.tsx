"use client";

import Link from "next/link";
import { useState } from "react";
import { PlanView, cleanPlanText } from "../../components/PlanView";
import { TaniTip } from "../../components/Tani";

export function SamplePlan({ text, country, next }: { text: string; country: string; next: { href: string; label: string } }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <TaniTip face="idea" ask="What do the source tags mean?" className="rise rise-2 no-print">
        Start with the verdict card. The small tags like <strong>P1</strong> or <strong>W2</strong> jump to the source behind
        that line.
      </TaniTip>
      <div className="plan-wrap">
        <PlanView plan={text} country={country} streaming={false} />
      </div>
      <div className="plan-actions no-print">
        <Link href="/create" className="btn btn-dark">
          Make your own plan
        </Link>
        <Link href={next.href} className="btn btn-line">
          Next sample: {next.label} <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(cleanPlanText(text));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy plan"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
          Download PDF
        </button>
      </div>
    </>
  );
}
