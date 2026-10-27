// Hand-written validation: no extra dependencies, clear error messages that
// the frontend can show next to the right field.

const { carById, locationById, extras, rentalDays, dayStamp, MAX_DAYS, DAY_MS } = require('./pricing');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()\-.]{7,20}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function todayStamp() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// Validates the trip part (car, place, dates). Used by /quote and /bookings.
function validateTrip(body, errors = {}) {
  const trip = {
    carId: str(body.carId),
    locationId: str(body.locationId),
    pickupDate: str(body.pickupDate),
    returnDate: str(body.returnDate),
    pickupTime: str(body.pickupTime) || '10:00',
    extras: Array.isArray(body.extras) ? [...new Set(body.extras.filter((e) => typeof e === 'string'))] : [],
  };

  if (!carById(trip.carId)) errors.carId = 'Choose a car class.';
  if (!locationById(trip.locationId)) errors.locationId = 'Choose a pick-up location.';
  if (!TIME_RE.test(trip.pickupTime)) errors.pickupTime = 'Use a time like 10:00.';

  if (!isRealDate(trip.pickupDate)) {
    errors.pickupDate = 'Enter a pick-up date.';
  } else if (dayStamp(trip.pickupDate) < todayStamp() - DAY_MS) {
    // one day of slack so US time zones behind UTC can still book "today"
    errors.pickupDate = 'Pick-up date is in the past.';
  } else if (dayStamp(trip.pickupDate) > todayStamp() + 365 * DAY_MS) {
    errors.pickupDate = 'We take bookings up to a year ahead.';
  }

  if (!isRealDate(trip.returnDate)) {
    errors.returnDate = 'Enter a return date.';
  } else if (!errors.pickupDate) {
    const days = rentalDays(trip.pickupDate, trip.returnDate);
    if (days < 1) errors.returnDate = 'Return date must be at least one day after pick-up.';
    else if (days > MAX_DAYS) errors.returnDate = `Bookings online are up to ${MAX_DAYS} days. Call us for longer rentals.`;
  }

  const knownExtras = new Set(extras.map((e) => e.id));
  trip.extras = trip.extras.filter((e) => knownExtras.has(e));
  return { trip, errors };
}

function validateBooking(body) {
  const { trip, errors } = validateTrip(body);
  const driver = {
    fullName: str(body.fullName).slice(0, 100),
    email: str(body.email).toLowerCase().slice(0, 120),
    phone: str(body.phone).slice(0, 30),
    notes: str(body.notes).slice(0, 500),
  };
  if (driver.fullName.length < 2) errors.fullName = 'Enter the driver’s full name.';
  if (!EMAIL_RE.test(driver.email)) errors.email = 'Enter a valid email address.';
  if (!PHONE_RE.test(driver.phone)) errors.phone = 'Enter a phone number with country code, e.g. +1 234 567 8908.';
  if (body.driverAge21 !== true) errors.driverAge21 = 'The main driver must be 21 or older.';
  return { booking: { ...trip, ...driver }, errors };
}

function validateCallback(body) {
  const errors = {};
  const item = {
    name: str(body.name).slice(0, 100),
    phone: str(body.phone).slice(0, 30),
    preferredTime: str(body.preferredTime).slice(0, 40),
  };
  if (item.name.length < 2) errors.name = 'Enter your name.';
  if (!PHONE_RE.test(item.phone)) errors.phone = 'Enter a phone number with country code.';
  return { item, errors };
}

module.exports = { validateTrip, validateBooking, validateCallback, EMAIL_RE, str };
