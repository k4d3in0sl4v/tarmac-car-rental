import { invalidBody, json, rateLimit, readBody, requireAdmin } from '@/lib/server';
import { callbacks } from '@/lib/store';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = rateLimit(req, 'admin') ?? requireAdmin(req);
  if (denied) return denied;
  const body = await readBody(req);
  if (!body) return invalidBody();

  const { id } = await params;
  const updated = await callbacks.update(id, { done: body.done === true });
  if (!updated) return json({ error: 'Request not found.' }, 404);
  return json(updated);
}
