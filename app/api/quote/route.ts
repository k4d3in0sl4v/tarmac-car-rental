import { quote, unitsLeft } from '@/lib/pricing';
import { badRequest, invalidBody, json, rateLimit, readBody } from '@/lib/server';
import { bookings } from '@/lib/store';
import { hasErrors, validateTrip } from '@/lib/validate';

export async function POST(req: Request) {
  const limited = rateLimit(req, 'read');
  if (limited) return limited;
  const body = await readBody(req);
  if (!body) return invalidBody();

  const { trip, errors } = validateTrip(body);
  if (hasErrors(errors)) return badRequest(errors);
  return json({ ...quote(trip), available: unitsLeft(bookings.all(), trip) > 0 });
}
