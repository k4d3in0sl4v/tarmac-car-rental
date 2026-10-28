import Link from 'next/link';

export function LogoMark() {
  return (
    <svg className="logo__mark" viewBox="0 0 40 40" aria-hidden focusable={false}>
      <path d="M6 4h28l2 6c0 14-6 22-16 26C10 32 4 24 4 10z" fill="#3151aa" />
      <path d="M12 12.5h16M20 12.5V28" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ tagline = 'car rental', href = '/' }: { tagline?: string; href?: string }) {
  return (
    <Link className="logo" href={href} aria-label="Tarmac Car Rental, home">
      <LogoMark />
      <span className="logo__word">
        tarmac<small>{tagline}</small>
      </span>
    </Link>
  );
}
