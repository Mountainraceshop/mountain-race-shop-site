# Draft booking update — Rider Setup & Baseline Recommendation

Status: draft branch only. Do not merge/deploy until `craig@mountainraceshop.com.au` is created and tested.

## Requested change

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

## Booking-form integration

The branch includes a draft drop-in script:

```html
<script src="assets/js/booking-storage.js"></script>
<script src="assets/js/booking-catalog.js"></script>
<script src="assets/js/rider-setup-credit-draft.js"></script>
<script src="assets/js/booking.js"></script>
```

The new script must load after `booking-catalog.js` and before `booking.js` so the new service appears in the rendered suspension service cards.

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

## Admin/job-sheet notes

When this service is selected, admin output should show:

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

## Extra booking fields to add in a future full-code pass

The current form already captures rider weight, skill level, riding type and complaint/goal when `requiresRider` is true. Recommended extra fields for the final version:

- Has sag already been set? yes / no / unsure
- Current fork clicker settings, optional
- Current shock clicker settings, optional
- Current tyre pressures, optional
- Are the forks or shock leaking? yes / no / unsure
- Has the suspension been serviced in the last 12 months? yes / no / unsure
- Written recommendations requested? default yes

## Brand line

Diagnose. Engineer. Tune. Teach.

Stop guessing. Get the suspension diagnosed properly.
