// Pricing and availability rules. Shared logic lives here so the browser's
// live estimate and the server's final price can never drift apart:
// the server always recalculates and ignores any price sent by the client.

const cars = require('./data/cars.json');
const extras = require('./data/extras.json');
const locations = require('./data/locations.json');

const MAX_DAYS = 30;
const FREE_CANCELLATION_HOURS = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

const carById = (id) => cars.find((c) => c.id === id);
const locationById = (id) => locations.find((l) => l.id === id);

// "2026-11-02" -> UTC midnight timestamp. Dates are calendar days, no time zones.
function dayStamp(dateStr) {
  return Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10));
}

function rentalDays(pickupDate, returnDate) {
  return Math.round((dayStamp(returnDate) - dayStamp(pickupDate)) / DAY_MS);
}

function quote({ carId, pickupDate, returnDate, extras: chosen = [] }) {
  const car = carById(carId);
  const days = rentalDays(pickupDate, returnDate);
  const lines = [{ id: 'car', name: `${car.name} × ${days} day${days === 1 ? '' : 's'}`, amount: car.pricePerDay * days }];
  for (const extra of extras) {
    if (chosen.includes(extra.id)) {
      lines.push({ id: extra.id, name: `${extra.name} × ${days}`, amount: extra.pricePerDay * days });
    }
  }
  return {
    days,
    currency: 'USD',
    lines,
    total: lines.reduce((sum, l) => sum + l.amount, 0),
  };
}

// Bookings overlap when one starts before the other ends.
// Return day counts as busy (the car is cleaned and checked that day).
function overlaps(a, b) {
  return dayStamp(a.pickupDate) <= dayStamp(b.returnDate) && dayStamp(b.pickupDate) <= dayStamp(a.returnDate);
}

function unitsLeft(bookings, { carId, locationId, pickupDate, returnDate }) {
  const car = carById(carId);
  const busy = bookings.filter(
    (b) =>
      b.carId === carId &&
      b.locationId === locationId &&
      b.status !== 'cancelled' &&
      overlaps(b, { pickupDate, returnDate })
  ).length;
  return Math.max(0, car.units - busy);
}

module.exports = {
  cars,
  extras,
  locations,
  carById,
  locationById,
  rentalDays,
  dayStamp,
  quote,
  unitsLeft,
  MAX_DAYS,
  FREE_CANCELLATION_HOURS,
  DAY_MS,
};
