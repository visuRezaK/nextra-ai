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
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 4 8 24l16 20 16-20L24 4Z"
        stroke="var(--brand-sky)"
        strokeWidth="2"
        opacity="0.35"
      />
      <path d="m19 17-6 7 6 7" stroke="var(--brand-sky-light)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m29 17 6 7-6 7" stroke="var(--brand-sky)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="9" r="1.8" fill="var(--brand-sky-light)" />
      <circle cx="24" cy="39" r="1.8" fill="var(--brand-sky)" />
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
