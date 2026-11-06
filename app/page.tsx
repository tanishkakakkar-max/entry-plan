import Link from "next/link";
import { StartMap } from "./components/StartMap";
import { AskTaniButton, TaniFace } from "./components/Tani";
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

// Home: the pitch, three steps, where to go next, and the plan button.
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
