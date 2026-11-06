import type { Metadata } from "next";
import { BRAND } from "../components/brand";
import { JumpingTani } from "../components/Tani";
import { PlanCta } from "../components/PlanCta";

export const metadata: Metadata = {
  title: `About - ${BRAND.name}`,
  description: "Why First Port exists, who built it, and what makes its market-entry plans different.",
};

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

// About: why First Port exists, who built it, what makes it different, and how to get in touch.
export default function AboutPage() {
  return (
    <main>
      <section className="story about-story">
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

      <section className="wrap about-contact reveal" aria-labelledby="contact-title">
        <p className="kicker" id="contact-title">
          Get in touch
        </p>
        <h2 className="section-title">
          Questions, feedback, <em>or a custom plan?</em>
        </h2>
        <p className="lede">
          Email <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> or find me on{" "}
          <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          . I read everything.
        </p>
      </section>

      <PlanCta title="See what First Port says about your brand" />
    </main>
  );
}
