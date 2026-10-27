// Car rental site: static frontend + JSON API. Zero npm dependencies.
// Run:  node server/index.js   (or: npm start)

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

loadEnvFile(path.join(__dirname, '..', '.env'));

const store = require('./store');
const pricing = require('./pricing');
const { validateTrip, validateBooking, validateCallback, EMAIL_RE, str } = require('./validate');
const { Router, HttpError, sendJson, readJsonBody, runHandlers, serveStatic } = require('./http');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(12).toString('hex');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const TRUST_PROXY = process.env.TRUST_PROXY === '1'; // set when behind nginx / Render / Railway

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "script-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// ---------- helpers ----------
const clientIp = (req) =>
  (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress;

function rateLimit({ windowMs, max }) {
  if (process.env.NODE_ENV === 'test') return () => {};
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res) => {
    const key = clientIp(req);
    const count = (hits.get(key) || 0) + 1;
    hits.set(key, count);
    if (count > max) sendJson(res, 429, { error: 'Too many requests. Wait a minute and try again.' });
  };
}
const writeLimit = rateLimit({ windowMs: 60_000, max: 10 });
const readLimit = rateLimit({ windowMs: 60_000, max: 120 });
const adminLimit = rateLimit({ windowMs: 60_000, max: 60 });

const hasErrors = (errors) => Object.keys(errors).length > 0;
const badRequest = (res, fields) => sendJson(res, 400, { error: 'Some fields need attention.', fields });

// Honeypot: a hidden "website" field real people never fill in.
const isBot = (body) => typeof body.website === 'string' && body.website.trim() !== '';

function newReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I lookalikes
  return 'TM-' + Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
}

const publicBooking = (b) => ({
  reference: b.reference,
  status: b.status,
  carId: b.carId,
  carName: pricing.carById(b.carId)?.name,
  locationId: b.locationId,
  locationName: pricing.locationById(b.locationId)?.name,
  pickupDate: b.pickupDate,
  pickupTime: b.pickupTime,
  returnDate: b.returnDate,
  extras: b.extras,
  quote: b.quote,
  fullName: b.fullName,
  createdAt: b.createdAt,
  freeCancellationUntil: b.freeCancellationUntil,
  canCancel: b.status === 'confirmed' && Date.now() < Date.parse(b.freeCancellationUntil),
});

function requireAdmin(req, res) {
  const header = req.headers.authorization || '';
  const token = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
  const expected = Buffer.from(ADMIN_TOKEN);
  if (token.length !== expected.length || !crypto.timingSafeEqual(token, expected)) {
    sendJson(res, 401, { error: 'Wrong admin token.' });
  }
}

// Look up a booking: needs both reference and the email used to book.
function findOwnBooking(req) {
  const ref = str(req.params.reference).toUpperCase();
  const email = str(req.query.get('email') || req.body.email).toLowerCase();
  const booking = store.bookings.find(ref);
  if (!booking || !EMAIL_RE.test(email) || booking.email !== email) return null;
  return booking;
}

// ---------- routes ----------
const api = new Router();

api.get('/api/health', readLimit, (req, res) => sendJson(res, 200, { ok: true }));
api.get('/api/locations', readLimit, (req, res) => sendJson(res, 200, pricing.locations));
api.get('/api/extras', readLimit, (req, res) => sendJson(res, 200, pricing.extras));

// GET /api/cars?locationId=LAX&pickupDate=2026-11-02&returnDate=2026-11-06
// Without a trip: the plain catalogue. With one: availability + total per car.
api.get('/api/cars', readLimit, (req, res) => {
  const q = Object.fromEntries(req.query);
  const catalogue = pricing.cars.map(({ units, ...car }) => car);
  if (!(q.locationId && q.pickupDate && q.returnDate)) return sendJson(res, 200, catalogue);

  const results = [];
  for (const car of catalogue) {
    const { trip, errors } = validateTrip({ ...q, carId: car.id });
    if (hasErrors(errors)) return badRequest(res, errors);
    const left = pricing.unitsLeft(store.bookings.all(), trip);
    results.push({ ...car, available: left > 0, unitsLeft: left, quote: pricing.quote(trip) });
  }
  sendJson(res, 200, results);
});

api.post('/api/quote', readLimit, (req, res) => {
  const { trip, errors } = validateTrip(req.body);
  if (hasErrors(errors)) return badRequest(res, errors);
  sendJson(res, 200, { ...pricing.quote(trip), available: pricing.unitsLeft(store.bookings.all(), trip) > 0 });
});

api.post('/api/bookings', writeLimit, async (req, res) => {
  if (isBot(req.body)) return sendJson(res, 201, { reference: 'TM-OK' });

  const { booking, errors } = validateBooking(req.body);
  if (hasErrors(errors)) return badRequest(res, errors);

  if (pricing.unitsLeft(store.bookings.all(), booking) < 1) {
    const name = pricing.carById(booking.carId).name;
    return sendJson(res, 409, {
      error: `No ${name} cars left at this location for these dates. Try other dates or another class.`,
    });
  }

  // Free cancellation until 24 h before pick-up (pick-up time treated as UTC — fine for a prototype).
  const pickupAt = Date.parse(`${booking.pickupDate}T${booking.pickupTime}:00Z`);
  const record = {
    ...booking,
    reference: newReference(),
    status: 'confirmed',
    quote: pricing.quote(booking),
    createdAt: new Date().toISOString(),
    freeCancellationUntil: new Date(pickupAt - pricing.FREE_CANCELLATION_HOURS * 3600_000).toISOString(),
  };
  await store.bookings.add(record);
  console.log(`[booking] ${record.reference} ${record.carId} @ ${record.locationId} ${record.pickupDate} → ${record.returnDate} $${record.quote.total}`);
  sendJson(res, 201, publicBooking(record));
});

api.get('/api/bookings/:reference', writeLimit, (req, res) => {
  const booking = findOwnBooking(req);
  if (!booking) return sendJson(res, 404, { error: 'No booking matches this reference and email.' });
  sendJson(res, 200, publicBooking(booking));
});

api.post('/api/bookings/:reference/cancel', writeLimit, async (req, res) => {
  const booking = findOwnBooking(req);
  if (!booking) return sendJson(res, 404, { error: 'No booking matches this reference and email.' });
  if (booking.status === 'cancelled') return sendJson(res, 200, publicBooking(booking));
  if (booking.status !== 'confirmed' || Date.now() >= Date.parse(booking.freeCancellationUntil)) {
    return sendJson(res, 409, { error: 'Free cancellation ended 24 hours before pick-up. Call us to change this booking.' });
  }
  const updated = await store.bookings.update(booking.reference, { status: 'cancelled', cancelledBy: 'customer' });
  sendJson(res, 200, publicBooking(updated));
});

api.post('/api/callbacks', writeLimit, async (req, res) => {
  if (isBot(req.body)) return sendJson(res, 201, { ok: true });
  const { item, errors } = validateCallback(req.body);
  if (hasErrors(errors)) return badRequest(res, errors);
  await store.callbacks.add({ id: crypto.randomUUID(), ...item, done: false, createdAt: new Date().toISOString() });
  console.log(`[callback] ${item.name} ${item.phone} ${item.preferredTime}`);
  sendJson(res, 201, { ok: true });
});

// ---------- admin (Authorization: Bearer <ADMIN_TOKEN>) ----------
const byNewest = (x, y) => y.createdAt.localeCompare(x.createdAt);

api.get('/api/admin/bookings', adminLimit, requireAdmin, (req, res) =>
  sendJson(res, 200, [...store.bookings.all()].sort(byNewest))
);

api.patch('/api/admin/bookings/:reference', adminLimit, requireAdmin, async (req, res) => {
  const status = str(req.body.status);
  if (!['confirmed', 'picked-up', 'returned', 'cancelled'].includes(status)) {
    return badRequest(res, { status: 'Unknown status.' });
  }
  const updated = await store.bookings.update(str(req.params.reference).toUpperCase(), { status });
  if (!updated) return sendJson(res, 404, { error: 'Booking not found.' });
  sendJson(res, 200, updated);
});

api.get('/api/admin/callbacks', adminLimit, requireAdmin, (req, res) =>
  sendJson(res, 200, [...store.callbacks.all()].sort(byNewest))
);

api.patch('/api/admin/callbacks/:id', adminLimit, requireAdmin, async (req, res) => {
  const updated = await store.callbacks.update(req.params.id, { done: req.body.done === true });
  if (!updated) return sendJson(res, 404, { error: 'Request not found.' });
  sendJson(res, 200, updated);
});

// ---------- server ----------
async function handle(req, res) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    if (pathname.startsWith('/api/')) {
      const found = api.match(req.method, pathname);
      if (!found) return sendJson(res, 404, { error: 'Unknown API route.' });
      if (found.methodNotAllowed) return sendJson(res, 405, { error: 'Method not allowed.' });
      req.params = found.params;
      req.query = url.searchParams;
      req.body = await readJsonBody(req);
      return await runHandlers(found.route.handlers, req, res);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed.' });
    if (serveStatic(PUBLIC_DIR, req, res, pathname)) return;
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(PUBLIC_DIR, '404.html')).pipe(res);
  } catch (err) {
    if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Something broke on our side. Try again or call us.' });
  }
}

function createServer() {
  store.load();
  return http.createServer(handle);
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Site:  http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    if (!process.env.ADMIN_TOKEN) {
      console.log(`Admin token for this run: ${ADMIN_TOKEN}  (set ADMIN_TOKEN in .env to keep it fixed)`);
    }
  });
}

module.exports = { createServer, ADMIN_TOKEN };

// Minimal .env reader so the project needs no packages.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
