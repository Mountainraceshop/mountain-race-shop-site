# Production booking storage

This branch adds a production Supabase persistence layer without pretending browser localStorage is reliable server storage.

## Setup

1. Create a Supabase project for Mountain Race Shop.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `assets/js/booking-config.example.js` to `assets/js/booking-config.js` and set the project URL and anon/publishable key.
4. Load `booking-config.js` and `production-booking-storage.js` before `booking.js` on the booking page.
5. Wire the existing booking submit routine to `await window.MRSProductionBookingStorage.createBooking(booking)` and only show the customer success state after it resolves.
6. Keep the existing localStorage adapter only as an admin/demo fallback; do not show a successful public submission when the remote write fails.

## Security

The public browser key is intentionally restricted by PostgreSQL row-level security. Anonymous visitors can INSERT a booking but cannot list/read/update customer bookings. Never expose a Supabase service-role key in this repository or browser JavaScript.

## Email notification

Database persistence should be enabled first. Notification email can then be sent from a Supabase Edge Function/database webhook or another server-side provider. Do not put private email-provider API keys in browser JavaScript.

## Required intake gate

Before production launch, ensure the public suspension path requires: bike make/model/year, rider weight, riding use, and a description of what the bike is doing. The AI/enquiry assistant may draft and triage; final diagnosis, non-standard pricing, parts authorisation and engineering decisions remain workshop decisions.
