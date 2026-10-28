'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cars, locations, MAX_DAYS, PHONE } from '@/lib/data';
import { addDays, defaultDates, isoDate } from '@/lib/format';
import { rentalDays } from '@/lib/pricing';

export type TripValues = { locationId: string; pickupDate: string; returnDate: string };

export function checkDates(pickupDate: string, returnDate: string) {
  if (!pickupDate || !returnDate) return 'Choose pick-up and return dates.';
  if (pickupDate < isoDate(new Date())) return 'Pick-up date is in the past.';
  const days = rentalDays(pickupDate, returnDate);
  if (days < 1) return 'Return date must be at least one day after pick-up.';
  if (days > MAX_DAYS) return `Online bookings are up to ${MAX_DAYS} days. Call us at ${PHONE} for longer rentals.`;
  return '';
}

type Props = {
  initial?: Partial<TripValues>;
  carId: string;
  onCarIdChange: (carId: string) => void;
  compact?: boolean;
};

/** Airport, dates and class. Submitting opens /cars with the trip in the URL. */
export default function TripSearch({ initial, carId, onCarIdChange, compact }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<TripValues>(() => ({ locationId: 'LAX', pickupDate: '', returnDate: '', ...initial }));
  const [error, setError] = useState('');
  // Dates depend on "today", so they are filled in the browser after the page loads.
  // (The home page is pre-rendered at build time; computing them there would freeze them.)
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(isoDate(new Date()));
    setValues((v) => (v.pickupDate ? v : { ...v, ...defaultDates() }));
  }, []);

  const set = (patch: Partial<TripValues>) => setValues((v) => ({ ...v, ...patch }));

  const onPickup = (pickupDate: string) => {
    const returnDate = !values.returnDate || values.returnDate <= pickupDate ? addDays(pickupDate, 3) : values.returnDate;
    set({ pickupDate, returnDate });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = checkDates(values.pickupDate, values.returnDate);
    setError(problem);
    if (problem) return;
    const q = new URLSearchParams({ ...values, ...(carId ? { class: carId } : {}) });
    router.push(`/cars?${q}#results`);
  };

  return (
    <form className={`search${compact ? ' search--compact' : ''}`} onSubmit={submit} noValidate>
      <div className="field field--wide">
        <label htmlFor="s-location">Pick-up airport</label>
        <select id="s-location" value={values.locationId} onChange={(e) => set({ locationId: e.target.value })}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.short}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="s-pickup">Pick-up date</label>
        <input id="s-pickup" type="date" min={today || undefined} value={values.pickupDate} onChange={(e) => onPickup(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="s-return">Return date</label>
        <input id="s-return" type="date" min={values.pickupDate ? addDays(values.pickupDate, 1) : today || undefined} value={values.returnDate} onChange={(e) => set({ returnDate: e.target.value })} required />
      </div>
      <div className="field">
        <label htmlFor="s-class">Car class</label>
        <select id="s-class" value={carId} onChange={(e) => onCarIdChange(e.target.value)}>
          <option value="">Any class</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <button className="btn btn--primary search__submit" type="submit">{compact ? 'Update prices' : 'Show prices'}</button>
      {error && <p className="search__error" role="alert">{error}</p>}
    </form>
  );
}
