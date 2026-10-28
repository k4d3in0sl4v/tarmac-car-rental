// Keeps the last booking for the confirmation page. Session storage can be
// unavailable (private mode, blocked storage), so every access is guarded.
import type { PublicBooking } from '@/lib/server';

const KEY = 'tarmac:last-booking';

export function saveLastBooking(b: PublicBooking) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* the confirmation page falls back to the reference from the URL */
  }
}

export function readLastBooking(reference: string): PublicBooking | null {
  try {
    const b = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return b && b.reference === reference ? b : null;
  } catch {
    return null;
  }
}
