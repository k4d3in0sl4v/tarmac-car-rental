// GET /api/bookings/TM-XXXXXX?email=… — a customer looks up their own booking.
import { json, publicBooking, rateLimit } from '@/lib/server';
import { bookings } from '@/lib/store';
import { EMAIL_RE } from '@/lib/validate';

export async function GET(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const limited = rateLimit(req, 'write');
  if (limited) return limited;

  const { reference } = await params;
  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  const booking = bookings.find(decodeURIComponent(reference).trim().toUpperCase());
  if (!booking || !EMAIL_RE.test(email) || booking.email !== email) {
    return json({ error: 'No booking matches this reference and email.' }, 404);
  }
  return json(publicBooking(booking));
}
