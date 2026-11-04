import Link from "next/link";
import { BRAND } from "./components/brand";
import { StartMap } from "./components/StartMap";
import { AskTaniButton, JumpingTani, TaniFace } from "./components/Tani";

const HOW = [
  { n: "01", title: "Browse sample plans", text: "Read full example plans for free, no code needed.", href: "/samples", cta: "See samples" },
  { n: "02", title: "Get your free code", text: "Enter your email on Create and get 5 free plans.", href: "/create", cta: "Get a code" },
  { n: "03", title: "Create your plan", text: "Your brand, one country, one clear plan in about 2 minutes.", href: "/create", cta: "Make my plan" },
];

const GUIDE = [
  { face: "pointing" as const, title: "Start", text: "You're here. What First Port is, why I built it and how it works." },
  { face: "thumbsup" as const, title: "Samples", text: "Real-format plans for four brands in all four countries. Read them free." },
  { face: "idea" as const, title: "Create", text: "Get your code, answer a few questions, and get your plan. Edit and rerun any time." },
];

// Start: intro, the backstory, how it works, and a guide to the three pages.
export default function StartPage() {
  return (
    <main>
      <section className="hero">
        <div className="wrap hero-inner">
          <div className="hero-copy rise">
            <p className="kicker">Market-entry plans</p>
            <h1>
              Pick a country. <em>Get a launch plan.</em>
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

      <section className="story reveal">
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

      <section className="wrap guide reveal" aria-labelledby="guide-title">
        <p className="kicker" id="guide-title">
          Your guide
        </p>
        <h2 className="section-title">
          I&apos;ll walk you <em>through it.</em>
        </h2>
        <div className="guide-grid">
          {GUIDE.map((g) => (
            <div key={g.title} className="guide-card">
              <TaniFace face={g.face} size={96} />
              <p className="guide-title">{g.title}</p>
              <p>{g.text}</p>
            </div>
          ))}
        </div>
        <p className="guide-note">
          Stuck anywhere? Ask me. I can explain the site, the four countries, or how to get in touch. <AskTaniButton />
        </p>
      </section>
    </main>
  );
}
