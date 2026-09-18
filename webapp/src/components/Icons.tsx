type IconProps = { size?: number };

const common = {
  fill: "none",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function OverviewIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </svg>
  );
}

export function DocumentIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <path d="M5 2.5h7l3 3v12h-10z" />
      <path d="M7 9h6M7 12h6M7 15h4" />
    </svg>
  );
}

export function IdBadgeIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <rect x="2.5" y="4" width="15" height="12" rx="2" />
      <circle cx="7.5" cy="9.5" r="1.75" />
      <path d="M4.5 13.5c0.6-1.6 1.9-2.4 3-2.4s2.4 0.8 3 2.4" />
      <path d="M12.5 8h3M12.5 11h3" />
    </svg>
  );
}

export function PuzzleIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <path d="M7 3.5h3v1.6a1.4 1.4 0 0 0 2.8 0V3.5h3V7h-1.7a1.4 1.4 0 0 0 0 2.8h1.7v3.7h-3v-1.6a1.4 1.4 0 1 0-2.8 0v1.6h-3v-3h1.6a1.4 1.4 0 1 0 0-2.8H7z" />
    </svg>
  );
}
