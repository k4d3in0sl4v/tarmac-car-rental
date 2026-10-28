import { invalidBody, json, publicBooking, rateLimit, readBody } from '@/lib/server';
import { bookings } from '@/lib/store';

export async function POST(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const limited = rateLimit(req, 'write');
  if (limited) return limited;
  const body = await readBody(req);
  if (!body) return invalidBody();

  const { reference } = await params;
  const email = String(body.email ?? '').trim().toLowerCase();
  const booking = bookings.find(decodeURIComponent(reference).trim().toUpperCase());
  if (!booking || booking.email !== email) return json({ error: 'No booking matches this reference and email.' }, 404);
  if (booking.status === 'cancelled') return json(publicBooking(booking));
  if (booking.status !== 'confirmed' || Date.now() >= Date.parse(booking.freeCancellationUntil)) {
    return json({ error: 'Free cancellation ended 24 hours before pick-up. Call us to change this booking.' }, 409);
  }
  const updated = await bookings.update(booking.reference, { status: 'cancelled', cancelledBy: 'customer' });
  return json(publicBooking(updated!));
}
