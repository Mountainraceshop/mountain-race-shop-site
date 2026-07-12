// Mountain Race Shop™ — France return sales + Rider Setup draft update
// Draft branch only. Load this script after assets/js/booking-catalog.js and before assets/js/booking.js.
// Purpose: add low-risk sales entry points for September bookings and redirect draft booking emails to the new Mountain Race Shop mailbox once created.

(function (global) {
  "use strict";

  const bookingCatalog = global.BookingCatalog;
  if (!bookingCatalog || !Array.isArray(bookingCatalog.SUSPENSION_SERVICES)) return;

  const OLD_BOOKING_EMAIL_ENDPOINT =
    "https://formsubmit.co/ajax/fenianparktrading@gmail.com";
  const NEW_BOOKING_EMAIL_ENDPOINT =
    "https://formsubmit.co/ajax/craig@mountainraceshop.com.au";

  const draftServices = [
    {
      id: "rider_setup_baseline",
      label: "Rider Setup & Baseline Recommendation",
      priceLabel: "$50 — credited to booked work",
      price: 50,
      location: "on_bike",
      pickupBikes: 1,
      pickupLoose: 0,
      requiresRider: true,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      onBikeNote:
        "Complete bike required. This is a workshop setup and recommendation session, not parts, repairs or revalving.",
      includes: [
        "Workshop rider setup and baseline recommendation",
        "Rider sag and static sag check",
        "Bike balance and fork-height check",
        "Baseline clicker setup",
        "Tyre pressure discussion",
        "Rider weight, riding type and main complaint captured",
        "Practical written recommendation before spending money on springs, revalving or extra work",
        "$50 fee fully credited toward recommended suspension work booked within 30 days",
        "Parts, servicing, springs, revalving, repairs and additional labour quoted separately",
      ],
    },
    {
      id: "spring_ready_suspension_check",
      label: "Spring Ready Suspension Check — September priority",
      priceLabel: "Book for September",
      price: null,
      location: "unknown",
      pickupBikes: 0,
      pickupLoose: 0,
      requiresRider: true,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      includes: [
        "Priority booking request for September return work",
        "Suspension health assessment",
        "Rider weight and spring-rate suitability check",
        "Clicker baseline and sag recommendation",
        "Tyre wear / tyre pressure notes",
        "Written recommendation before parts, springs, revalving or repairs are approved",
        "Final job price confirmed before work begins",
      ],
    },
    {
      id: "september_priority_booking",
      label: "September priority booking / waitlist",
      priceLabel: "No payment now",
      price: null,
      location: "unknown",
      pickupBikes: 0,
      pickupLoose: 0,
      requiresRider: true,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      includes: [
        "Use this if you want a slot held for when Craig returns from France",
        "Best for riders who know they need work but are not sure which package yet",
        "Include any race, ride or event date in the rider complaint / goal field",
        "Mountain Race Shop will confirm the correct job, date and price before work begins",
      ],
    },
  ];

  for (const service of [...draftServices].reverse()) {
    const existingIndex = bookingCatalog.SUSPENSION_SERVICES.findIndex(
      (candidate) => candidate.id === service.id
    );

    if (existingIndex >= 0) {
      bookingCatalog.SUSPENSION_SERVICES.splice(existingIndex, 1, service);
    } else {
      bookingCatalog.SUSPENSION_SERVICES.unshift(service);
    }
  }

  const originalGetSuspensionServiceById = bookingCatalog.getSuspensionServiceById;
  bookingCatalog.getSuspensionServiceById = function getSuspensionServiceById(id) {
    const draftService = draftServices.find((service) => service.id === id);
    if (draftService) return draftService;
    if (typeof originalGetSuspensionServiceById === "function") {
      return originalGetSuspensionServiceById(id);
    }
    return bookingCatalog.SUSPENSION_SERVICES.find((service) => service.id === id) || null;
  };

  // Draft email target now that the mailbox has been created.
  global.MRS_DRAFT_BOOKING_EMAIL = "craig@mountainraceshop.com.au";

  // The existing booking.js file still has the original FormSubmit constant.
  // This draft-only redirect avoids rewriting the large booking.js file through the connector.
  // It should be browser-tested with one dummy booking before merge.
  if (typeof global.fetch === "function" && !global.MRS_BOOKING_EMAIL_REDIRECT_INSTALLED) {
    const originalFetch = global.fetch.bind(global);
    global.fetch = function mountainRaceShopBookingFetch(input, init) {
      if (input === OLD_BOOKING_EMAIL_ENDPOINT) {
        return originalFetch(NEW_BOOKING_EMAIL_ENDPOINT, init);
      }

      if (input instanceof Request && input.url === OLD_BOOKING_EMAIL_ENDPOINT) {
        return originalFetch(new Request(NEW_BOOKING_EMAIL_ENDPOINT, input), init);
      }

      return originalFetch(input, init);
    };
    global.MRS_BOOKING_EMAIL_REDIRECT_INSTALLED = true;
  }
})(typeof window !== "undefined" ? window : globalThis);
