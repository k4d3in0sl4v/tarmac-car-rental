// Pricing and date rules. Runs in the browser (live estimate) and on the server
// (final price), so both always agree. The server never trusts a client price.

import { carById, extras, type CarClass } from './data';

export const DAY_MS = 24 * 60 * 60 * 1000;

export type Trip = { carId: string; locationId: string; pickupDate: string; returnDate: string; pickupTime?: string; extras?: string[] };
export type QuoteLine = { id: string; name: string; amount: number };
export type Quote = { days: number; currency: 'USD'; lines: QuoteLine[]; total: number };

/** "2026-11-02" -> UTC midnight timestamp. Dates are calendar days, no time zones. */
export function dayStamp(date: string) {
  return Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
}

export function rentalDays(pickupDate: string, returnDate: string) {
  return Math.round((dayStamp(returnDate) - dayStamp(pickupDate)) / DAY_MS);
}

export function quote(trip: Trip): Quote {
  const car = carById(trip.carId) as CarClass;
  const days = rentalDays(trip.pickupDate, trip.returnDate);
  const chosen = trip.extras ?? [];
  const lines: QuoteLine[] = [{ id: 'car', name: `${car.name} × ${days} day${days === 1 ? '' : 's'}`, amount: car.pricePerDay * days }];
  for (const x of extras) {
    if (chosen.includes(x.id)) lines.push({ id: x.id, name: `${x.name} × ${days}`, amount: x.pricePerDay * days });
  }
  return { days, currency: 'USD', lines, total: lines.reduce((sum, l) => sum + l.amount, 0) };
}

type Range = { pickupDate: string; returnDate: string };

/** The return day counts as busy: the car is cleaned and checked that day. */
export function overlaps(a: Range, b: Range) {
  return dayStamp(a.pickupDate) <= dayStamp(b.returnDate) && dayStamp(b.pickupDate) <= dayStamp(a.returnDate);
}

type BookingLike = Range & { carId: string; locationId: string; status: string };

export function unitsLeft(bookings: BookingLike[], trip: Pick<Trip, 'carId' | 'locationId' | 'pickupDate' | 'returnDate'>) {
  const car = carById(trip.carId);
  if (!car) return 0;
  const busy = bookings.filter(
    (b) => b.carId === trip.carId && b.locationId === trip.locationId && b.status !== 'cancelled' && overlaps(b, trip)
  ).length;
  return Math.max(0, car.units - busy);
}
