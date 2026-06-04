# Online booking — setup notes

## Files

| File | Purpose |
|------|---------|
| `booking.html` | Public booking form |
| `assets/css/booking.css` | Form layout and mobile styles |
| `assets/js/booking-storage.js` | Booking persistence + Monday capacity logic |
| `assets/js/booking.js` | Validation, UI, email submit |
| `admin-bookings.html` | Staff booking list |
| `assets/js/admin-bookings.js` | Admin table + status updates |

## Email (FormSubmit)

Bookings are emailed to **fenianparktrading@gmail.com** via [FormSubmit](https://formsubmit.co).

1. Submit one booking after deploy to confirm email delivery.
2. Open the activation link sent to that inbox (first-time only).
3. Endpoint is configured in `assets/js/booking.js` as `BOOKING_EMAIL_ENDPOINT`.

To use a custom API instead, replace `sendBookingEmail()` in `booking.js` with your backend or Supabase edge function.

## Capacity (production)

Current static booking form requires backend/email integration before production booking storage is reliable. `booking-storage.js` keeps browser-local booking records until you connect a database.

For live multi-customer capacity:

1. Create a Supabase (or similar) `bookings` table matching the booking object fields.
2. Implement atomic capacity checks in SQL or an edge function (see comments in `booking-storage.js`).
3. Swap `createBooking`, `listBookings`, and `getMondayUsage` to async API calls.

Limits enforced in code:

- 3 complete bikes per Monday
- 10 loose suspension jobs per Monday (fork set = 1, shock = 1, forks+shock = 2)

## Admin

`admin-bookings.html` is intentionally simple. Restrict access in production (HTTP auth, private URL, or move to a real admin app).

## Booking sections

- **Suspension** — fixed workshop packages (see `booking.html`); wear parts extra
- **Engine rebuilds (MX/Enduro)** — quoted after inspection
- **Tyres** — order only; example A1 catalogue SKUs; fitting $30/tyre
- **Brake pad upsell** — checks and quote-first replacements only

## Pickup pricing (AUD)

- Complete bike: $20
- Loose forks: $10
- Loose shock: $10
- Loose forks + shock: $20 total
