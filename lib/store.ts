// Server only. Tiny JSON-file database for bookings and call-back requests.
// Data lives in memory and every change is written to disk atomically
// (temp file + rename), one write at a time. Swap this module for SQLite or
// PostgreSQL when traffic grows: the route handlers only use the functions below.

import fs from 'node:fs';
import path from 'node:path';
import type { Quote } from './pricing';

export type BookingStatus = 'confirmed' | 'picked-up' | 'returned' | 'cancelled';

export type Booking = {
  reference: string;
  status: BookingStatus;
  carId: string;
  locationId: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  extras: string[];
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  quote: Quote;
  createdAt: string;
  updatedAt?: string;
  freeCancellationUntil: string;
  cancelledBy?: 'customer' | 'staff';
};

export type Callback = { id: string; name: string; phone: string; preferredTime: string; done: boolean; createdAt: string };

type Db = { bookings: Booking[]; callbacks: Callback[] };

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), 'storage', 'db.json');

// Keep one copy across hot reloads in `next dev`.
const g = globalThis as unknown as { __tarmacDb?: Db; __tarmacWrite?: Promise<void> };

function db(): Db {
  if (g.__tarmacDb) return g.__tarmacDb;
  let data: Db = { bookings: [], callbacks: [] };
  try {
    if (fs.existsSync(DB_FILE)) data = { ...data, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch {
    const backup = `${DB_FILE}.broken-${Date.now()}`;
    fs.copyFileSync(DB_FILE, backup);
    console.error(`[store] ${DB_FILE} is not valid JSON. Starting empty, old file kept at ${backup}`);
  }
  g.__tarmacDb = data;
  return data;
}

function persist() {
  const snapshot = JSON.stringify(db(), null, 2);
  g.__tarmacWrite = (g.__tarmacWrite ?? Promise.resolve())
    .then(async () => {
      await fs.promises.mkdir(path.dirname(DB_FILE), { recursive: true });
      const tmp = `${DB_FILE}.tmp`;
      await fs.promises.writeFile(tmp, snapshot);
      await fs.promises.rename(tmp, DB_FILE);
    })
    .catch((err) => console.error('[store] write failed:', err));
  return g.__tarmacWrite;
}

export const bookings = {
  all: () => db().bookings,
  find: (reference: string) => db().bookings.find((b) => b.reference === reference),
  async add(booking: Booking) {
    db().bookings.push(booking);
    await persist();
    return booking;
  },
  async update(reference: string, patch: Partial<Booking>) {
    const booking = db().bookings.find((b) => b.reference === reference);
    if (!booking) return null;
    Object.assign(booking, patch, { updatedAt: new Date().toISOString() });
    await persist();
    return booking;
  },
};

export const callbacks = {
  all: () => db().callbacks,
  async add(item: Callback) {
    db().callbacks.push(item);
    await persist();
    return item;
  },
  async update(id: string, patch: Partial<Callback>) {
    const item = db().callbacks.find((c) => c.id === id);
    if (!item) return null;
    Object.assign(item, patch);
    await persist();
    return item;
  },
};
