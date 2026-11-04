"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "./brand";
import { WorldMap } from "./Maps";

// The Start page map: the highlighted port drifts through the four countries until someone
// picks one; picking a country (map dot or chip) opens Create with that country chosen.
export function StartMap() {
  const router = useRouter();
  const [port, setPort] = useState<string>("japan");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    // Old links (/#access, /#example) now live on their own pages.
    if (window.location.hash === "#access" || window.location.hash === "#get-a-plan") router.replace("/create");
    if (window.location.hash === "#example") router.replace("/samples");
  }, [router]);

  useEffect(() => {
    if (touched || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setPort((p) => COUNTRIES[(COUNTRIES.findIndex((c) => c.key === p) + 1) % COUNTRIES.length].key);
    }, 3200);
    return () => clearInterval(t);
  }, [touched]);

  const pick = (key: string) => {
    setTouched(true);
    setPort(key);
    router.push(`/create?country=${key}`);
  };

  return (
    <figure className="start-map">
      <div onMouseEnter={() => setTouched(true)}>
        <WorldMap highlight={port} onSelect={pick} />
      </div>
      <figcaption className="port-names" aria-label="Choose a country">
        {COUNTRIES.map((c, i) => (
          <span key={c.key}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <button
              type="button"
              className={port === c.key ? "port-name on" : "port-name"}
              onMouseEnter={() => {
                setTouched(true);
                setPort(c.key);
              }}
              onFocus={() => setPort(c.key)}
              onClick={() => pick(c.key)}
            >
              {c.label}
            </button>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
