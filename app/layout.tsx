import type { Metadata, Viewport } from 'next';
import { Overpass } from 'next/font/google';
import { PHONE } from '@/lib/data';
import './globals.css';

const overpass = Overpass({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-overpass' });

export const metadata: Metadata = {
  title: { default: 'Tarmac Car Rental — cars at 7 US airports', template: '%s — Tarmac Car Rental' },
  description: 'Rent economy, luxury, convertible, SUV and minivan cars at 7 US airports. Free cancellation, no hidden charges, 24/7 support.',
  icons: { icon: '/img/favicon.svg' },
  openGraph: {
    title: 'Tarmac Car Rental',
    description: 'Your contract is ready before you land. Rent a car at 7 US airports.',
    images: ['/img/car-1.webp'],
    type: 'website',
  },
};

export const viewport: Viewport = { themeColor: '#3151aa' };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoRental',
  name: 'Tarmac Car Rental',
  telephone: PHONE.replace(/ /g, '-'),
  openingHours: 'Mo-Su 00:00-23:59',
  areaServed: 'US',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={overpass.variable}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
