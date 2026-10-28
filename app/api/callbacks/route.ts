import crypto from 'node:crypto';
import { badRequest, invalidBody, isBot, json, rateLimit, readBody } from '@/lib/server';
import { callbacks } from '@/lib/store';
import { hasErrors, validateCallback } from '@/lib/validate';

export async function POST(req: Request) {
  const limited = rateLimit(req, 'write');
  if (limited) return limited;
  const body = await readBody(req);
  if (!body) return invalidBody();
  if (isBot(body)) return json({ ok: true }, 201);

  const { item, errors } = validateCallback(body);
  if (hasErrors(errors)) return badRequest(errors);
  await callbacks.add({ id: crypto.randomUUID(), ...item, done: false, createdAt: new Date().toISOString() });
  return json({ ok: true }, 201);
}
