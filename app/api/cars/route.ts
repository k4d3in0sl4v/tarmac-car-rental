// GET /api/cars                                  -> the catalogue
// GET /api/cars?locationId=LAX&pickupDate=…&returnDate=…  -> plus availability and trip total
import { cars } from '@/lib/data';
import { quote, unitsLeft } from '@/lib/pricing';
import { badRequest, json, rateLimit } from '@/lib/server';
import { bookings } from '@/lib/store';
import { hasErrors, validateTrip } from '@/lib/validate';

export function GET(req: Request) {
  const limited = rateLimit(req, 'read');
  if (limited) return limited;

  const q = Object.fromEntries(new URL(req.url).searchParams);
  const catalogue = cars.map(({ units, ...car }) => car);
  if (!(q.locationId && q.pickupDate && q.returnDate)) return json(catalogue);

  const results = [];
  for (const car of catalogue) {
    const { trip, errors } = validateTrip({ ...q, carId: car.id });
    if (hasErrors(errors)) return badRequest(errors);
    const left = unitsLeft(bookings.all(), trip);
    results.push({ ...car, available: left > 0, unitsLeft: left, quote: quote(trip) });
  }
  return json(results);
}
