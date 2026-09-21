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

export function UploadIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" {...common}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function ArrowUpRightIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common} strokeWidth={2}>
      <path d="M6 14L14 6M7 6h7v7" />
    </svg>
  );
}

export function SunIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <path d="M16.5 11.6A6.6 6.6 0 0 1 8.4 3.5a6.6 6.6 0 1 0 8.1 8.1z" />
    </svg>
  );
}

export function UserIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M3.8 16.5c0.8-3 3.3-4.5 6.2-4.5s5.4 1.5 6.2 4.5" />
    </svg>
  );
}

export function BoardIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <rect x="3" y="3.5" width="4" height="13" rx="1.2" />
      <rect x="8.5" y="3.5" width="4" height="8" rx="1.2" />
      <rect x="14" y="3.5" width="3" height="10.5" rx="1.2" />
    </svg>
  );
}

export function ChatIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" stroke="currentColor" {...common}>
      <path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2z" />
      <path d="M7 7.6h6M7 10.2h3.5" />
    </svg>
  );
}
