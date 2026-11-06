"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BRAND } from "./brand";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/markets", label: "Markets" },
  { href: "/samples", label: "Samples" },
];
const CTA = { href: "/create", label: "Create plan" };

// Fades sections in as they scroll into view (".reveal" -> ".reveal.in"), again on every page change.
// Without IntersectionObserver, or with reduced motion (CSS), everything simply shows.
export function RevealOnScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}

// Nav on every page: Start, Samples, Create. The current page is underlined.
export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (pathname.startsWith("/admin")) return null;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <header className={`nav no-print${scrolled ? " scrolled" : ""}`}>
      <div className="wrap nav-inner">
        <Link href="/" className="wordmark">
          <span className="wordmark-dot" aria-hidden="true" />
          {BRAND.name}
        </Link>
        <nav aria-label="Main" className={menu ? "open" : ""} id="main-menu">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={active(l.href) ? "active" : ""} aria-current={active(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-right">
          <Link href={CTA.href} className={`nav-cta${active(CTA.href) ? " active" : ""}`} aria-current={active(CTA.href) ? "page" : undefined}>
            {CTA.label}
          </Link>
          <button type="button" className="nav-burger" aria-label="Menu" aria-expanded={menu} aria-controls="main-menu" onClick={() => setMenu((m) => !m)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <footer className="footer" id="contact">
      <div className="wrap footer-inner">
        <div>
          <p className="footer-mark">{BRAND.name}</p>
          <p>
            <a href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`${BRAND.name}: hello`)}`}>{BRAND.email}</a>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </p>
        </div>
        <div className="footer-links">
          {[...LINKS, CTA].map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>
        <p className="disclaimer">
          Built by {BRAND.author}. A plan is a first read, not legal, tax or customs advice. Anything marked [verify] should
          be checked with a primary source before you act on it.
        </p>
      </div>
    </footer>
  );
}
