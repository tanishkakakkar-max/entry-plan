import Link from "next/link";

// The band at the end of every page: try it on your own brand.
export function PlanCta({ title = "Ready to see where your brand fits?", text = "Get a free code with 5 plans. Pick a country, tell us about your brand, and get your plan in about 2 minutes." }: { title?: string; text?: string }) {
  return (
    <section className="plan-cta reveal no-print">
      <div className="wrap plan-cta-inner">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="plan-cta-actions">
          <Link href="/create" className="btn btn-light">
            Make my plan, 5 free
          </Link>
          <Link href="/samples" className="btn btn-line-light">
            Read a sample first
          </Link>
        </div>
      </div>
    </section>
  );
}
