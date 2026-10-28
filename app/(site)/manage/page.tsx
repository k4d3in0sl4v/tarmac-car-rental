import type { Metadata } from 'next';
import { Suspense } from 'react';
import ManageBooking from '@/components/booking/ManageBooking';

export const metadata: Metadata = { title: 'Manage booking', robots: { index: false } };

export default function ManagePage() {
  return (
    <div className="page">
      <div className="wrap narrow">
        <header className="page-head">
          <h1>Manage booking</h1>
          <p>Find your booking with its reference and email. You can cancel free of charge until 24 hours before pick-up.</p>
        </header>
        <Suspense fallback={null}>
          <ManageBooking />
        </Suspense>
      </div>
    </div>
  );
}
