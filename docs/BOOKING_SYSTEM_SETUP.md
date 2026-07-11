# Mountain Race Shop production booking system

This branch replaces browser-only booking capacity with a shared Supabase database. The existing booking form, service pricing and Canberra pickup rules remain in place.

## What this change fixes

- Every customer sees the same Monday pickup capacity.
- The final bike or loose-suspension position is reserved in one database transaction.
- Two customers cannot successfully take the same final position.
- Workshop bookings are visible from any authorised device.
- The administration page requires an authorised Supabase login.
- Canberra pickup dates can be blocked or reopened without editing code.
- UTM advertising source, medium and campaign are stored with each booking.
- Workshop and customer acknowledgement emails can be sent by a Supabase Edge Function.

## Information Craig must supply before deployment

1. The email address that should receive every new booking.
2. The email address Craig wants to use for the protected workshop login.
3. A Supabase project URL and public anon key.
4. A verified email sender/domain for Resend, such as `bookings@mountainraceshop.com.au`.
5. A Meta Pixel ID only when Facebook conversion tracking is ready. It can remain blank initially.

Never place the Supabase service-role key or Resend API key in website JavaScript.

## Step 1 — create the Supabase project

1. Sign in to Supabase.
2. Create a new project named `mountain-race-shop-bookings`.
3. Save the database password somewhere secure.
4. Open **SQL Editor**.
5. Copy and run:

   `supabase/migrations/20260712_production_booking_system.sql`

The migration creates the bookings table, pickup-date settings, administrator permissions and the atomic capacity functions.

## Step 2 — create Craig's administrator login

1. In Supabase, open **Authentication → Users**.
2. Create the workshop administrator user using Craig's chosen email and a strong password.
3. Copy that user's UUID.
4. In **SQL Editor**, run:

```sql
insert into public.workshop_admin_users (user_id, email)
values ('PASTE-THE-AUTH-USER-UUID-HERE', 'CRAIGS-LOGIN-EMAIL-HERE');
```

Only users listed in `workshop_admin_users` can view or alter bookings.

## Step 3 — connect the website

Open:

`assets/js/supabase-config.js`

Fill in:

```js
url: "https://YOUR-PROJECT.supabase.co",
anonKey: "YOUR-PUBLIC-ANON-KEY",
```

The public anon key is designed for browser use. Do not use the service-role key.

Set `contactEmail` to the address customers should see on the booking page.

## Step 4 — deploy booking emails

The Edge Function is located at:

`supabase/functions/booking-notifications/index.ts`

Set these function secrets:

- `RESEND_API_KEY`
- `MRS_BOOKING_FROM_EMAIL`
- `MRS_BOOKING_TO_EMAIL`

Deploy the function with JWT verification enabled.

A booking is still saved if the email provider is temporarily unavailable. The browser logs the notification error without deleting the booking.

## Step 5 — test on the branch before merging

Use a staging or branch preview, not the live main branch.

### Essential customer tests

- Submit an ordinary off-bike fork service.
- Submit forks and shock together.
- Submit a complete-bike Canberra pickup.
- Submit loose forks and shock pickup and confirm it consumes two loose positions.
- Fill one Monday to three complete bikes and confirm a fourth bike is rejected.
- Fill one Monday to ten loose positions and confirm the next loose job is rejected.
- Open the form in two separate browsers and submit for the final position at nearly the same time. Only one must succeed.
- Cancel a booking in the admin page and confirm its capacity becomes available again.
- Mark a Monday `workshop_closed` and confirm customers cannot select it.
- Disconnect the network during submission and confirm no success message appears.

### Essential administration tests

- Unauthenticated visitors cannot see bookings.
- A valid but unlisted Supabase user cannot see bookings.
- Craig can sign in, view bookings, change status and save internal notes.
- Craig can block and reopen a Canberra pickup date.
- Exported JSON contains the central bookings.

### Advertising tracking tests

Open the booking page with:

`?utm_source=facebook&utm_medium=paid_social&utm_campaign=canberra_pickup`

Submit a test booking and confirm those values appear in the admin page and database.

## Deployment rule

Do not merge this branch until:

- Supabase is configured;
- Craig's administrator account works;
- the capacity tests pass;
- the workshop notification email arrives;
- a customer acknowledgement email arrives;
- mobile booking has been checked on an Android phone.
