// Run with: npm test   (uses Node's built-in test runner, no packages needed)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.ADMIN_TOKEN = 'test-admin-token';
process.env.DB_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rent-')), 'db.json');

const { createServer } = require('../server');

let server, base;
const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const json = (method, url, body, headers = {}) =>
  fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

const trip = { carId: 'luxury', locationId: 'LAX', pickupDate: day(10), returnDate: day(13), pickupTime: '10:00' };
const driver = { fullName: 'Test Driver', email: 'test@example.com', phone: '+1 234 567 8908', driverAge21: true };

before(async () => {
  server = createServer().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('catalogue lists five classes without inventory numbers', async () => {
  const { status, body } = await json('GET', '/api/cars');
  assert.equal(status, 200);
  assert.equal(body.length, 5);
  assert.equal(body[0].units, undefined);
});

test('quote is calculated on the server', async () => {
  const { status, body } = await json('POST', '/api/quote', { ...trip, extras: ['gps', 'nonsense'] });
  assert.equal(status, 200);
  assert.equal(body.days, 3);
  assert.equal(body.total, 3 * 129 + 3 * 7);
});

test('booking validation returns field errors', async () => {
  const { status, body } = await json('POST', '/api/bookings', { ...trip, returnDate: trip.pickupDate, email: 'bad' });
  assert.equal(status, 400);
  assert.ok(body.fields.returnDate);
  assert.ok(body.fields.email);
  assert.ok(body.fields.driverAge21);
});

test('booking, lookup, sell-out and cancellation', async () => {
  const first = await json('POST', '/api/bookings', { ...trip, ...driver, total: 1 });
  assert.equal(first.status, 201);
  assert.match(first.body.reference, /^TM-[A-Z2-9]{6}$/);
  assert.equal(first.body.quote.total, 387, 'client-sent total is ignored');

  // Luxury has 2 units: second booking fits, third overlapping one is refused
  assert.equal((await json('POST', '/api/bookings', { ...trip, ...driver })).status, 201);
  const third = await json('POST', '/api/bookings', { ...trip, ...driver });
  assert.equal(third.status, 409);

  const avail = await json('GET', `/api/cars?locationId=LAX&pickupDate=${trip.pickupDate}&returnDate=${trip.returnDate}`);
  assert.equal(avail.body.find((c) => c.id === 'luxury').available, false);

  const wrongEmail = await json('GET', `/api/bookings/${first.body.reference}?email=other@example.com`);
  assert.equal(wrongEmail.status, 404);

  const found = await json('GET', `/api/bookings/${first.body.reference}?email=TEST@example.com`);
  assert.equal(found.status, 200);
  assert.equal(found.body.canCancel, true);

  const cancelled = await json('POST', `/api/bookings/${first.body.reference}/cancel`, { email: driver.email });
  assert.equal(cancelled.body.status, 'cancelled');

  // a unit is free again
  assert.equal((await json('POST', '/api/bookings', { ...trip, ...driver })).status, 201);
});

test('callback request and admin access', async () => {
  assert.equal((await json('POST', '/api/callbacks', { name: 'Ann', phone: '+1 555 010 2030' })).status, 201);
  assert.equal((await json('GET', '/api/admin/callbacks')).status, 401);
  const list = await json('GET', '/api/admin/callbacks', null, { Authorization: 'Bearer test-admin-token' });
  assert.equal(list.status, 200);
  assert.equal(list.body[0].name, 'Ann');
});

test('static files and security headers', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(base + '/../server/index.js')).status, 404);
  assert.equal((await fetch(base + '/nope')).status, 404);
});
