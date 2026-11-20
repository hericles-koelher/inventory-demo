import type { SVGProps } from "react";

const paths: Record<string, React.ReactNode> = {
  box: (
    <>
      <path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Zm0 9v9M3.5 7.5 12 12l8.5-4.5M7.8 5.3l8.7 4.6" />
    </>
  ),
  boxes: (
    <>
      <path d="M4 8h16v12H4zM3 4h18v4H3zm6 8h6" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="4" width="7" height="7" rx="1" />
      <rect x="13.5" y="4" width="7" height="7" rx="1" />
      <rect x="3.5" y="14" width="7" height="6" rx="1" />
      <rect x="13.5" y="14" width="7" height="6" rx="1" />
    </>
  ),
  swap: (
    <>
      <path d="M4 7h15m-4-4 4 4-4 4m5 6H5m4-4-4 4 4 4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  warning: (
    <>
      <path d="m10.5 4.5-7.8 13A1.7 1.7 0 0 0 4.1 20h15.8a1.7 1.7 0 0 0 1.4-2.5l-7.8-13a1.7 1.7 0 0 0-3 0ZM12 9v4m0 3h.01" />
    </>
  ),
  out: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12h7" />
    </>
  ),
  inbound: (
    <>
      <path d="M12 19V5m-5 5 5-5 5 5" />
    </>
  ),
  outbound: (
    <>
      <path d="M12 5v14m-5-5 5 5 5-5" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </>
  ),
  reset: (
    <>
      <path d="M4 11a8 8 0 1 1 2 6.3M4 5v6h6" />
    </>
  ),
  external: (
    <>
      <path d="M13 5h6v6m0-6-8 8m-1-7H5v13h13v-5" />
    </>
  ),
  edit: (
    <>
      <path d="m14 6 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),
};

type IconName = keyof typeof paths;

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
