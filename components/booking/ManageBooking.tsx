'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { PHONE } from '@/lib/data';
import { money, niceDate } from '@/lib/format';
import type { PublicBooking } from '@/lib/server';

const STATUS_LABEL: Record<string, string> = { confirmed: 'Confirmed', 'picked-up': 'Picked up', returned: 'Returned', cancelled: 'Cancelled' };

export default function ManageBooking() {
  const params = useSearchParams();
  const [reference, setReference] = useState(params.get('ref') ?? '');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState('');
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setArmed(false);
    const ref = reference.trim().toUpperCase();
    if (!ref || !email.trim()) {
      setError('Enter the booking reference and the email you booked with.');
      return;
    }
    setBusy(true);
    const res = await api<PublicBooking>(`/api/bookings/${encodeURIComponent(ref)}?email=${encodeURIComponent(email.trim())}`);
    setBusy(false);
    if (res.ok) setBooking(res.data);
    else {
      setBooking(null);
      setError(res.status === 0 ? `Booking lookup isn’t available right now. Call us at ${PHONE}.` : res.error);
    }
  };

  // Two-step cancel: the first click asks, the second cancels.
  const cancel = async () => {
    if (!booking) return;
    if (!armed) return setArmed(true);
    setBusy(true);
    const res = await api<PublicBooking>(`/api/bookings/${booking.reference}/cancel`, { method: 'POST', body: { email: email.trim() } });
    setBusy(false);
    setArmed(false);
    if (res.ok) {
      setBooking(res.data);
      setStatus(`Booking ${res.data.reference} cancelled.`);
    } else setError(res.error);
  };

  return (
    <div className="panel narrow">
      <form className="manage-form" onSubmit={find} noValidate>
        <div className="field">
          <label htmlFor="m-ref">Booking reference</label>
          <input id="m-ref" placeholder="TM-XXXXXX" autoComplete="off" autoCapitalize="characters" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-email">Email used for booking</label>
          <input id="m-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>Find booking</button>
      </form>

      {booking && (
        <div className="manage-result">
          <p><span className={`status-badge status-badge--${booking.status}`}>{STATUS_LABEL[booking.status]}</span></p>
          <dl>
            <dt>Reference</dt><dd>{booking.reference}</dd>
            <dt>Driver</dt><dd>{booking.fullName}</dd>
            <dt>Car</dt><dd>{booking.carName}</dd>
            <dt>Airport</dt><dd>{booking.locationName}</dd>
            <dt>Pick-up</dt><dd>{niceDate(booking.pickupDate)}, {booking.pickupTime}</dd>
            <dt>Return</dt><dd>{niceDate(booking.returnDate)}</dd>
            <dt>Total</dt><dd>{money(booking.quote.total)}</dd>
          </dl>
          {booking.canCancel && (
            <button type="button" className={`btn btn--block ${armed ? 'btn--danger' : 'btn--ghost'}`} onClick={cancel} disabled={busy}>
              {armed ? 'Yes, cancel this booking' : 'Cancel booking'}
            </button>
          )}
          {booking.status === 'confirmed' && !booking.canCancel && (
            <p className="summary__note">Free cancellation has ended. Call us at {PHONE} to change this booking.</p>
          )}
        </div>
      )}
      <p className="form-status" role="status" style={{ marginTop: 12, fontWeight: 600 }}>{status}</p>
    </div>
  );
}
