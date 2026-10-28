// Helpers for the API route handlers (server only): JSON responses, body parsing,
// rate limiting, admin auth and the public shape of a booking.

import crypto from 'node:crypto';
import { carById, locationById } from './data';
import type { FieldErrors } from './validate';
import type { Booking } from './store';

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export const badRequest = (fields: FieldErrors) => json({ error: 'Some fields need attention.', fields }, 400);

const MAX_BODY = 10 * 1024;

/** Parses a small JSON object body. Returns null (and the caller answers 400) on anything else. */
export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const invalidBody = () => json({ error: 'Send a JSON object no larger than 10 KB.' }, 400);

// ---------- rate limiting (in memory, per IP and route group) ----------
const g = globalThis as unknown as { __tarmacHits?: Map<string, { count: number; reset: number }> };
const hits = (g.__tarmacHits ??= new Map());

function clientIp(req: Request) {
  if (process.env.TRUST_PROXY === '1') {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'local';
}

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export function rateLimit(req: Request, group: 'read' | 'write' | 'admin') {
  if (process.env.NODE_ENV === 'test') return null;
  const max = { read: 120, write: 10, admin: 60 }[group];
  const key = `${group}:${clientIp(req)}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + 60_000 });
    return null;
  }
  entry.count += 1;
  return entry.count > max ? json({ error: 'Too many requests. Wait a minute and try again.' }, 429) : null;
}

/** Honeypot: a hidden "website" field real people never fill in. */
export const isBot = (body: Record<string, unknown>) => typeof body.website === 'string' && body.website.trim() !== '';

// ---------- admin ----------
export function requireAdmin(req: Request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return json({ error: 'Set ADMIN_TOKEN in .env.local to use the admin desk.' }, 503);
  const header = req.headers.get('authorization') || '';
  const token = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
  const want = Buffer.from(expected);
  if (token.length !== want.length || !crypto.timingSafeEqual(token, want)) {
    return json({ error: 'Wrong admin token.' }, 401);
  }
  return null;
}

// ---------- bookings ----------
export function newReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I lookalikes
  return 'TM-' + Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
}

/** What a customer may see about their own booking. */
export function publicBooking(b: Booking) {
  return {
    reference: b.reference,
    status: b.status,
    carId: b.carId,
    carName: carById(b.carId)?.name ?? b.carId,
    locationId: b.locationId,
    locationName: locationById(b.locationId)?.short ?? b.locationId,
    pickupDate: b.pickupDate,
    pickupTime: b.pickupTime,
    returnDate: b.returnDate,
    extras: b.extras,
    quote: b.quote,
    fullName: b.fullName,
    createdAt: b.createdAt,
    freeCancellationUntil: b.freeCancellationUntil,
    canCancel: b.status === 'confirmed' && Date.now() < Date.parse(b.freeCancellationUntil),
  };
}

export type PublicBooking = ReturnType<typeof publicBooking>;
