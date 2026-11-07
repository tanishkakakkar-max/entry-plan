"use client";

import { useState } from "react";

type Level = "Low" | "Low-medium" | "Medium" | "Medium-high" | "High" | "Shared" | "Full";
const STRATEGIES: { name: string; example: string; risk: Level; cost: Level; control: Level; reward: Level; fits: string; whyNot: string }[] = [
  {
    name: "Sell online from home",
    example: "Your own store, shipping across borders",
    risk: "Low",
    cost: "Low",
    control: "High",
    reward: "Low-medium",
    fits: "Testing whether anyone in the country wants your product before spending real money.",
    whyNot: "Slow shipping and duties at the door put buyers off, and you have little local presence or trust.",
  },
  {
    name: "Marketplaces",
    example: "Amazon, Rakuten, Shopee, Flipkart",
    risk: "Low-medium",
    cost: "Low-medium",
    control: "Low-medium",
    reward: "Medium",
    fits: "Reaching buyers fast where they already shop and search.",
    whyNot: "Fees and price wars eat margin, and the platform, not you, owns the customer.",
  },
  {
    name: "Distributor or importer",
    example: "A local company buys and resells your goods",
    risk: "Low-medium",
    cost: "Low",
    control: "Low",
    reward: "Medium",
    fits: "Regulated products like food and cosmetics, or when you don't want a local team.",
    whyNot: "Each middleman adds margin, and you lose control of price and how the brand is shown.",
  },
  {
    name: "Retail partners and pop-ups",
    example: "Boutiques, department stores, short-term shops",
    risk: "Medium",
    cost: "Medium",
    control: "Medium",
    reward: "Medium",
    fits: "Premium brands that need people to see and touch the product.",
    whyNot: "Wholesale margins, long buying cycles, and costly staff and rent for pop-ups.",
  },
  {
    name: "Licensing or franchising",
    example: "A local partner runs your brand for a fee",
    risk: "Medium",
    cost: "Low",
    control: "Low-medium",
    reward: "Medium",
    fits: "Repeatable formats like restaurants and services that need local operators.",
    whyNot: "Your brand is only as good as your partner, and royalties are smaller than owning the business.",
  },
  {
    name: "Joint venture",
    example: "A shared company with a local partner",
    risk: "Medium-high",
    cost: "High",
    control: "Shared",
    reward: "High",
    fits: "Markets where local know-how, licences or ownership rules make a partner essential.",
    whyNot: "Profits and decisions are shared, and disagreements are hard and costly to undo.",
  },
  {
    name: "Your own company and stores",
    example: "A local subsidiary, office or flagship",
    risk: "High",
    cost: "High",
    control: "Full",
    reward: "High",
    fits: "Proven demand and the capital to commit for years.",
    whyNot: "Leases, hiring, tax and compliance cost a lot before you sell anything, and they're hard to reverse.",
  },
];

const tone = (l: Level, reverse = false) => {
  const order: Level[] = ["Low", "Low-medium", "Medium", "Medium-high", "High"];
  const i = order.indexOf(l);
  if (i < 0) return "mid";
  const v = reverse ? 4 - i : i;
  return v <= 1 ? "good" : v === 2 ? "mid" : "hard";
};

const FILTERS = [
  { key: "risk", label: "Low risk", test: (s: (typeof STRATEGIES)[number]) => s.risk === "Low" || s.risk === "Low-medium" },
  { key: "cost", label: "Low cost", test: (s: (typeof STRATEGIES)[number]) => s.cost === "Low" || s.cost === "Low-medium" },
  { key: "control", label: "High control", test: (s: (typeof STRATEGIES)[number]) => s.control === "High" || s.control === "Full" },
  { key: "reward", label: "High reward", test: (s: (typeof STRATEGIES)[number]) => s.reward === "High" || s.reward === "Medium-high" },
] as const;

// The seven entry strategies, with filters that highlight the ones that match what a brand cares about.
export function StrategyExplorer() {
  const [want, setWant] = useState<string[]>([]);
  const toggle = (k: string) => setWant((w) => (w.includes(k) ? w.filter((x) => x !== k) : [...w, k]));
  const matches = (s: (typeof STRATEGIES)[number]) => want.every((k) => FILTERS.find((f) => f.key === k)!.test(s));
  const count = STRATEGIES.filter(matches).length;
  return (
    <>
      <div className="strategy-filters" role="group" aria-label="Show routes that are">
        <span>Show me routes with:</span>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={want.includes(f.key)} className={want.includes(f.key) ? "filter on" : "filter"} onClick={() => toggle(f.key)}>
            {f.label}
          </button>
        ))}
        {want.length > 0 && (
          <span className="strategy-count" aria-live="polite">
            {count === 0 ? "No route has all of these. That's the trade-off." : `${count} ${count === 1 ? "route matches" : "routes match"}`}
          </span>
        )}
      </div>
      <div className="strategy-list reveal stagger">
        {STRATEGIES.map((s, i) => (
          <article key={s.name} className={`strategy${want.length && !matches(s) ? " dim" : ""}${want.length && matches(s) ? " hit" : ""}`}>
            <div className="strategy-head">
              <span className="strategy-n">{i + 1}</span>
              <div>
                <h3>{s.name}</h3>
                <p className="strategy-example">{s.example}</p>
              </div>
            </div>
            <dl className="strategy-meters">
              <div>
                <dt>Risk</dt>
                <dd className={tone(s.risk)}>{s.risk}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd className={tone(s.cost)}>{s.cost}</dd>
              </div>
              <div>
                <dt>Control</dt>
                <dd className={s.control === "Full" ? "good" : s.control === "Shared" ? "mid" : tone(s.control as Level, true)}>{s.control}</dd>
              </div>
              <div>
                <dt>Reward</dt>
                <dd className={tone(s.reward, true)}>{s.reward}</dd>
              </div>
            </dl>
            <p>
              <strong>Good when:</strong> {s.fits}
            </p>
            <p>
              <strong>Why not:</strong> {s.whyNot}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
