// Formatting and date helpers used across pages.

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as "YYYY-MM-DD". */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** "Thu, Oct 29" */
export const niceDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Default trip: pick up in two days, return four days later. */
export function defaultDates() {
  const today = isoDate(new Date());
  const pickupDate = addDays(today, 2);
  return { pickupDate, returnDate: addDays(pickupDate, 4) };
}

export const pickupTimes = (() => {
  const times: string[] = [];
  for (let h = 6; h <= 22; h++) for (const m of ['00', '30']) times.push(`${pad(h)}:${m}`);
  return times;
})();
