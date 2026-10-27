/* Bookings desk: lists bookings and call-back requests, lets staff change status. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const stamp = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const CAR_NAMES = { economy: 'Economy', luxury: 'Luxury', convertible: 'Convertible', suv: 'SUV', van: 'Van / Minivan' };
  const STATUSES = [['confirmed', 'Confirmed'], ['picked-up', 'Picked up'], ['returned', 'Returned'], ['cancelled', 'Cancelled']];

  // The token lives only for this browser tab.
  const storage = {
    get: () => { try { return sessionStorage.getItem('adminToken') || ''; } catch { return ''; } },
    set: (v) => { try { sessionStorage.setItem('adminToken', v); } catch { /* private mode */ } },
    clear: () => { try { sessionStorage.removeItem('adminToken'); } catch { /* ignore */ } },
  };
  let token = storage.get();
  let bookings = [];

  async function call(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw Object.assign(new Error(data.error || 'Wrong admin token.'), { auth: true });
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  }

  function showDesk(show) {
    $('#login').hidden = show;
    $('#desk').hidden = !show;
    $('#logout').hidden = !show;
  }

  function renderStats() {
    const active = bookings.filter((b) => b.status !== 'cancelled');
    const today = new Date().toISOString().slice(0, 10);
    const pickupsToday = active.filter((b) => b.pickupDate === today && b.status === 'confirmed').length;
    const revenue = active.reduce((s, b) => s + b.quote.total, 0);
    $('#stats').innerHTML = [
      [active.length, 'active bookings'],
      [pickupsToday, 'pick-ups today'],
      [money(revenue), 'booked value'],
      [bookings.length - active.length, 'cancelled'],
    ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  }

  function renderBookings() {
    const status = $('#status-filter').value;
    const q = $('#search').value.trim().toLowerCase();
    const rows = bookings.filter(
      (b) =>
        (!status || b.status === status) &&
        (!q || [b.reference, b.fullName, b.email, b.phone].some((v) => String(v).toLowerCase().includes(q)))
    );
    $('#bookings').innerHTML = rows.length
      ? rows.map((b) => `
        <tr class="${b.status === 'cancelled' ? 'is-cancelled' : ''}">
          <td class="mono">${esc(b.reference)}<small>${stamp(b.createdAt)}</small></td>
          <td>${esc(b.fullName)}<small><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></small><small><a href="tel:${esc(b.phone.replace(/[^+\d]/g, ''))}">${esc(b.phone)}</a></small>${b.notes ? `<small>“${esc(b.notes)}”</small>` : ''}</td>
          <td>${esc(CAR_NAMES[b.carId] || b.carId)}${b.extras.length ? `<small>+ ${esc(b.extras.join(', '))}</small>` : ''}</td>
          <td>${esc(b.locationId)}</td>
          <td>${day(b.pickupDate)}, ${esc(b.pickupTime)}<small>to ${day(b.returnDate)}, ${b.quote.days} d</small></td>
          <td class="num">${money(b.quote.total)}</td>
          <td><select data-ref="${esc(b.reference)}" aria-label="Status of ${esc(b.reference)}">
            ${STATUSES.map(([v, l]) => `<option value="${v}" ${v === b.status ? 'selected' : ''}>${l}</option>`).join('')}
          </select></td>
        </tr>`).join('')
      : `<tr class="table-empty"><td colspan="7">${bookings.length ? 'No bookings match.' : 'No bookings yet. They appear here as soon as someone books on the site.'}</td></tr>`;
  }

  function renderCallbacks(list) {
    $('#callbacks').innerHTML = list.length
      ? list.map((c) => `
        <tr class="${c.done ? 'is-done' : ''}">
          <td><input type="checkbox" data-id="${esc(c.id)}" ${c.done ? 'checked' : ''} aria-label="Mark ${esc(c.name)} as called"></td>
          <td>${esc(c.name)}</td>
          <td><a href="tel:${esc(c.phone.replace(/[^+\d]/g, ''))}">${esc(c.phone)}</a></td>
          <td>${esc(c.preferredTime)}</td>
          <td>${stamp(c.createdAt)}</td>
        </tr>`).join('')
      : '<tr class="table-empty"><td colspan="5">No call-back requests.</td></tr>';
  }

  async function load() {
    try {
      const [b, c] = await Promise.all([call('/api/admin/bookings'), call('/api/admin/callbacks')]);
      bookings = b;
      showDesk(true);
      renderStats();
      renderBookings();
      renderCallbacks(c);
    } catch (err) {
      if (err.auth) {
        storage.clear();
        token = '';
        showDesk(false);
        if ($('#token').value) {
          $('#login-error').textContent = err.message;
          $('#login-error').hidden = false;
        }
      } else toast(err.message);
    }
  }

  $('#login').addEventListener('submit', (e) => {
    e.preventDefault();
    $('#login-error').hidden = true;
    token = $('#token').value.trim();
    storage.set(token);
    load();
  });
  $('#logout').addEventListener('click', () => {
    storage.clear();
    token = '';
    $('#token').value = '';
    showDesk(false);
  });
  $('#refresh').addEventListener('click', load);
  $('#status-filter').addEventListener('change', renderBookings);
  $('#search').addEventListener('input', renderBookings);

  $('#bookings').addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-ref]');
    if (!sel) return;
    try {
      const updated = await call(`/api/admin/bookings/${sel.dataset.ref}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
      bookings = bookings.map((b) => (b.reference === updated.reference ? updated : b));
      renderStats();
      renderBookings();
      toast(`${updated.reference}: ${sel.selectedOptions[0]?.textContent || updated.status}`);
    } catch (err) {
      toast(err.message);
      load();
    }
  });

  $('#callbacks').addEventListener('change', async (e) => {
    const box = e.target.closest('input[data-id]');
    if (!box) return;
    try {
      await call(`/api/admin/callbacks/${box.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ done: box.checked }) });
      box.closest('tr').classList.toggle('is-done', box.checked);
    } catch (err) {
      toast(err.message);
      box.checked = !box.checked;
    }
  });

  if (token) load();
  else showDesk(false);
})();
