import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingForm from '@/components/booking/BookingForm';

export const metadata: Metadata = { title: 'Book a car', robots: { index: false } };

export default function BookPage() {
  return (
    <div className="page">
      <div className="wrap">
        <header className="page-head">
          <h1>Book your car</h1>
          <p>Pay at pick-up. Your contract is prepared as soon as you book.</p>
        </header>
        <Suspense fallback={null}>
          <BookingForm />
        </Suspense>
      </div>
    </div>
  );
}
