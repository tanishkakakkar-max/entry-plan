import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "../components/brand";
import { CountryOutline } from "../components/Maps";
import { PlanCta } from "../components/PlanCta";

export const metadata: Metadata = {
  title: `Markets - ${BRAND.name}`,
  description: "Japan, Singapore, India and the United States for foreign brands, and the main market-entry strategies compared by risk, cost, control and reward.",
};

const MARKETS = [
  {
    key: "japan",
    name: "Japan",
    line: "Trust is earned slowly, and it sticks.",
    text: "Japan rewards foreign brands that prove craft, materials and quality, not mission statements. Trust takes time to build, and once earned it is very loyal.",
    routes: ["Japanese-language online store", "Rakuten and Amazon.co.jp", "Select shops", "Department store pop-ups", "Importer or agent"],
    watch: "Shipping time and duties at the door hurt online sales, and partners expect Japanese-language service.",
  },
  {
    key: "singapore",
    name: "Singapore",
    line: "A small, rich test bed for Southeast Asia.",
    text: "Singapore is small, wealthy and expensive. Brands usually enter it as a beachhead, so the real question is what Singapore proves or unlocks for the rest of the region.",
    routes: ["Online store in English", "Shopee, Lazada and Amazon.sg", "Pop-ups and concept stores", "Regional distributor", "Regional office, later"],
    watch: "Very high retail rents and a strong discount culture on marketplaces.",
  },
  {
    key: "india",
    name: "India",
    line: "Not one market: pick your slice.",
    text: "Most foreign brands really enter metro, English-speaking, Instagram-native shoppers in a few cities. That market is large, but it behaves very differently from the rest of the country.",
    routes: ["Amazon.in and Flipkart", "Myntra, Ajio and Nykaa", "Own online store", "Quick commerce for fast-moving goods", "Franchise or retail partner"],
    watch: "Heavy discounting, cash on delivery and returns, and foreign-ownership rules for your own stores.",
  },
  {
    key: "us",
    name: "United States",
    line: "Big, crowded and loud: own one niche first.",
    text: "The US is a set of regional and community markets with one shared checkout. Brands fail by launching nationally on a budget that buys nothing; they win by owning one city or community first.",
    routes: ["Online store plus a US warehouse", "Amazon", "TikTok Shop", "Faire to independent boutiques", "Big-box retail, once proven"],
    watch: "High ad costs and the 2026 tariffs on imported goods; check your product's rate before pricing.",
  },
];

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

// Markets: the four countries and the entry strategies compared.
export default function MarketsPage() {
  return (
    <main>
      <section className="wrap page page-head rise">
        <p className="kicker">Markets</p>
        <h1>
          Four markets, <em>many ways in.</em>
        </h1>
        <p className="lede">What makes each country different for a foreign brand, and the main ways brands enter, from low risk to high.</p>
      </section>

      <section className="wrap markets-grid reveal" aria-label="The four markets">
        {MARKETS.map((m) => (
          <article key={m.key} className="market-card">
            <div className="market-top">
              <CountryOutline country={m.key} />
              <div>
                <h2>{m.name}</h2>
                <p className="market-line">{m.line}</p>
              </div>
            </div>
            <p>{m.text}</p>
            <p className="market-label">Common first routes</p>
            <ul className="route-chips">
              {m.routes.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="market-watch">
              <strong>Watch out:</strong> {m.watch}
            </p>
            <Link href={`/create?country=${m.key}`} className="link-btn accent">
              Make a plan for {m.name} <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </section>

      <section className="wrap strategies reveal" aria-labelledby="strat-title">
        <p className="kicker" id="strat-title">
          Entry strategies
        </p>
        <h2 className="section-title">
          Start small, <em>climb as you prove it.</em>
        </h2>
        <p className="lede">
          Every way into a new country trades risk and cost against control and reward. Most brands start near the top of this list and move down
          only once demand is proven.
        </p>
        <div className="strategy-list">
          {STRATEGIES.map((s, i) => (
            <article key={s.name} className="strategy">
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
        <p className="anatomy-more">
          Your plan picks one route for your brand and country, and says why. <Link href="/how-it-works" className="link-btn accent">How plans are made <span aria-hidden="true">→</span></Link>
        </p>
      </section>

      <PlanCta title="Which route fits your brand?" text="Get a free code with 5 plans and First Port will recommend one entry route for your brand and country, with the risks and the first 90 days." />
    </main>
  );
}
