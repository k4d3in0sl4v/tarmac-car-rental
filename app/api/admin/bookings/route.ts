import { json, rateLimit, requireAdmin } from '@/lib/server';
import { bookings } from '@/lib/store';

export function GET(req: Request) {
  const denied = rateLimit(req, 'admin') ?? requireAdmin(req);
  if (denied) return denied;
  return json([...bookings.all()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}
