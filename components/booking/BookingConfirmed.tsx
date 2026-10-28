'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckMark } from '@/components/icons';
import { money, niceDate } from '@/lib/format';
import type { PublicBooking } from '@/lib/server';
import { readLastBooking } from './storage';

export default function BookingConfirmed() {
  const reference = useSearchParams().get('ref') ?? '';
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => setBooking(readLastBooking(reference)), [reference]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(`Copied ${reference}`);
    } catch {
      setCopied('Select the reference and copy it manually.');
    }
  };

  if (!reference) {
    return (
      <div className="panel narrow">
        <h1 style={{ fontSize: 'var(--step-2)' }}>No booking to show</h1>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>Find an existing booking with its reference and email.</p>
        <Link className="btn btn--primary" href="/manage" style={{ marginTop: 20 }}>Manage booking</Link>
      </div>
    );
  }

  return (
    <div className="panel narrow confirm">
      <CheckMark />
      <h1>Booked</h1>
      <p>Your reference</p>
      <p className="confirm__ref">{reference}</p>
      {booking && (
        <dl className="confirm__facts">
          <dt>Car</dt><dd>{booking.carName}</dd>
          <dt>Pick-up</dt><dd>{niceDate(booking.pickupDate)}, {booking.pickupTime}</dd>
          <dt>Return</dt><dd>{niceDate(booking.returnDate)}</dd>
          <dt>Airport</dt><dd>{booking.locationName}</dd>
          <dt>Total</dt><dd>{money(booking.quote.total)}</dd>
        </dl>
      )}
      <p className="confirm__hint">Show this reference at the desk. Save it, along with your email, to manage or cancel the booking.</p>
      <div className="confirm__actions">
        <Link className="btn btn--primary" href="/">Done</Link>
        <button className="btn btn--ghost" type="button" onClick={copy}>Copy reference</button>
        <Link className="btn btn--ghost" href={`/manage?ref=${encodeURIComponent(reference)}`}>Manage booking</Link>
      </div>
      <p className="form-status" role="status">{copied}</p>
    </div>
  );
}
