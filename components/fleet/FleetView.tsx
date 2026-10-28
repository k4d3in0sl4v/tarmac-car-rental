'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import TripSearch from '@/components/TripSearch';
import { api } from '@/lib/client';
import { cars, locationById } from '@/lib/data';
import { niceDate, plural } from '@/lib/format';
import { rentalDays } from '@/lib/pricing';
import CarRow, { type Availability } from './CarRow';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function FleetView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const locationId = params.get('locationId') ?? '';
  const pickupDate = params.get('pickupDate') ?? '';
  const returnDate = params.get('returnDate') ?? '';
  const carClass = params.get('class') ?? '';
  const seats = Number(params.get('seats') ?? 0);
  const sort = params.get('sort') === 'seats' ? 'seats' : 'price';

  const hasTrip = !!locationById(locationId) && DATE_RE.test(pickupDate) && DATE_RE.test(returnDate) && rentalDays(pickupDate, returnDate) > 0;
  const days = hasTrip ? rentalDays(pickupDate, returnDate) : undefined;

  const [availability, setAvailability] = useState<Record<string, Availability> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setAvailability(null);
    setError('');
    if (!hasTrip) return;
    let cancelled = false;
    const q = new URLSearchParams({ locationId, pickupDate, returnDate });
    api<(Availability & { id: string })[]>(`/api/cars?${q}`).then((res) => {
      if (cancelled) return;
      if (res.ok) setAvailability(Object.fromEntries(res.data.map((c) => [c.id, c])));
      else setError(res.fields ? Object.values(res.fields)[0] : res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [hasTrip, locationId, pickupDate, returnDate]);

  /** Updates one or more filter params in the URL without scrolling. */
  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const list = useMemo(() => {
    const filtered = cars.filter((c) => (!carClass || c.id === carClass) && c.seats >= seats);
    return filtered.sort(sort === 'seats' ? (a, b) => b.seats - a.seats || a.pricePerDay - b.pricePerDay : (a, b) => a.pricePerDay - b.pricePerDay);
  }, [carClass, seats, sort]);

  const bookHref = (carId: string) => {
    const q = new URLSearchParams({ car: carId, ...(hasTrip ? { locationId, pickupDate, returnDate } : {}) });
    return `/book?${q}`;
  };

  return (
    <>
      <TripSearch
        compact
        initial={hasTrip ? { locationId, pickupDate, returnDate } : undefined}
        carId={carClass}
        onCarIdChange={(id) => setParams({ class: id })}
      />

      <div className="fleet__tools" id="results">
        <div className="chips" role="group" aria-label="Filter by class">
          <button type="button" className="chip" aria-pressed={!carClass} onClick={() => setParams({ class: '' })}>All classes</button>
          {cars.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={carClass === c.id} onClick={() => setParams({ class: c.id })}>{c.name}</button>
          ))}
        </div>
        <div className="fleet__selects">
          <label className="inline-select">Seats
            <select value={String(seats)} onChange={(e) => setParams({ seats: e.target.value === '0' ? '' : e.target.value })}>
              <option value="0">Any</option>
              <option value="5">5 or more</option>
              <option value="7">7 or more</option>
            </select>
          </label>
          <label className="inline-select">Sort
            <select value={sort} onChange={(e) => setParams({ sort: e.target.value === 'price' ? '' : e.target.value })}>
              <option value="price">Lowest price</option>
              <option value="seats">Most seats</option>
            </select>
          </label>
        </div>
      </div>

      <p className="fleet__status" aria-live="polite">
        {error ? (
          <span className="field__error">{error}</span>
        ) : hasTrip ? (
          <>Prices for <strong>{locationById(locationId)?.short}</strong>, {niceDate(pickupDate)} to {niceDate(returnDate)}, <strong>{plural(days!, 'day')}</strong>.</>
        ) : (
          'Pick dates above to see the total for your trip.'
        )}
      </p>

      <div className="car-list">
        {list.length ? (
          list.map((car) => (
            <CarRow
              key={car.id}
              car={car}
              availability={availability?.[car.id]}
              days={days}
              locationId={locationId}
              bookHref={bookHref(car.id)}
              highlight={carClass === car.id && !!hasTrip}
            />
          ))
        ) : (
          <p className="empty">
            No cars match these filters.{' '}
            <button type="button" className="link-button" onClick={() => setParams({ class: '', seats: '' })}>Show all cars</button>
          </p>
        )}
      </div>
    </>
  );
}
