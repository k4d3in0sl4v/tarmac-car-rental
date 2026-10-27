/* Tarmac Car Rental: page behaviour.
   Works with the Node API (server/index.js). If the API is unreachable
   (e.g. index.html opened straight from disk) the catalogue still renders
   from the fallback data below and booking asks people to call instead. */

(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const PHONE = '+1 234 567 8908';

  // Keep in sync with server/data/*.json (used only when the API is offline).
  const FALLBACK = {
    cars: [
      { id: 'economy', name: 'Economy', example: 'Hyundai i30 or similar', image: 'img/car-1.webp', seats: 4, suitcases: 2, doors: 5, transmission: ['automatic', 'manual'], airConditioning: true, pricePerDay: 39, description: 'Popular with budget travelers on short trips. Cheap to rent, easy to park and light on fuel.' },
      { id: 'luxury', name: 'Luxury', example: 'Toyota GR86 or similar', image: 'img/car-2.webp', seats: 5, suitcases: 2, doors: 2, transmission: ['automatic'], airConditioning: true, pricePerDay: 129, description: 'For business trips, anniversaries and other occasions when comfort and style matter as much as getting there.' },
      { id: 'convertible', name: 'Convertible', example: 'Audi A5 Cabriolet or similar', image: 'img/car-3.webp', seats: 4, suitcases: 2, doors: 2, transmission: ['automatic'], airConditioning: true, pricePerDay: 89, description: 'Roof down on the Pacific Coast Highway or the Florida Keys. Best for two people with light luggage.' },
      { id: 'suv', name: 'SUV', example: 'Ford Edge or similar', image: 'img/car-4.webp', seats: 5, suitcases: 3, doors: 4, transmission: ['automatic'], airConditioning: true, pricePerDay: 79, description: 'Room for the family and the camping gear. A safe pick for road trips to Disney World or the Grand Canyon.' },
      { id: 'van', name: 'Van / Minivan', example: 'Chrysler Pacifica or similar', image: 'img/car-5.webp', seats: 8, suitcases: 5, doors: 5, transmission: ['automatic'], airConditioning: true, pricePerDay: 99, description: 'Legroom and luggage space no other class offers. 7- and 8-seat minivans, larger passenger vans on request.' },
    ],
    extras: [
      { id: 'insurance', name: 'Full coverage, no deductible', pricePerDay: 19 },
      { id: 'driver', name: 'Additional driver', pricePerDay: 12 },
      { id: 'childSeat', name: 'Child seat', pricePerDay: 9 },
      { id: 'gps', name: 'GPS navigator', pricePerDay: 7 },
    ],
    locations: [
      { id: 'LAX', name: 'Los Angeles International Airport (LAX)' },
      { id: 'SFO', name: 'San Francisco International Airport (SFO)' },
      { id: 'LAS', name: 'Harry Reid International Airport (LAS)' },
      { id: 'JFK', name: 'John F. Kennedy International Airport (JFK)' },
      { id: 'ORD', name: "O'Hare International Airport (ORD)" },
      { id: 'MCO', name: 'Orlando International Airport (MCO)' },
      { id: 'MIA', name: 'Miami International Airport (MIA)' },
    ],
  };

  const MAX_DAYS = 30;

  const state = {
    cars: FALLBACK.cars,
    extras: FALLBACK.extras,
    locations: FALLBACK.locations,
    apiOnline: false,
    trip: null,            // { locationId, pickupDate, returnDate } after a search
    availability: null,    // { carId: { available, unitsLeft, quote } } for state.trip
    filter: { carId: '', seats: 0, sort: 'price' },
    highlight: '',
    bookingCar: null,
  };

  // ---------- small helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (iso, n) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  };
  const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
  const niceDate = (iso) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const carById = (id) => state.cars.find((c) => c.id === id);
  const locationName = (id) => state.locations.find((l) => l.id === id)?.name || id;
  // "Los Angeles (LAX)": short names come from the search form's options
  const shortLocation = (id) => document.querySelector(`#s-location option[value="${id}"]`)?.textContent || locationName(id);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  class OfflineError extends Error {}

  async function api(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new OfflineError();
    }
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new OfflineError();
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  function setFieldErrors(form, prefix, fields = {}) {
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    $$('.field__error', form).forEach((el) => (el.textContent = ''));
    let first = null;
    for (const [name, message] of Object.entries(fields)) {
      const input = form.elements[name];
      const err = $(`#${prefix}-${name}-error`);
      if (err) err.textContent = message;
      if (input && input.setAttribute) {
        input.setAttribute('aria-invalid', 'true');
        if (err) input.setAttribute('aria-describedby', err.id);
        first ||= input;
      }
    }
    first?.focus();
  }

  // Typing into a field clears its error message.
  function clearFieldError(input) {
    if (!input?.hasAttribute?.('aria-invalid')) return;
    input.removeAttribute('aria-invalid');
    const id = input.getAttribute('aria-describedby');
    if (id) document.getElementById(id).textContent = '';
  }

  // ---------- header ----------
  function initHeader() {
    const header = $('.site-header');
    const toggle = $('.nav-toggle');
    const nav = $('#site-nav');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    $('#year').textContent = new Date().getFullYear();
  }

  // ---------- hero: line-up + search ----------
  function renderLineup() {
    const lineup = $('#lineup');
    lineup.innerHTML = state.cars
      .map(
        (car) => `
        <button type="button" class="lineup-car" data-car="${car.id}" aria-pressed="false">
          <img src="${car.image}" alt="" width="490" height="190">
          <span class="lineup-car__label"><b>${escapeHtml(car.name)}</b><span>from ${money(car.pricePerDay)}</span></span>
          <span class="sr-only">, from ${money(car.pricePerDay)} a day</span>
        </button>`
      )
      .join('');
    lineup.addEventListener('click', (e) => {
      const btn = e.target.closest('.lineup-car');
      if (!btn) return;
      const id = btn.dataset.car;
      const next = btn.getAttribute('aria-pressed') === 'true' ? '' : id;
      $('#s-class').value = next;
      syncClass(next);
    });
  }

  function syncClass(carId) {
    $$('.lineup-car').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.car === carId)));
    state.filter.carId = carId;
    $$('#class-chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.class === carId)));
    renderFleet();
  }

  function initSearch() {
    const form = $('#search-form');
    const pickup = $('#s-pickup');
    const ret = $('#s-return');
    const today = isoDate(new Date());
    pickup.min = today;
    pickup.value = addDays(today, 1);
    ret.min = addDays(pickup.value, 1);
    ret.value = addDays(pickup.value, 4);

    pickup.addEventListener('change', () => {
      if (!pickup.value) return;
      ret.min = addDays(pickup.value, 1);
      if (!ret.value || ret.value <= pickup.value) ret.value = addDays(pickup.value, 3);
    });
    $('#s-class').addEventListener('change', (e) => syncClass(e.target.value));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('.search__error', form);
      const trip = {
        locationId: form.elements.locationId.value,
        pickupDate: pickup.value,
        returnDate: ret.value,
      };
      const problem = checkDates(trip.pickupDate, trip.returnDate);
      err.hidden = !problem;
      err.textContent = problem || '';
      if (problem) return;

      state.trip = trip;
      state.highlight = form.elements.carId.value;
      const submit = $('.search__submit', form);
      submit.disabled = true;
      await loadAvailability();
      submit.disabled = false;
      renderFleet();
      $('#fleet').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  function checkDates(pickupDate, returnDate) {
    if (!pickupDate || !returnDate) return 'Choose pick-up and return dates.';
    if (pickupDate < isoDate(new Date())) return 'Pick-up date is in the past.';
    const days = daysBetween(pickupDate, returnDate);
    if (days < 1) return 'Return date must be at least one day after pick-up.';
    if (days > MAX_DAYS) return `Online bookings are up to ${MAX_DAYS} days. Call us at ${PHONE} for longer rentals.`;
    return '';
  }

  async function loadAvailability() {
    state.availability = null;
    if (!state.trip || !state.apiOnline) return;
    const q = new URLSearchParams(state.trip);
    try {
      const { ok, data } = await api(`/api/cars?${q}`);
      if (ok) state.availability = Object.fromEntries(data.map((c) => [c.id, c]));
    } catch {
      /* keep plain prices */
    }
  }

  // ---------- fleet ----------
  function initFleet() {
    $('#class-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $('#s-class').value = chip.dataset.class;
      syncClass(chip.dataset.class);
    });
    $('#f-seats').addEventListener('change', (e) => {
      state.filter.seats = Number(e.target.value);
      renderFleet();
    });
    $('#f-sort').addEventListener('change', (e) => {
      state.filter.sort = e.target.value;
      renderFleet();
    });
    $('#car-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-book]');
      if (btn) openBooking(btn.dataset.book);
    });
  }

  function priceFor(car) {
    if (state.trip) {
      const days = daysBetween(state.trip.pickupDate, state.trip.returnDate);
      return { days, total: car.pricePerDay * days };
    }
    return null;
  }

  function renderFleet() {
    const { carId, seats, sort } = state.filter;
    let list = state.cars.filter((c) => (!carId || c.id === carId) && c.seats >= seats);
    list.sort(sort === 'seats' ? (a, b) => b.seats - a.seats || a.pricePerDay - b.pricePerDay : (a, b) => a.pricePerDay - b.pricePerDay);

    const status = $('#fleet-status');
    if (state.trip) {
      const days = daysBetween(state.trip.pickupDate, state.trip.returnDate);
      status.innerHTML = `Prices for <strong>${escapeHtml(shortLocation(state.trip.locationId))}</strong>, ${niceDate(state.trip.pickupDate)} to ${niceDate(state.trip.returnDate)}, <strong>${days} day${days === 1 ? '' : 's'}</strong>.`;
    } else {
      status.textContent = 'Pick dates above to see the total for your trip.';
    }

    const container = $('#car-list');
    if (!list.length) {
      container.innerHTML = `<p class="empty">No cars match these filters. <button type="button" class="link-button" id="reset-filters">Show all cars</button></p>`;
      $('#reset-filters').addEventListener('click', () => {
        $('#f-seats').value = '0';
        state.filter.seats = 0;
        $('#s-class').value = '';
        syncClass('');
      });
      return;
    }

    container.innerHTML = list
      .map((car) => {
        const avail = state.availability?.[car.id];
        const unavailable = avail && !avail.available;
        const p = priceFor(car);
        const transmission = car.transmission.length > 1 ? 'Automatic or manual' : 'Automatic';
        let priceExtra = '';
        if (p) priceExtra += `<p class="car__total">${money(avail?.quote?.total ?? p.total)} for ${p.days} day${p.days === 1 ? '' : 's'}</p>`;
        if (unavailable) priceExtra += `<p class="car__left">Booked out for these dates</p>`;
        else if (avail && avail.unitsLeft <= 2) priceExtra += `<p class="car__left">${avail.unitsLeft} left at ${escapeHtml(state.trip.locationId)}</p>`;

        return `
        <article class="car${unavailable ? ' is-unavailable' : ''}${state.highlight === car.id ? ' is-highlight' : ''}" id="car-${car.id}">
          <div class="car__stage"><img src="${car.image}" alt="${escapeHtml(car.name)} class car, side view" width="490" height="190" loading="lazy"></div>
          <div class="car__body">
            <h3 class="car__name">${escapeHtml(car.name)}</h3>
            <p class="car__example">${escapeHtml(car.example)}</p>
            <ul class="car__specs">
              <li><svg aria-hidden="true"><use href="#i-seat"/></svg>${car.seats} seats</li>
              <li><svg aria-hidden="true"><use href="#i-bag"/></svg>${car.suitcases} suitcases</li>
              <li><svg aria-hidden="true"><use href="#i-door"/></svg>${car.doors} doors</li>
              <li><svg aria-hidden="true"><use href="#i-gear"/></svg>${transmission}</li>
              ${car.airConditioning ? '<li><svg aria-hidden="true"><use href="#i-snow"/></svg>Air conditioning</li>' : ''}
            </ul>
            <p class="car__desc">${escapeHtml(car.description)}</p>
          </div>
          <div class="car__price">
            <p class="car__rate"><strong>${money(car.pricePerDay)}</strong> a day</p>
            ${priceExtra}
            <button type="button" class="btn btn--primary" data-book="${car.id}" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Not available' : `Book ${escapeHtml(car.name)}`}</button>
          </div>
        </article>`;
      })
      .join('');
  }

  // ---------- dialogs ----------
  function initDialogs() {
    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
      });
    });
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open="manage"]');
      if (opener) openManage();
    });
  }

  // ---------- booking ----------
  function initBooking() {
    const form = $('#booking-form');
    $('#b-location').innerHTML = state.locations.map((l) => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('');
    const times = [];
    for (let h = 6; h <= 22; h++) for (const m of ['00', '30']) times.push(`${pad(h)}:${m}`);
    $('#b-time').innerHTML = times.map((t) => `<option ${t === '10:00' ? 'selected' : ''}>${t}</option>`).join('');
    $('#b-extras').innerHTML = state.extras
      .map(
        (x) => `<label class="extra"><input type="checkbox" name="extras" value="${x.id}"><span>${escapeHtml(x.name)}</span><small>${money(x.pricePerDay)} / day</small></label>`
      )
      .join('');

    const pickup = $('#b-pickup');
    const ret = $('#b-return');
    pickup.min = isoDate(new Date());
    pickup.addEventListener('change', () => {
      ret.min = addDays(pickup.value, 1);
      if (!ret.value || ret.value <= pickup.value) ret.value = addDays(pickup.value, 3);
    });
    form.addEventListener('input', (e) => {
      clearFieldError(e.target);
      updateSummary();
    });
    form.addEventListener('change', updateSummary);
    form.addEventListener('submit', submitBooking);

    $('#done-copy').addEventListener('click', async () => {
      const ref = $('#done-ref').textContent;
      try {
        await navigator.clipboard.writeText(ref);
        toast(`Copied ${ref}`);
      } catch {
        toast('Select the reference and copy it manually.');
      }
    });
  }

  function openBooking(carId) {
    const car = carById(carId);
    if (!car) return;
    state.bookingCar = car;
    const form = $('#booking-form');
    form.hidden = false;
    $('#booking-done').hidden = true;
    $('#bk-error').hidden = true;
    setFieldErrors(form, 'b');

    $('#bk-image').src = car.image;
    $('#bk-title').textContent = `Book ${car.name}`;
    $('#bk-example').textContent = `${car.example}, ${money(car.pricePerDay)} a day`;
    $('#bk-submit').textContent = `Book ${car.name}`;

    const search = $('#search-form');
    const trip = state.trip || {
      locationId: search.elements.locationId.value,
      pickupDate: search.elements.pickupDate.value,
      returnDate: search.elements.returnDate.value,
    };
    form.elements.locationId.value = trip.locationId;
    form.elements.pickupDate.value = trip.pickupDate;
    form.elements.returnDate.value = trip.returnDate;
    $('#b-return').min = addDays(trip.pickupDate || isoDate(new Date()), 1);

    updateSummary();
    $('#booking-dialog').showModal();
  }

  function readBookingForm() {
    const form = $('#booking-form');
    const f = form.elements;
    return {
      carId: state.bookingCar.id,
      locationId: f.locationId.value,
      pickupDate: f.pickupDate.value,
      pickupTime: f.pickupTime.value,
      returnDate: f.returnDate.value,
      extras: $$('input[name="extras"]:checked', form).map((i) => i.value),
      fullName: f.fullName.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      notes: f.notes.value.trim(),
      driverAge21: f.driverAge21.checked,
      website: f.website.value,
    };
  }

  function updateSummary() {
    const car = state.bookingCar;
    if (!car) return;
    const b = readBookingForm();
    const days = b.pickupDate && b.returnDate ? daysBetween(b.pickupDate, b.returnDate) : 0;
    const lines = $('#bk-lines');
    if (days < 1) {
      lines.innerHTML = `<li><span>${escapeHtml(car.name)}</span><span>${money(car.pricePerDay)} / day</span></li>`;
      $('#bk-total').textContent = '—';
      $('#bk-note').textContent = 'Choose dates to see the total.';
      return;
    }
    const rows = [[`${car.name} × ${days} day${days === 1 ? '' : 's'}`, car.pricePerDay * days]];
    for (const x of state.extras) if (b.extras.includes(x.id)) rows.push([`${x.name} × ${days}`, x.pricePerDay * days]);
    lines.innerHTML = rows.map(([n, a]) => `<li><span>${escapeHtml(n)}</span><span>${money(a)}</span></li>`).join('');
    $('#bk-total').textContent = money(rows.reduce((s, r) => s + r[1], 0));

    const until = new Date(`${b.pickupDate}T${b.pickupTime}:00`);
    until.setHours(until.getHours() - 24);
    const untilText = until.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    $('#bk-note').textContent = `Taxes and airport fees included. Pay at pick-up. Free cancellation until ${untilText}.`;
  }

  function validateBookingClient(b) {
    const errors = {};
    const dateProblem = checkDates(b.pickupDate, b.returnDate);
    if (dateProblem) errors[dateProblem.startsWith('Return') || dateProblem.startsWith('Online') ? 'returnDate' : 'pickupDate'] = dateProblem;
    if (b.fullName.length < 2) errors.fullName = 'Enter the driver’s full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email)) errors.email = 'Enter a valid email address.';
    if (!/^\+?[0-9 ()\-.]{7,20}$/.test(b.phone)) errors.phone = 'Enter a phone number with country code, e.g. +1 234 567 8908.';
    if (!b.driverAge21) errors.driverAge21 = 'The main driver must be 21 or older.';
    return errors;
  }

  async function submitBooking(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const errorBox = $('#bk-error');
    errorBox.hidden = true;
    const b = readBookingForm();
    const errors = validateBookingClient(b);
    setFieldErrors(form, 'b', errors);
    if (Object.keys(errors).length) return;

    const submit = $('#bk-submit');
    submit.disabled = true;
    submit.textContent = 'Booking…';
    try {
      const { ok, status, data } = await api('/api/bookings', { method: 'POST', body: b });
      if (ok) return showConfirmation(data);
      if (status === 400 && data.fields) setFieldErrors(form, 'b', data.fields);
      else {
        errorBox.textContent = data.error || 'Booking failed. Try again or call us.';
        errorBox.hidden = false;
      }
    } catch (err) {
      errorBox.textContent = `Online booking isn’t available right now. Call us at ${PHONE} and we’ll book this car for you.`;
      errorBox.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = `Book ${state.bookingCar.name}`;
    }
  }

  function showConfirmation(booking) {
    $('#booking-form').hidden = true;
    const done = $('#booking-done');
    done.hidden = false;
    $('#done-ref').textContent = booking.reference;
    $('#done-facts').innerHTML = [
      ['Car', booking.carName],
      ['Pick-up', `${niceDate(booking.pickupDate)}, ${booking.pickupTime}`],
      ['Return', niceDate(booking.returnDate)],
      ['Airport', shortLocation(booking.locationId)],
      ['Total', money(booking.quote.total)],
    ]
      .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`)
      .join('');
    done.focus();
    $('#booking-form').reset();
    if (state.trip) loadAvailability().then(renderFleet);
  }

  // ---------- manage booking ----------
  function openManage() {
    $('#mg-error').hidden = true;
    $('#manage-result').hidden = true;
    $('#manage-dialog').showModal();
  }

  function initManage() {
    const form = $('#manage-form');
    const result = $('#manage-result');
    const errorBox = $('#mg-error');
    let current = null;

    const render = (b) => {
      current = b;
      result.hidden = false;
      result.innerHTML = `
        <p><span class="status-badge status-badge--${b.status}">${b.status === 'confirmed' ? 'Confirmed' : b.status === 'cancelled' ? 'Cancelled' : b.status === 'picked-up' ? 'Picked up' : 'Returned'}</span></p>
        <dl>
          <dt>Reference</dt><dd>${escapeHtml(b.reference)}</dd>
          <dt>Driver</dt><dd>${escapeHtml(b.fullName)}</dd>
          <dt>Car</dt><dd>${escapeHtml(b.carName)}</dd>
          <dt>Airport</dt><dd>${escapeHtml(shortLocation(b.locationId))}</dd>
          <dt>Pick-up</dt><dd>${niceDate(b.pickupDate)}, ${escapeHtml(b.pickupTime)}</dd>
          <dt>Return</dt><dd>${niceDate(b.returnDate)}</dd>
          <dt>Total</dt><dd>${money(b.quote.total)}</dd>
        </dl>
        ${b.canCancel ? '<button type="button" class="btn btn--ghost btn--block" data-cancel>Cancel booking</button>' : ''}
        ${b.status === 'confirmed' && !b.canCancel ? `<p class="summary__note">Free cancellation has ended. Call us at ${PHONE} to change this booking.</p>` : ''}`;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const ref = form.elements.reference.value.trim().toUpperCase();
      const email = form.elements.email.value.trim();
      if (!ref || !email) {
        errorBox.textContent = 'Enter the booking reference and the email you booked with.';
        errorBox.hidden = false;
        return;
      }
      try {
        const { ok, data } = await api(`/api/bookings/${encodeURIComponent(ref)}?email=${encodeURIComponent(email)}`);
        if (ok) render(data);
        else {
          result.hidden = true;
          errorBox.textContent = data.error;
          errorBox.hidden = false;
        }
      } catch {
        errorBox.textContent = `Booking lookup isn’t available right now. Call us at ${PHONE}.`;
        errorBox.hidden = false;
      }
    });

    // two-step cancel: first click asks, second click cancels
    result.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-cancel]');
      if (!btn || !current) return;
      if (!btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.className = 'btn btn--danger btn--block';
        btn.textContent = 'Yes, cancel this booking';
        return;
      }
      btn.disabled = true;
      try {
        const { ok, data } = await api(`/api/bookings/${current.reference}/cancel`, {
          method: 'POST',
          body: { email: form.elements.email.value.trim() },
        });
        if (ok) {
          render(data);
          toast(`Booking ${data.reference} cancelled`);
          if (state.trip) loadAvailability().then(renderFleet);
        } else {
          errorBox.textContent = data.error;
          errorBox.hidden = false;
          btn.disabled = false;
        }
      } catch {
        errorBox.textContent = `Cancellation isn’t available right now. Call us at ${PHONE}.`;
        errorBox.hidden = false;
        btn.disabled = false;
      }
    });
  }

  // ---------- callback ----------
  function initCallback() {
    const form = $('#callback-form');
    form.addEventListener('input', (e) => clearFieldError(e.target));
    const status = $('.form-status', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        preferredTime: form.elements.preferredTime.value,
        website: form.elements.website.value,
      };
      const errors = {};
      if (body.name.length < 2) errors.name = 'Enter your name.';
      if (!/^\+?[0-9 ()\-.]{7,20}$/.test(body.phone)) errors.phone = 'Enter a phone number with country code.';
      setFieldErrors(form, 'c', errors);
      if (Object.keys(errors).length) return;

      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      status.textContent = '';
      try {
        const { ok, data } = await api('/api/callbacks', { method: 'POST', body });
        if (ok) {
          form.classList.add('is-sent');
          status.textContent = `Request sent. We’ll call ${body.phone} ${body.preferredTime === 'Any time' ? 'soon' : `in the ${body.preferredTime.toLowerCase()}`}.`;
        } else if (data.fields) setFieldErrors(form, 'c', data.fields);
        else status.textContent = data.error;
      } catch {
        status.textContent = `We couldn’t send the request. Call us at ${PHONE}.`;
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- start ----------
  async function loadCatalogue() {
    try {
      const [cars, extras, locations] = await Promise.all([api('/api/cars'), api('/api/extras'), api('/api/locations')]);
      if (cars.ok && extras.ok && locations.ok) {
        state.cars = cars.data;
        state.extras = extras.data;
        state.locations = locations.data;
        state.apiOnline = true;
      }
    } catch {
      state.apiOnline = false;
    }
  }

  initHeader();
  renderLineup();
  initSearch();
  initFleet();
  renderFleet();
  initDialogs();
  initManage();
  initCallback();

  initBooking();

  loadCatalogue().then(renderFleet);
})();
