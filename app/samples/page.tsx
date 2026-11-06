import type { Metadata } from "next";
import { BRAND } from "../components/brand";
import { SAMPLES } from "./data";
import { SampleList } from "./SampleList";
import { PlanCta } from "../components/PlanCta";

export const metadata: Metadata = {
  title: `Sample plans - ${BRAND.name}`,
  description: "Free example market-entry plans for four brands into Japan, Singapore, India and the United States.",
};

// Samples: every hand-checked example plan, filterable by country. No code needed.
export default function SamplesPage() {
  const list = SAMPLES.map(({ text: _text, ...s }) => s);
  return (
    <>
    <main className="wrap page">
      <header className="page-head rise">
        <p className="kicker">Sample plans</p>
        <h1>
          See what a plan <em>looks like</em>
        </h1>
        <p className="lede">Free example plans for four brands, in all four countries. No code needed.</p>
      </header>
      <SampleList samples={list} />
    </main>
    <PlanCta title="Ready for your own?" />
    </>
  );
}
