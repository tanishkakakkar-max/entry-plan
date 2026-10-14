import type { Metadata } from "next";
import { BRAND } from "../components/brand";
import { LogoMark } from "../components/Logo";
import { FreeAccessForm } from "../components/FreeAccessForm";

export const metadata: Metadata = {
  title: `Get free access - ${BRAND.name}`,
  description: "Get a free access code for 3 live market-entry plans.",
};

export default function FreeAccessPage() {
  return (
    <main className="free-page hero-dark">
      <div className="wrap free-page-inner">
        <a href="/" className="hero-brand free-page-brand">
          <LogoMark size={40} onDark />
          <span>{BRAND.name}</span>
        </a>
        <FreeAccessForm />
        <p className="hero-alt">
          <a href="/">← Back to {BRAND.name}</a>
          <span className="dot" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          <a href="/#example">See an example plan</a>
        </p>
      </div>
    </main>
  );
}
