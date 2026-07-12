// Mountain Race Shop™ — Rider Setup & Baseline Recommendation draft update
// Draft branch only. Load this script after assets/js/booking-catalog.js and before assets/js/booking.js.
// Purpose: add a $50 rider setup service with credit-back wording, while keeping the production page unchanged until craig@mountainraceshop.com.au is ready.

(function (global) {
  "use strict";

  const bookingCatalog = global.BookingCatalog;
  if (!bookingCatalog || !Array.isArray(bookingCatalog.SUSPENSION_SERVICES)) return;

  const riderSetupService = {
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
  };

  const existingIndex = bookingCatalog.SUSPENSION_SERVICES.findIndex(
    (service) => service.id === riderSetupService.id
  );

  if (existingIndex >= 0) {
    bookingCatalog.SUSPENSION_SERVICES.splice(existingIndex, 1, riderSetupService);
  } else {
    bookingCatalog.SUSPENSION_SERVICES.unshift(riderSetupService);
  }

  const originalGetSuspensionServiceById = bookingCatalog.getSuspensionServiceById;
  bookingCatalog.getSuspensionServiceById = function getSuspensionServiceById(id) {
    if (id === riderSetupService.id) return riderSetupService;
    if (typeof originalGetSuspensionServiceById === "function") {
      return originalGetSuspensionServiceById(id);
    }
    return bookingCatalog.SUSPENSION_SERVICES.find((service) => service.id === id) || null;
  };

  // Draft email target for tomorrow once the mailbox exists.
  global.MRS_DRAFT_BOOKING_EMAIL = "craig@mountainraceshop.com.au";
})(typeof window !== "undefined" ? window : globalThis);
