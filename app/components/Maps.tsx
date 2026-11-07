"use client";

import { COUNTRY_PATHS, PINS, WORLD_COUNTRY_PATHS, WORLD_PATH } from "./geo";
import { countryLabel } from "./brand";

type Pt = [number, number];

// Brands can come from anywhere: a spread of origin cities, projected on the same map.
const ORIGINS: Record<string, Pt> = {
  "Los Angeles": [186.2, 186.2],
  "São Paulo": [372.4, 374.1],
  London: [499.8, 130.2],
  Stockholm: [541.9, 106.3],
  Lagos: [509.5, 276.4],
  "Cape Town": [548.9, 408.2],
  Dubai: [650.8, 215.3],
  Seoul: [832.7, 174.8],
  Sydney: [901.7, 408.2],
};

// A gentle arc from a to b, always bowing upward, with the bend capped so long routes stay soft.
function arc([x1, y1]: Pt, [x2, y2]: Pt) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  let nx = -dy / dist;
  let ny = dx / dist;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bend = Math.min(dist * 0.2, 70);
  const cx = (x1 + x2) / 2 + nx * bend;
  const cy = (y1 + y2) / 2 + ny * bend;
  return `M${x1},${y1} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2},${y2}`;
}

// Cropped to the land (Alaska to New Zealand), so the map has no empty ocean margin on the left.
const MAP_VIEWBOX = "85 36 915 448";

// highlight: the country shown. onSelect: a click picks a country. onPreview: hovering a country previews it
// (null when the mouse leaves), so the page can show it without keeping it.
export function WorldMap({
  highlight = "japan",
  onSelect,
  onPreview,
}: {
  highlight?: string;
  onSelect?: (key: string) => void;
  onPreview?: (key: string | null) => void;
}) {
  const dest = PINS[highlight] ?? PINS.japan;
  const origins = Object.entries(ORIGINS).filter(([, p]) => Math.hypot(p[0] - dest[0], p[1] - dest[1]) > 110);
  const labelLeft = dest[0] > 820;
  const choose = (key: string) => onSelect?.(key);
  const hover = (key: string) => ({
    onMouseEnter: () => onPreview?.(key),
    onMouseLeave: () => onPreview?.(null),
    onFocus: () => onPreview?.(key),
    onBlur: () => onPreview?.(null),
  });
  return (
    <div className="world-map-wrap">
    <svg className="world-map" viewBox={MAP_VIEWBOX} role={onSelect ? "group" : "img"} aria-label={`Routes from around the world into ${countryLabel(highlight)}`}>
      <path className="world-land" d={WORLD_PATH} />
      {Object.entries(WORLD_COUNTRY_PATHS).map(([key, d]) => (
        <path key={key} className={key === highlight ? "world-country on" : "world-country"} d={d} />
      ))}
      <g key={highlight} className="world-routes">
        {origins.map(([name, p]) => (
          <path key={name} className="world-route" d={arc(p, dest)} />
        ))}
      </g>
      {origins.map(([name, [x, y]]) => (
        <circle key={name} className="origin-dot" cx={x} cy={y} r="3.5" />
      ))}
      {Object.entries(PINS)
        .filter(([key]) => key !== highlight)
        .map(([key, [x, y]]) =>
          onSelect ? (
            <g
              key={key}
              className="port-option"
              role="button"
              tabIndex={0}
              aria-label={`Choose ${countryLabel(key)}`}
              onClick={() => choose(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  choose(key);
                }
              }}
              {...hover(key)}
            >
              <circle className="port-hit" cx={x} cy={y} r="18" />
              <circle className="port-dot" cx={x} cy={y} r="6" />
            </g>
          ) : (
            <circle key={key} className="port-dot" cx={x} cy={y} r="5" />
          ),
        )}
      <g
        key={`port-${highlight}`}
        className="port-active"
        transform={`translate(${dest[0]} ${dest[1]})`}
        {...(onSelect ? { ...hover(highlight), onClick: () => choose(highlight) } : {})}
      >
        <g className="pin-pop">
          <circle r="16" className="pin-halo" />
          <circle r="6" className="pin-dot" />
        </g>
        <text x={labelLeft ? -24 : 24} y="5" textAnchor={labelLeft ? "end" : "start"} className="port-label">
          {countryLabel(highlight)}
        </text>
      </g>
    </svg>
    </div>
  );
}

export function CountryOutline({ country }: { country: string }) {
  return (
    <svg className="country-outline" viewBox="0 0 240 160" aria-hidden="true" focusable="false">
      <path d={COUNTRY_PATHS[country]} />
    </svg>
  );
}
