import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Logo({ className }: { className?: string }) {
  // Italic N — thin bars (5px), italic shift 4px at top → 0 at bottom
  // s(y) = 4*(42-y)/36
  //
  // Final coords at key y values (base + italic shift):
  //   y=6  s=4.0 → LB [11,16]  D [16,24]  RB [39,44]
  //   y=18 s=2.7 → LB [9.7,14.7] D [19.7,27.7] RB [37.7,42.7]
  //   y=30 s=1.3 → LB [8.3,13.3] D [23.3,31.3] RB [36.3,41.3]
  //   y=42 s=0   → LB [7,12]    D [27,35]    RB [35,40]
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Light background */}
      <rect x="1" y="1" width="46" height="46" rx="11" fill="#eff6ff" />

      {/* ── Left bar — warm ── */}
      <polygon points="11,6  16,6  14.7,18"           fill="#f9d71c" />
      <polygon points="11,6  14.7,18 9.7,18"          fill="#f5a623" />
      <polygon points="9.7,18 14.7,18 13.3,30"        fill="#e67e22" />
      <polygon points="9.7,18 13.3,30  8.3,30"        fill="#e74c3c" />
      <polygon points="8.3,30 13.3,30 12,42"          fill="#e74c3c" />
      <polygon points="8.3,30 12,42   7,42"           fill="#c0392b" />

      {/* ── Diagonal parallelogram — warm→cool ── */}
      <polygon points="16,6   24,6   19.7,18"         fill="#f5a623" />
      <polygon points="24,6   27.7,18 19.7,18"        fill="#e67e22" />
      <polygon points="19.7,18 27.7,18 23.3,30"       fill="#1abc9c" />
      <polygon points="27.7,18 31.3,30 23.3,30"       fill="#16a085" />
      <polygon points="23.3,30 31.3,30 27,42"         fill="#2980b9" />
      <polygon points="31.3,30 35,42   27,42"         fill="#1a5276" />

      {/* ── Right bar — cool ── */}
      <polygon points="39,6   44,6   42.7,18"         fill="#76d7c4" />
      <polygon points="39,6   42.7,18 37.7,18"        fill="#1abc9c" />
      <polygon points="37.7,18 42.7,18 41.3,30"       fill="#3498db" />
      <polygon points="37.7,18 41.3,30 36.3,30"       fill="#2980b9" />
      <polygon points="36.3,30 41.3,30 40,42"         fill="#2471a3" />
      <polygon points="36.3,30 40,42  35,42"          fill="#1a5276" />

      {/* ── Facet dividers ── */}
      <g stroke="white" strokeWidth="0.6" opacity="0.32">
        <line x1="11"   y1="6"    x2="14.7" y2="18" />
        <line x1="9.7"  y1="18"   x2="13.3" y2="30" />
        <line x1="8.3"  y1="30"   x2="12"   y2="42" />
        <line x1="9.7"  y1="18"   x2="14.7" y2="18" />
        <line x1="8.3"  y1="30"   x2="13.3" y2="30" />
        <line x1="19.7" y1="18"   x2="27.7" y2="18" />
        <line x1="23.3" y1="30"   x2="31.3" y2="30" />
        <line x1="24"   y1="6"    x2="19.7" y2="18" />
        <line x1="27.7" y1="18"   x2="23.3" y2="30" />
        <line x1="31.3" y1="30"   x2="27"   y2="42" />
        <line x1="39"   y1="6"    x2="42.7" y2="18" />
        <line x1="37.7" y1="18"   x2="41.3" y2="30" />
        <line x1="36.3" y1="30"   x2="40"   y2="42" />
        <line x1="37.7" y1="18"   x2="42.7" y2="18" />
        <line x1="36.3" y1="30"   x2="41.3" y2="30" />
      </g>

      {/* ── Node dots ── */}
      <circle cx="16"  cy="6"  r="1.2" fill="white" opacity="0.85" />
      <circle cx="24"  cy="6"  r="1.2" fill="white" opacity="0.85" />
      <circle cx="27"  cy="42" r="1.2" fill="white" opacity="0.85" />
      <circle cx="35"  cy="42" r="1.2" fill="white" opacity="0.85" />
    </svg>
  );
}

export function BotMark({ className }: { className?: string }) {
  // Friendly AI robot head — used as the chat-widget avatar.
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="botHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5a623" />
          <stop offset="45%" stopColor="#e67e22" />
          <stop offset="75%" stopColor="#1abc9c" />
          <stop offset="100%" stopColor="#2980b9" />
        </linearGradient>
      </defs>

      {/* Circular tile */}
      <circle cx="24" cy="24" r="23" fill="#eff6ff" />

      {/* Antenna */}
      <line x1="24" y1="13" x2="24" y2="8" stroke="#e67e22" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="7" r="2" fill="#f9d71c" />

      {/* Ears */}
      <rect x="8" y="22" width="3" height="8" rx="1.5" fill="#2980b9" />
      <rect x="37" y="22" width="3" height="8" rx="1.5" fill="#2980b9" />

      {/* Head */}
      <rect x="11" y="13" width="26" height="24" rx="8" fill="url(#botHead)" />

      {/* Face screen */}
      <rect x="15" y="18" width="18" height="14" rx="5" fill="#0f2540" />

      {/* Eyes */}
      <circle cx="20.5" cy="25" r="2.4" fill="#5eead4" />
      <circle cx="27.5" cy="25" r="2.4" fill="#5eead4" />
      <circle cx="20" cy="24.3" r="0.8" fill="white" />
      <circle cx="27" cy="24.3" r="0.8" fill="white" />

      {/* Smile */}
      <path d="M20 29.5q4 2.5 8 0" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconBot(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V4M9 19v2M15 19v2" />
      <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconZap(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

export function IconHeadset(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
      <path d="M20 19a4 4 0 0 1-4 4h-3" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export const serviceIcons = {
  search: IconSearch,
  bot: IconBot,
  zap: IconZap,
  headset: IconHeadset,
} as const;

export type ServiceIconName = keyof typeof serviceIcons;
