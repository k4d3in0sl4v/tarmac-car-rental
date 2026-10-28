// Line icons used across the site. All decorative: pass aria-hidden through.
type IconProps = React.SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({ viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false, ...props });
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}><path {...stroke} strokeWidth={2} d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" /></svg>
);
export const SeatIcon = (p: IconProps) => (
  <svg {...base(p)}><path {...stroke} d="M7 3h4l1 9h6a2 2 0 0 1 2 2v2H8z M8 16v5 M18 16v5" /></svg>
);
export const BagIcon = (p: IconProps) => (
  <svg {...base(p)}><path {...stroke} d="M5 7h14v13H5z M9 7V4h6v3 M9 11v5 M15 11v5" /></svg>
);
export const DoorIcon = (p: IconProps) => (
  <svg {...base(p)}><path {...stroke} d="M4 12 11 4h9v16H4z M4 12h16 M15 15h2" /></svg>
);
export const GearIcon = (p: IconProps) => (
  <svg {...base(p)}><path {...stroke} d="M6 4v16 M12 4v16 M18 4v8 M6 12h12" /></svg>
);
export const SnowIcon = (p: IconProps) => (
  <svg {...base(p)}><path {...stroke} d="M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9 M9.5 4.5 12 6l2.5-1.5 M9.5 19.5 12 18l2.5 1.5" /></svg>
);
export const CheckMark = (p: IconProps) => (
  <svg viewBox="0 0 48 48" aria-hidden focusable={false} className="confirm__mark" {...p}>
    <circle cx="24" cy="24" r="22" />
    <path d="m14 25 7 7 13-15" />
  </svg>
);
