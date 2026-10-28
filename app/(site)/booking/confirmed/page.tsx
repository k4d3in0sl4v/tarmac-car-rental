import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingConfirmed from '@/components/booking/BookingConfirmed';

export const metadata: Metadata = { title: 'Booking confirmed', robots: { index: false } };

export default function ConfirmedPage() {
  return (
    <div className="page">
      <div className="wrap">
        <Suspense fallback={null}>
          <BookingConfirmed />
        </Suspense>
      </div>
    </div>
  );
}
