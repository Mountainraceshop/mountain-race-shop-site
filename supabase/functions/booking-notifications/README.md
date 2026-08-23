# Booking notifications Edge Function

Deploy this function after the database migration.

Required Supabase Function secrets:

- `RESEND_API_KEY`
- `MRS_BOOKING_FROM_EMAIL` — a verified Resend sender, for example `bookings@mountainraceshop.com.au`
- `MRS_BOOKING_TO_EMAIL` — the workshop inbox Craig monitors

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase to deployed Edge Functions.

Deploy with JWT verification enabled. The browser invokes the function only after the database has returned a valid booking reference.
