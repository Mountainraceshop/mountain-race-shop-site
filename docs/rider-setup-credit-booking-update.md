# Draft booking update — Rider Setup, Spring Ready and September return bookings

Status: draft branch only. Do not merge/deploy until `craig@mountainraceshop.com.au` is created and tested.

## Commercial goal

Come back from France with September bookings already waiting, not a cold restart.

The booking flow should support three customer paths:

1. **I know what I need** — fork service, shock service, revalve, springs or full package.
2. **I am not sure what I need** — Rider Setup & Baseline Recommendation.
3. **I need a slot when Craig returns** — Spring Ready / September Priority booking.

## Homepage and booking-page banner

Customer-facing banner copy:

> September suspension bookings are now open. Craig is away in France through August, but the workshop diary is open for return bookings. Book now if your bike is harsh, kicking, diving, deflecting or overdue before spring riding.

Booking-page support copy:

> Craig is away in France until late August. The workshop diary is open now for September return bookings, with limited first-week workshop slots available.

## Rider Setup service

Add a new booking option to the Mountain Race Shop booking form:

**Rider Setup & Baseline Recommendation — $50**

Short customer wording:

> Stop guessing. Get the bike measured, checked and diagnosed properly before spending money.

Full customer wording:

> Bring the bike to the workshop for a rider setup and baseline recommendation. We check rider sag, static sag, bike balance, clicker settings, fork height, tyre pressure, rider weight, riding type and what the bike is doing. You receive a practical recommendation before spending money on springs, revalving or extra work.

Credit wording:

> The $50 Rider Setup & Baseline Recommendation fee is fully credited toward any recommended suspension work booked within 30 days.

Important: this is not a cash refund. Treat it as a credit against booked workshop labour or suspension work.

## Eligible work for the $50 credit

- Fork service
- Shock service
- Fork and shock service
- Spring replacement
- Revalve
- Full suspension package
- Suspension repair work

## Not eligible unless manually approved

- Tyres only
- Parts-only purchases
- General advice with no booked workshop work
- Work booked more than 30 days later

## Spring Ready / September Priority paths

The draft script now adds two extra return-from-France sales paths:

### Spring Ready Suspension Check — September priority

Use this for riders who want the bike ready for spring but are not sure which exact service package is correct.

Includes:

- Priority booking request for September return work
- Suspension health assessment
- Rider weight and spring-rate suitability check
- Clicker baseline and sag recommendation
- Tyre wear / tyre pressure notes
- Written recommendation before parts, springs, revalving or repairs are approved
- Final job price confirmed before work begins

### September priority booking / waitlist

Use this for riders who want a slot held for when Craig returns from France.

Includes:

- Best for riders who know they need work but are not sure which package yet
- Customer should include any race, ride or event date in the rider complaint / goal field
- Mountain Race Shop confirms the correct job, date and price before work begins

## Booking-form integration

The branch includes a draft drop-in script:

```html
<script src="assets/js/booking-storage.js"></script>
<script src="assets/js/booking-catalog.js"></script>
<script src="assets/js/rider-setup-credit-draft.js"></script>
<script src="assets/js/booking.js"></script>
```

The new script must load after `booking-catalog.js` and before `booking.js` so the new service cards exist before the booking form renders.

## Email update to apply once mailbox exists

Current booking email endpoint in `assets/js/booking.js`:

```js
const BOOKING_EMAIL_ENDPOINT =
  "https://formsubmit.co/ajax/fenianparktrading@gmail.com";
```

Update to:

```js
const BOOKING_EMAIL_ENDPOINT =
  "https://formsubmit.co/ajax/craig@mountainraceshop.com.au";
```

Visible booking-page contact links should also move to:

```html
<a href="mailto:craig@mountainraceshop.com.au">craig@mountainraceshop.com.au</a>
```

Note: the draft branch has visible page contact links using `craig@mountainraceshop.com.au`. The live merge should still wait until the mailbox exists and has been tested.

## Admin/job-sheet notes

When Rider Setup is selected, admin output should show:

- Service: Rider Setup & Baseline Recommendation
- Price: $50
- Credit rule: credited toward recommended suspension work booked within 30 days
- Time allowance: 30–45 minutes
- Complete bike required
- Rider weight without gear
- Rider weight with gear, optional
- Riding type
- Skill level
- Rider complaint or goal
- Sag notes
- Clicker baseline
- Tyre pressure notes
- Final recommendations

When Spring Ready or September Priority is selected, admin output should show:

- Service selected
- No payment now / price to be confirmed
- Customer's target date or event from rider complaint / goal
- Rider details
- Bike details
- Recommended next contact date
- Whether parts may need to be ordered before September

## Extra booking fields to add in a future full-code pass

The current form already captures rider weight, skill level, riding type and complaint/goal when `requiresRider` is true. Recommended extra fields for the final version:

- Has sag already been set? yes / no / unsure
- Current fork clicker settings, optional
- Current shock clicker settings, optional
- Current tyre pressures, optional
- Are the forks or shock leaking? yes / no / unsure
- Has the suspension been serviced in the last 12 months? yes / no / unsure
- Target event / ride date
- Written recommendations requested? default yes

## Brand line

Diagnose. Engineer. Tune. Teach.

Stop guessing. Get the suspension diagnosed properly.
