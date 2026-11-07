import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "../components/brand";
import { PlanCta } from "../components/PlanCta";
import { TaniFace } from "../components/Tani";
import { AskBox, Faq, SourceKinds, StepsDetail } from "./Interactive";

export const metadata: Metadata = {
  title: `How it works - ${BRAND.name}`,
  description: "How First Port writes a market-entry plan: the three steps, what's in a plan, where the research comes from and how codes work.",
};

const STEPS = [
  {
    n: "01",
    title: "Pick a country",
    text: "Choose Japan, Singapore, India or the United States. Your brand can be based anywhere. Not sure which? Read the Markets page or a sample plan first.",
    more: "Each country has its own research behind it: how buyers think, the usual ways in, and the duties, taxes and rules that apply to goods made where yours are made.",
  },
  {
    n: "02",
    title: "Tell us about your brand",
    text: "Only your brand name, category and what you sell are needed, or just your website. Customer, price, brand personality and where you sell today are optional: leave them blank and the plan says what it assumed.",
    more: "Add your website and First Port reads it for you. Anything it has to guess is listed at the top of your plan, so you can correct it with Edit inputs and rerun.",
  },
  {
    n: "03",
    title: "Get your plan",
    text: "In about 2 minutes First Port reads its research for that country and category, searches the web for what has changed, finds relevant studies, and writes your plan. You can watch it write.",
    more: "You see each step as it happens, then the plan fills in section by section with its sources. It's saved on your code for 30 days, and you can copy it or download a PDF.",
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
  { k: "P", title: "Official and primary sources", text: "Government notices, customs schedules and regulator pages behind the numbers.", example: "the US Federal Register notice that sets the 2026 tariff rate for goods from your country." },
  { k: "W", title: "Web", text: "Recent articles and pages found by a live search when your plan is written.", example: "a news story from this year about a competitor opening its first store in Tokyo." },
  { k: "S", title: "Peer-reviewed papers", text: "Studies on how consumers in that market behave.", example: "a study on what makes Gen Z shoppers pay more for sustainable fashion." },
  { k: "R", title: "First Port research", text: "First Port's own analysis of each country and category.", example: "First Port's notes on which channels work best for beauty brands in Singapore." },
];

const FAQ: [string, string][] = [
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

      <StepsDetail steps={STEPS} />

      <section className="wrap plan-anatomy reveal" aria-labelledby="anatomy-title">
        <p className="kicker" id="anatomy-title">
          What&apos;s in a plan
        </p>
        <h2 className="section-title">
          Nine sections, <em>one decision.</em>
        </h2>
        <ol className="anatomy-list reveal stagger">
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
        <SourceKinds sources={SOURCES} />
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
        <Faq items={FAQ} />
      </section>

      <section className="wrap still-asking reveal" aria-labelledby="ask-title">
        <p className="kicker" id="ask-title">
          Still have a question?
        </p>
        <h2 className="section-title">
          Ask Tani, <em>any time.</em>
        </h2>
        <p className="lede">
          Not covered above? Ask me anything about the site, the four countries or your plan. For a real person, email{" "}
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
        </p>
        <AskBox />
      </section>

      <PlanCta />
    </main>
  );
}
