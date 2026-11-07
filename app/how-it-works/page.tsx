import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "../components/brand";
import { PlanCta } from "../components/PlanCta";
import { TaniFace } from "../components/Tani";

export const metadata: Metadata = {
  title: `How it works - ${BRAND.name}`,
  description: "How First Port writes a market-entry plan: the three steps, what's in a plan, where the research comes from and how codes work.",
};

const STEPS = [
  {
    n: "01",
    title: "Pick a country",
    text: "Choose Japan, Singapore, India or the United States. Your brand can be based anywhere. Not sure which? Read the Markets page or a sample plan first.",
  },
  {
    n: "02",
    title: "Tell us about your brand",
    text: "Only your brand name, category and what you sell are needed, or just your website. Customer, price, brand personality and where you sell today are optional: leave them blank and the plan says what it assumed.",
  },
  {
    n: "03",
    title: "Get your plan",
    text: "In about 2 minutes First Port reads its research for that country and category, searches the web for what has changed, finds relevant studies, and writes your plan. You can watch it write.",
  },
];

const SECTIONS = [
  ["The call", "Go, test first, or not yet, and the one reason why."],
  ["Recommended entry point", "Where to start: the city, the channel and the first customers."],
  ["Entry strategy", "What to do in the first 90 days and after."],
  ["Consumer psychology", "How buyers in that country think about your kind of product."],
  ["Brand adaptation", "What to keep, change or translate about your brand."],
  ["Competitive reality", "Who you're up against, local and global."],
  ["Risks", "Duties, rules, registrations and other things that can go wrong, with what to do about each."],
  ["Rewards", "What success looks like and why it's worth it."],
  ["Validate before you spend", "Cheap tests to run before committing real money."],
];

const SOURCES = [
  ["P", "Official and primary sources", "Government notices, customs schedules and regulator pages behind the numbers."],
  ["W", "Web", "Recent articles and pages found by a live search when your plan is written."],
  ["S", "Peer-reviewed papers", "Studies on how consumers in that market behave."],
  ["R", "First Port research", "First Port's own analysis of each country and category."],
];

const FAQ = [
  ["How much does it cost?", "Your email gets you a free code with 5 plans. Each finished plan uses one. If a plan fails or stops early, it's given back."],
  ["Can I change my answers?", "Yes. Open the plan and press Edit inputs and rerun. You get a new version, and the old one stays in Your plans."],
  ["How long are plans kept?", "30 days on your code, then deleted. You can delete one sooner, and plans are never shared with other codes."],
  ["Is this legal or customs advice?", "No. It's a strong first read. Anything marked [verify] should be checked with an official source or a customs broker before you act on it."],
];

// How it works: the steps, what's in a plan, where the research comes from, and common questions.
export default function HowItWorksPage() {
  return (
    <main>
      <section className="wrap page page-head rise">
        <p className="kicker">How it works</p>
        <h1>
          From a few answers <em>to a clear plan.</em>
        </h1>
        <p className="lede">First Port turns scattered market research into one plan for your brand and one country, with every number linked to its source.</p>
      </section>

      <section className="wrap steps-detail reveal" aria-label="The three steps">
        {STEPS.map((s) => (
          <div key={s.n} className="step-row">
            <span className="how-n">{s.n}</span>
            <div>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="wrap plan-anatomy reveal" aria-labelledby="anatomy-title">
        <p className="kicker" id="anatomy-title">
          What&apos;s in a plan
        </p>
        <h2 className="section-title">
          Nine sections, <em>one decision.</em>
        </h2>
        <ol className="anatomy-list">
          {SECTIONS.map(([t, d], i) => (
            <li key={t}>
              <span className="anatomy-n">{i + 1}</span>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ol>
        <p className="anatomy-more">
          Want to see one?{" "}
          <Link href="/samples" className="link-btn accent">
            Read a sample plan <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>

      <section className="wrap sources-explain reveal" aria-labelledby="sources-title">
        <p className="kicker" id="sources-title">
          Where the research comes from
        </p>
        <h2 className="section-title">
          Every number has <em>a source.</em>
        </h2>
        <p className="lede">
          Every plan starts from First Port&apos;s own research, checked against official sources, and follows fixed rules: it always covers import
          duties, marks anything that needs checking with [verify], and never invents a tariff rate. Small tags in the plan link to the source behind
          each line. There are four kinds:
        </p>
        <div className="source-kinds">
          {SOURCES.map(([k, t, d]) => (
            <div key={k} className="source-kind">
              <span className="cite">{k}1</span>
              <div>
                <strong>{t}</strong>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap faq reveal" aria-labelledby="faq-title">
        <div className="faq-head">
          <TaniFace face="curious" size={88} />
          <div>
            <p className="kicker" id="faq-title">
              Good to know
            </p>
            <h2 className="section-title">
              Common <em>questions.</em>
            </h2>
          </div>
        </div>
        <dl className="faq-list">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <PlanCta />
    </main>
  );
}
