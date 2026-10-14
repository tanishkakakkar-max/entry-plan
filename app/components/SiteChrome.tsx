"use client";

import { BRAND } from "./brand";

// Nav and footer shared by the home page and other pages. On the home page, onFree opens the free-code box
// and onExample fills in an example brand, in place; elsewhere the links go to /#access and /#example.
function freeLink(onFree?: () => void) {
  return {
    href: onFree ? "#access" : "/#access",
    onClick: onFree
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          onFree();
        }
      : undefined,
  };
}

export function SiteNav({ onFree, onExample, home = false }: { onFree?: () => void; onExample?: () => void; home?: boolean }) {
  return (
    <header className="nav no-print">
      <div className="wrap nav-inner">
        <a href={home ? "#top" : "/"} className="wordmark">
          {BRAND.name}
        </a>
        <nav aria-label="Main">
          <a href={home ? "#how" : "/#how"}>How it works</a>
          <a
            href={onExample ? "#example" : "/#example"}
            onClick={
              onExample
                ? (e) => {
                    e.preventDefault();
                    onExample();
                  }
                : undefined
            }
          >
            See an example
          </a>
          <a className="nav-cta" {...freeLink(onFree)}>
            Get 3 free plans
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ onFree }: { onFree?: () => void }) {
  return (
    <footer className="footer" id="contact">
      <div className="wrap footer-inner">
        <p className="footer-contact">
          <strong>No code?</strong> <a {...freeLink(onFree)}>Get 3 free plans</a> with your email, then get in touch if
          you&apos;d like more.
        </p>
        <p className="footer-contact">
          <strong>Get in touch</strong> for a personalised plan or more plans:{" "}
          <a href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`${BRAND.name}: personalised plan`)}`}>{BRAND.email}</a>
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </p>
        <p>
          <a href={BRAND.authorUrl} target="_blank" rel="noopener noreferrer" className="no-print-link">
            Built by {BRAND.author}
          </a>
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <span>{BRAND.version}</span>
        </p>
        <p className="disclaimer">
          This is a first read, not legal or customs advice. Web sources are cited as [W1], [W2] and research papers as
          [S1]. Anything marked [verify] should be checked with a primary source before you act on it.
        </p>
      </div>
    </footer>
  );
}
