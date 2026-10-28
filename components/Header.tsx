'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PHONE, PHONE_HREF } from '@/lib/data';
import Logo from './Logo';
import { PhoneIcon } from './icons';

const links = [
  { label: 'Cars', href: '/cars' },
  { label: 'How it works', href: '/#how' },
  { label: 'Help', href: '/help' },
  { label: 'Manage booking', href: '/manage' },
];

function isActive(path: string, href: string) {
  if (href === '/cars') return path === '/cars' || path.startsWith('/cars/') || path === '/book';
  return !href.includes('#') && path === href;
}

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu after navigating or on Escape.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap site-header__inner">
        <Logo />
        <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          <span className="nav-toggle__bars" aria-hidden />
          <span className="sr-only">Menu</span>
        </button>
        <nav className={`site-nav${open ? ' is-open' : ''}`} id="site-nav" aria-label="Main">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isActive(path, l.href) ? 'page' : undefined} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <a className="phone-pill" href={PHONE_HREF}>
            <PhoneIcon />
            {PHONE}
          </a>
        </nav>
      </div>
    </header>
  );
}
