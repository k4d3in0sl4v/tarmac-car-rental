import { extras } from '@/lib/data';
import { json, rateLimit } from '@/lib/server';

export function GET(req: Request) {
  return rateLimit(req, 'read') ?? json(extras);
}
