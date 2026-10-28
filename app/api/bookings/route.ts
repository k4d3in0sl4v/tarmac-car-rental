import { carById, FREE_CANCELLATION_HOURS } from '@/lib/data';
import { quote, unitsLeft } from '@/lib/pricing';
import { badRequest, invalidBody, isBot, json, newReference, publicBooking, rateLimit, readBody } from '@/lib/server';
import { bookings, type Booking } from '@/lib/store';
import { hasErrors, validateBooking } from '@/lib/validate';

export async function POST(req: Request) {
  const limited = rateLimit(req, 'write');
  if (limited) return limited;
  const body = await readBody(req);
  if (!body) return invalidBody();
  if (isBot(body)) return json({ reference: 'TM-OK' }, 201);

  const { booking, errors } = validateBooking(body);
  if (hasErrors(errors)) return badRequest(errors);

  if (unitsLeft(bookings.all(), booking) < 1) {
    return json(
      { error: `No ${carById(booking.carId)?.name} cars left at this airport for these dates. Try other dates or another class.` },
      409
    );
  }

  // Free cancellation until 24 hours before pick-up (pick-up time read as UTC).
  const pickupAt = Date.parse(`${booking.pickupDate}T${booking.pickupTime}:00Z`);
  const record: Booking = {
    ...booking,
    reference: newReference(),
    status: 'confirmed',
    quote: quote(booking),
    createdAt: new Date().toISOString(),
    freeCancellationUntil: new Date(pickupAt - FREE_CANCELLATION_HOURS * 3_600_000).toISOString(),
  };
  await bookings.add(record);
  return json(publicBooking(record), 201);
}
