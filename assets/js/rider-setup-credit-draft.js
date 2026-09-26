// Mountain Race Shop™ — Rider Setup service and booking email routing
// Load after assets/js/booking-catalog.js and before assets/js/booking.js.
// Add the Rider Setup option and route booking emails to the Mountain Race Shop mailbox.

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
      priceLabel: "A$50 — credited to booked work",
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
        "A$50 fee fully credited toward recommended suspension work booked within 30 days",
        "Parts, servicing, springs, revalving, repairs and additional labour quoted separately",
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

  // Booking email target.
  global.MRS_DRAFT_BOOKING_EMAIL = "craig@mountainraceshop.com.au";

  // The existing booking.js file still has the original FormSubmit constant.
  // Route the existing FormSubmit request to the customer mailbox.
  
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
