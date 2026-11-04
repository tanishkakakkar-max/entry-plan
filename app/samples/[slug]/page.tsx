import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "../../components/brand";
import { SAMPLES } from "../data";
import { SamplePlan } from "./SamplePlan";

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = SAMPLES.find((x) => x.slug === slug);
  return s ? { title: `${s.brand} → ${s.countryName} · Sample plan - ${BRAND.name}` } : {};
}

// One sample plan, readable without a code.
export default async function SamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = SAMPLES.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const s = SAMPLES[i];
  const next = SAMPLES[(i + 1) % SAMPLES.length];
  return (
    <main className="wrap page">
      <p className="back no-print">
        <Link href="/samples">
          <span aria-hidden="true">←</span> All samples
        </Link>
      </p>
      <header className="page-head rise">
        <p className="kicker">
          Sample plan · {s.from} → {s.to}
        </p>
        <h1>
          {s.brand} <em>→ {s.countryName}</em>
        </h1>
        <p className="lede">{s.blurb}. A hand-checked example plan.</p>
      </header>
      <SamplePlan text={s.text} country={s.countryName} next={{ href: `/samples/${next.slug}`, label: `${next.brand} → ${next.countryName}` }} />
    </main>
  );
}
