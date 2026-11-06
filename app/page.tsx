import Link from "next/link";
import { StartMap } from "./components/StartMap";
import { BRAND } from "./components/brand";
import { AskTaniButton, JumpingTani, TaniFace } from "./components/Tani";
import { PlanCta } from "./components/PlanCta";

const HOW = [
  { n: "01", title: "Pick a country", text: "Japan, Singapore, India or the United States. Your brand can be based anywhere.", href: "/markets", cta: "See the markets" },
  { n: "02", title: "Tell us about your brand", text: "Your brand name and what you sell, or just your website. Everything else is optional.", href: "/create", cta: "Get a free code" },
  { n: "03", title: "Get a clear plan", text: "A verdict, the route in, the duties and rules, and links to the official sources.", href: "/how-it-works", cta: "What's in a plan" },
];

const GUIDE = [
  { face: "pointing" as const, title: "How it works", text: "The three steps, what's inside a plan, and where the research comes from.", href: "/how-it-works", cta: "Learn how it works" },
  { face: "curious" as const, title: "Markets", text: "Japan, Singapore, India and the US, and the ways brands enter them, from low risk to high.", href: "/markets", cta: "Explore markets" },
  { face: "thumbsup" as const, title: "Samples", text: "Real-format plans for four brands in all four countries. Read them free.", href: "/samples", cta: "See samples" },
];

const DIFFERENT = [
  {
    title: "Checked research, not guesses",
    text: "Every plan starts from First Port's own research on each country and category, checked against official sources such as government tariff notices, customs schedules and regulators.",
  },
  {
    title: "Sources you can click",
    text: "Plans link to the official page, web article or study behind each number, so you can check anything before you act on it.",
  },
  {
    title: "Rules every plan follows",
    text: "Every plan covers import duties, says when something needs checking, and never invents a tariff rate. If the research doesn't have it, the plan says so.",
  },
  {
    title: "Built for small brands",
    text: "No consultant fees and no local office needed to get a first, honest read on whether a country fits.",
  },
];

// Home: the pitch, why I built it, three steps, what makes it different, where to go next, and the plan button.
export default function StartPage() {
  return (
    <main id="top">
      <section className="hero">
        <div className="wrap hero-inner">
          <div className="hero-copy rise">
            <p className="kicker">Market-entry plans</p>
            <h1 className="hero-title">
              <span>Pick a country.</span>
              <em>Get a launch plan.</em>
            </h1>
            <p className="lede">A research-backed plan for taking your brand abroad, in about 2 minutes.</p>
            <div className="hero-actions">
              <Link href="/create" className="btn btn-dark">
                Make my plan
              </Link>
            </div>
          </div>
          <div className="rise rise-2">
            <StartMap />
          </div>
        </div>
      </section>

      <section className="story reveal" id="about">
        <div className="wrap story-inner">
          <div>
            <p className="kicker kicker-light">Why I built this</p>
            <h2>
              Going abroad shouldn&apos;t <em>need a consultant.</em>
            </h2>
            <p>
              I&apos;m Tanishka, a business administration student at San José State, concentrating in marketing with a minor in computer science. I built
              First Port to make a marketer&apos;s job easier.
            </p>
            <p>
              Market research takes a long time. At first you don&apos;t even know where to look or how to start, and once you
              do, the work is tedious. Going into a new country is harder still: you usually need someone who specialises in
              that market, which takes real capital, and some brands end up building a whole local headquarters.
            </p>
            <p>
              That isn&apos;t realistic for a small brand that thinks it could do better somewhere else, or is simply curious
              whether a country fits its goals and is the right next move.
            </p>
            <p>
              So I brought it all into one easy-to-use market-entry tool. Any marketer or business owner can use it to see how a
              country fits and make the best decision for their business.
            </p>
            <a className="story-link" href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer">
              Find me on LinkedIn <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="story-stage">
            <JumpingTani height={200} />
          </div>
        </div>
      </section>

      <section className="wrap how reveal" aria-labelledby="how-title">
        <p className="kicker" id="how-title">
          How it works
        </p>
        <ol className="how-list">
          {HOW.map((s) => (
            <li key={s.n}>
              <Link href={s.href}>
                <span className="how-n">{s.n}</span>
                <span className="how-text">
                  <strong>{s.title}</strong>
                  <small>{s.text}</small>
                </span>
                <span className="how-cta">
                  {s.cta} <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap about-diff reveal" aria-labelledby="diff-title">
        <p className="kicker" id="diff-title">
          What makes it different
        </p>
        <h2 className="section-title">
          More than a <em>chatbot answer.</em>
        </h2>
        <div className="diff-grid">
          {DIFFERENT.map((d) => (
            <div key={d.title} className="diff-card">
              <h3>{d.title}</h3>
              <p>{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap guide reveal" aria-labelledby="guide-title">
        <p className="kicker" id="guide-title">
          Find your way
        </p>
        <h2 className="section-title">
          I&apos;ll walk you <em>through it.</em>
        </h2>
        <div className="guide-grid">
          {GUIDE.map((g) => (
            <Link key={g.title} href={g.href} className="guide-card">
              <TaniFace face={g.face} size={96} />
              <p className="guide-title">{g.title}</p>
              <p>{g.text}</p>
              <span className="guide-cta">
                {g.cta} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="guide-note">
          Stuck anywhere? Ask me. I can explain the site, the four countries, or how to get in touch. <AskTaniButton />
        </p>
      </section>
      <PlanCta />
    </main>
  );
}
