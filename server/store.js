// Tiny JSON-file database.
// Good enough for a prototype / small site: data lives in memory and every
// change is written to disk atomically (temp file + rename), one write at a time.
// For real traffic swap this module for SQLite or PostgreSQL — the rest of the
// server only uses the functions exported below.

const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'storage', 'db.json');

const empty = () => ({ bookings: [], callbacks: [] });

let data = empty();
let writeChain = Promise.resolve();

function load() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(empty(), null, 2));
  }
  try {
    data = { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch (err) {
    const backup = `${DB_FILE}.broken-${Date.now()}`;
    fs.copyFileSync(DB_FILE, backup);
    console.error(`[store] ${DB_FILE} is not valid JSON, starting empty. Old file kept at ${backup}`);
    data = empty();
  }
}

function persist() {
  const snapshot = JSON.stringify(data, null, 2);
  writeChain = writeChain
    .then(async () => {
      const tmp = `${DB_FILE}.tmp`;
      await fs.promises.writeFile(tmp, snapshot);
      await fs.promises.rename(tmp, DB_FILE);
    })
    .catch((err) => console.error('[store] write failed:', err));
  return writeChain;
}

module.exports = {
  load,
  bookings: {
    all: () => data.bookings,
    find: (reference) => data.bookings.find((b) => b.reference === reference),
    async add(booking) {
      data.bookings.push(booking);
      await persist();
      return booking;
    },
    async update(reference, patch) {
      const booking = data.bookings.find((b) => b.reference === reference);
      if (!booking) return null;
      Object.assign(booking, patch, { updatedAt: new Date().toISOString() });
      await persist();
      return booking;
    },
  },
  callbacks: {
    all: () => data.callbacks,
    async add(item) {
      data.callbacks.push(item);
      await persist();
      return item;
    },
    async update(id, patch) {
      const item = data.callbacks.find((c) => c.id === id);
      if (!item) return null;
      Object.assign(item, patch);
      await persist();
      return item;
    },
  },
};
