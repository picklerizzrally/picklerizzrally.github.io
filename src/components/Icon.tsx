import type { ReactNode } from "react";

export type IconName =
  | "arrow" | "back" | "calendar" | "check" | "chevron" | "clock" | "location" | "lock"
  | "menu" | "play" | "search" | "share" | "trophy" | "users" | "x";

const paths: Record<IconName, ReactNode> = {
  arrow: (<><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>),
  back: (<><path d="M19 12H5" /><path d="m10 7-5 5 5 5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>),
  check: <path d="m5 12 5 5 9-10" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  location: (<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  play: <path d="m9 7 8 5-8 5V7Z" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  share: (<><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>),
  trophy: (<><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 13v4M8 20h8M9 17h6" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>),
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function LogoMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#b8ef3f] text-[#132116]">
      <span className="h-5 w-5 rotate-45 rounded-full border-[5px] border-[#132116] border-r-transparent" />
    </span>
  );
}
