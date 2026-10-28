import { badRequest, invalidBody, json, rateLimit, readBody, requireAdmin } from '@/lib/server';
import { bookings, type BookingStatus } from '@/lib/store';

const STATUSES: BookingStatus[] = ['confirmed', 'picked-up', 'returned', 'cancelled'];

export async function PATCH(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const denied = rateLimit(req, 'admin') ?? requireAdmin(req);
  if (denied) return denied;
  const body = await readBody(req);
  if (!body) return invalidBody();

  const status = body.status as BookingStatus;
  if (!STATUSES.includes(status)) return badRequest({ status: 'Unknown status.' });
  const { reference } = await params;
  const patch = status === 'cancelled' ? { status, cancelledBy: 'staff' as const } : { status };
  const updated = await bookings.update(decodeURIComponent(reference).toUpperCase(), patch);
  if (!updated) return json({ error: 'Booking not found.' }, 404);
  return json(updated);
}
