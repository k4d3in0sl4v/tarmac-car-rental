'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Logo from '@/components/Logo';
import { api } from '@/lib/client';
import { carById } from '@/lib/data';
import { money, niceDate } from '@/lib/format';
import type { Booking, BookingStatus, Callback } from '@/lib/store';

const STATUSES: [BookingStatus, string][] = [
  ['confirmed', 'Confirmed'],
  ['picked-up', 'Picked up'],
  ['returned', 'Returned'],
  ['cancelled', 'Cancelled'],
];
const KEY = 'tarmac:admin-token';
const stamp = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const tel = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

// The token lives only for this browser tab.
const storage = {
  get: () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } },
  set: (v: string) => { try { sessionStorage.setItem(KEY, v); } catch { /* private mode */ } },
  clear: () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export default function AdminDesk() {
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (t: string) => {
    const [b, c] = await Promise.all([api<Booking[]>('/api/admin/bookings', { token: t }), api<Callback[]>('/api/admin/callbacks', { token: t })]);
    if (b.ok && c.ok) {
      setBookings(b.data);
      setCallbacks(c.data);
      setSignedIn(true);
      setLoginError('');
      storage.set(t);
      return;
    }
    const failed = !b.ok ? b : (c as Extract<typeof c, { ok: false }>);
    if (failed.status === 401 || failed.status === 503) {
      storage.clear();
      setSignedIn(false);
      setLoginError(failed.error);
    } else setMessage(failed.error);
  }, []);

  useEffect(() => {
    const saved = storage.get();
    if (saved) {
      setToken(saved);
      load(saved);
    }
  }, [load]);

  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== 'cancelled');
    const today = new Date().toISOString().slice(0, 10);
    return [
      [active.length, 'active bookings'],
      [active.filter((b) => b.pickupDate === today && b.status === 'confirmed').length, 'pick-ups today'],
      [money(active.reduce((s, b) => s + b.quote.total, 0)), 'booked value'],
      [bookings.length - active.length, 'cancelled'],
    ] as const;
  }, [bookings]);

  const rows = bookings.filter(
    (b) =>
      (!filter || b.status === filter) &&
      (!query || [b.reference, b.fullName, b.email, b.phone].some((v) => v.toLowerCase().includes(query.trim().toLowerCase())))
  );

  const setStatus = async (reference: string, status: BookingStatus) => {
    const res = await api<Booking>(`/api/admin/bookings/${reference}`, { method: 'PATCH', body: { status }, token });
    if (res.ok) {
      setBookings((list) => list.map((b) => (b.reference === reference ? res.data : b)));
      setMessage(`${reference}: ${STATUSES.find(([v]) => v === status)?.[1]}`);
    } else setMessage(res.error);
  };

  const setDone = async (id: string, done: boolean) => {
    const res = await api<Callback>(`/api/admin/callbacks/${id}`, { method: 'PATCH', body: { done }, token });
    if (res.ok) setCallbacks((list) => list.map((c) => (c.id === id ? res.data : c)));
    else setMessage(res.error);
  };

  const signOut = () => {
    storage.clear();
    setToken('');
    setInput('');
    setSignedIn(false);
  };

  return (
    <>
      <header className="admin-bar">
        <div className="wrap admin-bar__inner">
          <Logo tagline="bookings desk" />
          {signedIn && <button className="btn btn--ghost" type="button" onClick={signOut}>Sign out</button>}
        </div>
      </header>

      <main id="main" className="wrap admin-main">
        {!signedIn ? (
          <form
            className="panel admin-login"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const t = input.trim();
              setToken(t);
              load(t);
            }}
          >
            <h1>Sign in to the bookings desk</h1>
            <div className="field">
              <label htmlFor="token">Admin token</label>
              <input id="token" type="password" autoComplete="current-password" value={input} onChange={(e) => setInput(e.target.value)} />
            </div>
            {loginError && <p className="form-error" role="alert">{loginError}</p>}
            <button className="btn btn--primary" type="submit">Sign in</button>
            <p className="admin-hint">The token is ADMIN_TOKEN from the .env.local file.</p>
          </form>
        ) : (
          <>
            <section className="admin-stats" aria-label="Summary">
              {stats.map(([value, label]) => (
                <div className="stat" key={label}><b>{value}</b><span>{label}</span></div>
              ))}
            </section>

            <section aria-labelledby="bookings-title">
              <div className="admin-section-head">
                <h2 id="bookings-title">Bookings</h2>
                <div className="admin-tools">
                  <label className="inline-select">Status
                    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                      <option value="">All</option>
                      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <input className="admin-search" type="search" placeholder="Search name, email or reference" aria-label="Search bookings" value={query} onChange={(e) => setQuery(e.target.value)} />
                  <button className="btn btn--ghost" type="button" onClick={() => load(token)}>Refresh</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Driver</th>
                      <th scope="col">Car</th>
                      <th scope="col">Airport</th>
                      <th scope="col">Dates</th>
                      <th scope="col" className="num">Total</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((b) => (
                      <tr key={b.reference} className={b.status === 'cancelled' ? 'is-cancelled' : undefined}>
                        <td className="ref">{b.reference}<small>{stamp(b.createdAt)}</small></td>
                        <td>
                          {b.fullName}
                          <small><a href={`mailto:${b.email}`}>{b.email}</a></small>
                          <small><a href={tel(b.phone)}>{b.phone}</a></small>
                          {b.notes && <small>“{b.notes}”</small>}
                        </td>
                        <td>{carById(b.carId)?.name ?? b.carId}{b.extras.length > 0 && <small>+ {b.extras.join(', ')}</small>}</td>
                        <td>{b.locationId}</td>
                        <td>{niceDate(b.pickupDate)}, {b.pickupTime}<small>to {niceDate(b.returnDate)}, {b.quote.days} d</small></td>
                        <td className="num">{money(b.quote.total)}</td>
                        <td>
                          <select aria-label={`Status of ${b.reference}`} value={b.status} onChange={(e) => setStatus(b.reference, e.target.value as BookingStatus)}>
                            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </td>
                      </tr>
                    )) : (
                      <tr className="table-empty"><td colSpan={7}>{bookings.length ? 'No bookings match.' : 'No bookings yet. They appear here as soon as someone books on the site.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="callbacks-title">
              <div className="admin-section-head"><h2 id="callbacks-title">Call-back requests</h2></div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th scope="col">Called</th><th scope="col">Name</th><th scope="col">Phone</th><th scope="col">When</th><th scope="col">Received</th></tr>
                  </thead>
                  <tbody>
                    {callbacks.length ? callbacks.map((c) => (
                      <tr key={c.id} className={c.done ? 'is-done' : undefined}>
                        <td><input type="checkbox" checked={c.done} aria-label={`Mark ${c.name} as called`} onChange={(e) => setDone(c.id, e.target.checked)} /></td>
                        <td>{c.name}</td>
                        <td><a href={tel(c.phone)}>{c.phone}</a></td>
                        <td>{c.preferredTime}</td>
                        <td>{stamp(c.createdAt)}</td>
                      </tr>
                    )) : (
                      <tr className="table-empty"><td colSpan={5}>No call-back requests.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        <p className="form-status" role="status">{message}</p>
      </main>
    </>
  );
}
