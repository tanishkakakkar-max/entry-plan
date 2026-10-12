// The First Port mark: a port pin with a dotted route. onDark lifts the tile so it shows on deep ink.
export function LogoMark({ size = 40, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill={onDark ? "#2B5D6A" : "#183E48"} />
      <path d="M10 46 Q30 14 44 26" fill="none" stroke="#A2E1E6" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1 6.5" />
      <circle cx="44" cy="26" r="11" fill="#A2E1E6" />
      <circle cx="44" cy="26" r="5" fill="#EE873C" stroke="#fff" strokeWidth="2.2" />
    </svg>
  );
}
