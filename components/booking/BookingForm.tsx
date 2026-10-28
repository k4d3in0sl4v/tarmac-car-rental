'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import FieldError, { invalidProps } from '@/components/FieldError';
import { api } from '@/lib/client';
import { carById, extras, locationById, locations, PHONE } from '@/lib/data';
import { addDays, defaultDates, isoDate, money, pickupTimes } from '@/lib/format';
import { quote, rentalDays } from '@/lib/pricing';
import type { PublicBooking } from '@/lib/server';
import { hasErrors, validateBooking, type FieldErrors } from '@/lib/validate';
import { saveLastBooking } from './storage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function BookingForm() {
  const params = useSearchParams();
  const router = useRouter();
  const car = carById(params.get('car') ?? '');

  const [form, setForm] = useState(() => {
    const d = defaultDates();
    const p = (k: string) => params.get(k) ?? '';
    return {
      locationId: locationById(p('locationId')) ? p('locationId') : 'LAX',
      pickupDate: DATE_RE.test(p('pickupDate')) ? p('pickupDate') : d.pickupDate,
      returnDate: DATE_RE.test(p('returnDate')) ? p('returnDate') : d.returnDate,
      pickupTime: '10:00',
      extras: [] as string[],
      fullName: '',
      email: '',
      phone: '',
      notes: '',
      driverAge21: false,
      website: '',
    };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const days = DATE_RE.test(form.pickupDate) && DATE_RE.test(form.returnDate) ? rentalDays(form.pickupDate, form.returnDate) : 0;
  const estimate = useMemo(() => (car && days > 0 ? quote({ ...form, carId: car.id }) : null), [car, days, form]);

  if (!car) {
    return (
      <div className="panel narrow">
        <h1 style={{ fontSize: 'var(--step-2)' }}>Choose a car first</h1>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>Pick a class on the cars page and press Book.</p>
        <Link className="btn btn--primary" href="/cars" style={{ marginTop: 20 }}>See cars and prices</Link>
      </div>
    );
  }

  const cancellationNote = (() => {
    const d = new Date(`${form.pickupDate}T${form.pickupTime}:00`);
    if (Number.isNaN(d.getTime())) return '';
    d.setHours(d.getHours() - 24);
    if (d.getTime() <= Date.now()) return ' Pick-up is less than 24 hours away, so free cancellation does not apply.';
    return ` Free cancellation until ${d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`;
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const body = { ...form, carId: car.id };
    const { errors: found } = validateBooking(body);
    if (!found.pickupDate && form.pickupDate < isoDate(new Date())) found.pickupDate = 'Pick-up date is in the past.';
    setErrors(found);
    if (hasErrors(found)) {
      document.getElementById(`b-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setBusy(true);
    const res = await api<PublicBooking>('/api/bookings', { method: 'POST', body });
    setBusy(false);
    if (res.ok) {
      saveLastBooking(res.data);
      router.push(`/booking/confirmed?ref=${encodeURIComponent(res.data.reference)}`);
    } else if (res.fields) setErrors(res.fields);
    else setFormError(res.status === 0 ? `Online booking isn’t available right now. Call us at ${PHONE} and we’ll book this car for you.` : res.error);
  };

  return (
    <form className="book" onSubmit={submit} noValidate>
      <div className="panel booking">
        <fieldset>
          <legend>Trip</legend>
          <div className="grid-2">
            <div className="field field--span">
              <label htmlFor="b-locationId">Pick-up airport</label>
              <select id="b-locationId" value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="b-pickupDate">Pick-up date</label>
              <input
                id="b-pickupDate" type="date" min={isoDate(new Date())} value={form.pickupDate}
                onChange={(e) => {
                  const v = e.target.value;
                  set('pickupDate', v);
                  if (v && (!form.returnDate || form.returnDate <= v)) set('returnDate', addDays(v, 3));
                }}
                {...invalidProps('b-pickupDate-error', errors.pickupDate)}
              />
              <FieldError id="b-pickupDate-error" message={errors.pickupDate} />
            </div>
            <div className="field">
              <label htmlFor="b-pickupTime">Pick-up time</label>
              <select id="b-pickupTime" value={form.pickupTime} onChange={(e) => set('pickupTime', e.target.value)}>
                {pickupTimes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="b-returnDate">Return date</label>
              <input
                id="b-returnDate" type="date" min={form.pickupDate ? addDays(form.pickupDate, 1) : undefined} value={form.returnDate}
                onChange={(e) => set('returnDate', e.target.value)}
                {...invalidProps('b-returnDate-error', errors.returnDate)}
              />
              <FieldError id="b-returnDate-error" message={errors.returnDate} />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Extras</legend>
          <div className="extras">
            {extras.map((x) => (
              <label key={x.id} className="extra">
                <input
                  type="checkbox"
                  checked={form.extras.includes(x.id)}
                  onChange={(e) => set('extras', e.target.checked ? [...form.extras, x.id] : form.extras.filter((id) => id !== x.id))}
                />
                <span>{x.name}</span>
                <small>{money(x.pricePerDay)} / day</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Main driver</legend>
          <div className="grid-2">
            <div className="field field--span">
              <label htmlFor="b-fullName">Full name, as on the license</label>
              <input id="b-fullName" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} {...invalidProps('b-fullName-error', errors.fullName)} />
              <FieldError id="b-fullName-error" message={errors.fullName} />
            </div>
            <div className="field">
              <label htmlFor="b-email">Email</label>
              <input id="b-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} {...invalidProps('b-email-error', errors.email)} />
              <FieldError id="b-email-error" message={errors.email} />
            </div>
            <div className="field">
              <label htmlFor="b-phone">Phone, with country code</label>
              <input id="b-phone" type="tel" autoComplete="tel" placeholder={PHONE} value={form.phone} onChange={(e) => set('phone', e.target.value)} {...invalidProps('b-phone-error', errors.phone)} />
              <FieldError id="b-phone-error" message={errors.phone} />
            </div>
            <div className="field field--span">
              <label htmlFor="b-notes">Flight number or comment <span className="optional">(optional)</span></label>
              <input id="b-notes" maxLength={500} placeholder="e.g. UA 1234, we’ll wait if it’s late" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <label className="check field--span">
              <input id="b-driverAge21" type="checkbox" checked={form.driverAge21} onChange={(e) => set('driverAge21', e.target.checked)} {...invalidProps('b-driverAge21-error', errors.driverAge21)} />
              <span>The main driver is 21 or older</span>
            </label>
            <div className="field--span"><FieldError id="b-driverAge21-error" message={errors.driverAge21} /></div>
          </div>
          <div className="hp" aria-hidden>
            <label htmlFor="b-website">Website</label>
            <input id="b-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>
        </fieldset>
      </div>

      <aside className="book__aside" aria-label="Your car and price">
        <div className="panel book__car">
          <img src={car.image} alt="" width={490} height={190} />
          <h2>{car.name}</h2>
          <p>{car.example}, {money(car.pricePerDay)} a day</p>
          <Link className="link-button" href="/cars">Change car</Link>
        </div>
        <div className="panel">
          <section className="summary" aria-label="Price">
            {estimate ? (
              <>
                <ul className="summary__lines">
                  {estimate.lines.map((l) => <li key={l.id}><span>{l.name}</span><span>{money(l.amount)}</span></li>)}
                </ul>
                <p className="summary__total"><span>Total</span><strong>{money(estimate.total)}</strong></p>
                <p className="summary__note">Taxes and airport fees included. Pay at pick-up.{cancellationNote}</p>
              </>
            ) : (
              <p className="summary__note">Choose dates to see the total.</p>
            )}
          </section>
          {formError && <p className="form-error" role="alert" style={{ marginTop: 16 }}>{formError}</p>}
          <button className="btn btn--primary btn--block" type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Booking…' : `Book ${car.name}`}
          </button>
        </div>
      </aside>
    </form>
  );
}
