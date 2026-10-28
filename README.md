# Tarmac — car rental website (Next.js)

A Next.js 15 (App Router, TypeScript) car rental site for travelers picking up cars at US airports. Visitors search by airport and dates, compare classes with live prices and availability, book online and manage or cancel their booking themselves. Staff work from a separate bookings desk.

The back end lives in the same app as Next.js route handlers, so there is nothing else to deploy.

## Run

```bash
npm install
cp .env.example .env.local   # set ADMIN_TOKEN
npm run dev
```

Open http://localhost:3000. The bookings desk is at http://localhost:3000/admin.

For production: `npm run build` and `npm start`.

## Routes

| Page                  | Route                            | File                                          |
| --------------------- | -------------------------------- | --------------------------------------------- |
| Home                  | `/`                              | `app/(site)/page.tsx`                         |
| Cars and prices       | `/cars`                          | `app/(site)/cars/page.tsx`                    |
| Car class             | `/cars/[id]`                     | `app/(site)/cars/[id]/page.tsx`               |
| Booking form          | `/book?car=…`                    | `app/(site)/book/page.tsx`                    |
| Booking confirmed     | `/booking/confirmed?ref=…`       | `app/(site)/booking/confirmed/page.tsx`       |
| Manage booking        | `/manage`                        | `app/(site)/manage/page.tsx`                  |
| Help and contact      | `/help`                          | `app/(site)/help/page.tsx`                    |
| Bookings desk (staff) | `/admin`                         | `app/admin/page.tsx` (own header)             |
| 404                   | any unknown URL                  | `app/not-found.tsx`                           |

## API

Route handlers in `app/api/`. Prices are always calculated on the server; any price sent by the browser is ignored.

| Method    | Route                                         | What it does                                                        |
| --------- | --------------------------------------------- | ------------------------------------------------------------------- |
| GET       | `/api/cars`                                   | Catalogue; with `?locationId=&pickupDate=&returnDate=` adds availability and the trip total |
| GET       | `/api/locations`, `/api/extras`               | Pick-up airports, extras                                            |
| POST      | `/api/quote`                                  | Price breakdown for a trip                                          |
| POST      | `/api/bookings`                               | Creates a booking and returns its reference (`TM-XXXXXX`)           |
| GET       | `/api/bookings/[reference]?email=`            | A customer looks up their own booking                               |
| POST      | `/api/bookings/[reference]/cancel`            | Free cancellation until 24 hours before pick-up                     |
| POST      | `/api/callbacks`                              | “Call me back” request                                              |
| GET/PATCH | `/api/admin/bookings`, `/api/admin/callbacks` | Bookings desk; needs `Authorization: Bearer <ADMIN_TOKEN>`          |

## Structure

- `app/globals.css` — design tokens (colours, type scale, gutter) and the shared classes: buttons, form fields, chips, panels, tables.
- `app/(site)/layout.tsx` — wraps every customer page in `Header` + `Footer`. The bookings desk sits outside this group because it has its own header.
- `components/` — `Header`, `Footer`, `TripSearch`, `Lineup` (the cars on the road in the hero), `CarSpecs`, `ClassCard`, `CallbackForm`, `Faq`; feature folders `home/`, `fleet/`, `booking/` and `admin/`.
- `lib/data.ts` — car classes, airports, extras and FAQ.
- `lib/pricing.ts` — rental days, price breakdown and availability. Used by the booking form for the live total and by the API for the final price, so the two always match.
- `lib/validate.ts` — field validation shared by the forms and the API.
- `lib/store.ts` — bookings and call-back requests in a JSON file (`storage/db.json`) with atomic writes. The route handlers only use its functions, so it can be swapped for SQLite or PostgreSQL without touching anything else.
- `lib/server.ts` — API helpers: JSON responses, rate limiting, honeypot check, admin auth.
- Font: Overpass via `next/font/google`. It is based on Highway Gothic, the lettering of US road signs.

## Security

Server-side validation of every field, rate limiting per IP, a honeypot field against bots, a 10 KB request limit, security headers (`next.config.ts`), constant-time admin token comparison. Customers can only see a booking when they know both its reference and the email it was made with.

## Configuration

| Variable      | Purpose                                                       |
| ------------- | ------------------------------------------------------------- |
| `ADMIN_TOKEN` | Sign-in token for `/admin`. The bookings desk is off without it. |
| `DB_FILE`     | Where bookings are stored. Default: `storage/db.json`.        |
| `TRUST_PROXY` | Set to `1` behind a reverse proxy so rate limiting sees real client IPs. |

## Stack

Next.js 15, React 19, TypeScript, CSS
