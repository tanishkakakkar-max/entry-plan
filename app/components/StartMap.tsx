"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "./brand";
import { WorldMap } from "./Maps";

// The Start page map: the highlighted port drifts through the four countries until someone
// hovers or picks one. Picking a country (map dot or name) just selects it on the map.
export function StartMap() {
  const router = useRouter();
  const [chosen, setChosen] = useState<string>("japan"); // cycles until someone clicks a country
  const [preview, setPreview] = useState<string | null>(null); // hovering a country shows it, without keeping it
  const [picked, setPicked] = useState(false);
  const port = preview ?? chosen;

  useEffect(() => {
    // Old links (/#access, /#example) now live on their own pages.
    if (window.location.hash === "#access" || window.location.hash === "#get-a-plan") router.replace("/create");
    if (window.location.hash === "#example") router.replace("/samples");
  }, [router]);

  useEffect(() => {
    if (picked || preview || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setChosen((p) => COUNTRIES[(COUNTRIES.findIndex((c) => c.key === p) + 1) % COUNTRIES.length].key);
    }, 3200);
    return () => clearInterval(t);
  }, [picked, preview]);

  const pick = (key: string) => {
    setPicked(true);
    setChosen(key);
    setPreview(null);
  };

  return (
    <figure className="start-map">
      <WorldMap highlight={port} onSelect={pick} onPreview={setPreview} />
      <figcaption className="port-names" aria-label="Choose a country">
        {COUNTRIES.map((c, i) => (
          <span key={c.key}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <button
              type="button"
              className={port === c.key ? "port-name on" : "port-name"}
              aria-pressed={picked && chosen === c.key}
              onMouseEnter={() => setPreview(c.key)}
              onMouseLeave={() => setPreview(null)}
              onFocus={() => setPreview(c.key)}
              onBlur={() => setPreview(null)}
              onClick={() => pick(c.key)}
            >
              {c.label}
            </button>
          </span>
        ))}
      </figcaption>
      <p key={port} className="port-teaser" aria-live="polite">
        <strong>{COUNTRIES.find((c) => c.key === port)?.label}:</strong> {COUNTRIES.find((c) => c.key === port)?.teaser}
      </p>
    </figure>
  );
}
