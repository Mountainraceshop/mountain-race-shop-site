/**
 * Mountain Race Shop™ — booking UI storage and capacity helpers.
 *
 * The public form still uses these synchronous helpers to render prices and
 * Monday choices. When Supabase is configured, booking-production.js takes
 * over submission and refreshes capacity from the shared database.
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "mrs_bookings_v1";
  const CAPACITY_LIMITS = {
    maxBikesPerMonday: 3,
    maxLooseJobsPerMonday: 10,
  };
  const BLOCKED_PICKUP_DATES = [];
  const BLOCKED_PICKUP_DATE_MESSAGE =
    "This Canberra pickup date is unavailable. Please choose another Monday.";
  const PICKUP_PRICING = {
    complete_bike: {
      label: "Complete bike pickup/drop-off",
      price: 20,
      bikes: 1,
      loose: 0,
    },
    loose_forks: {
      label: "Loose forks only",
      price: 10,
      bikes: 0,
      loose: 1,
    },
    loose_shock: {
      label: "Loose shock only",
      price: 10,
      bikes: 0,
      loose: 1,
    },
    loose_forks_and_shock: {
      label: "Loose forks and shock",
      price: 20,
      bikes: 0,
      loose: 2,
    },
  };
  const BOOKING_STATUSES = [
    "New request",
    "Awaiting customer confirmation",
    "Confirmed",
    "Waiting on parts",
    "Booked into workshop",
    "Completed",
    "Cancelled",
  ];
  const WORKSHOP_DATE_FORMAT = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  function generateBookingId() {
    const now = new Date();
    const parts = WORKSHOP_DATE_FORMAT.formatToParts(now);
    const value = (type) => parts.find((part) => part.type === type)?.value || "";
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MRS-${value("year")}${value("month")}${value("day")}-${random}`;
  }

  function readAllRaw() {
    try {
      const raw = global.localStorage?.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Could not read local booking fallback", error);
      return [];
    }
  }

  function writeAllRaw(bookings) {
    try {
      global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch (error) {
      console.warn("Could not write local booking fallback", error);
    }
  }

  function getBookingPickupSlots(booking) {
    if (!booking?.wants_pickup_dropoff) return { bikes: 0, loose: 0 };
    if (
      Number.isFinite(Number(booking.pickup_capacity_bikes)) &&
      Number.isFinite(Number(booking.pickup_capacity_loose))
    ) {
      return {
        bikes: Number(booking.pickup_capacity_bikes),
        loose: Number(booking.pickup_capacity_loose),
      };
    }
    const meta = PICKUP_PRICING[booking.pickup_type];
    return meta ? { bikes: meta.bikes, loose: meta.loose } : { bikes: 0, loose: 0 };
  }

  function getMondayUsage(mondayDateIso, excludedBookingId) {
    return readAllRaw()
      .filter(
        (booking) =>
          booking.wants_pickup_dropoff &&
          booking.preferred_monday_date === mondayDateIso &&
          booking.booking_status !== "Cancelled" &&
          booking.booking_id !== excludedBookingId
      )
      .reduce(
        (usage, booking) => {
          const slots = getBookingPickupSlots(booking);
          usage.bikes += slots.bikes;
          usage.loose += slots.loose;
          return usage;
        },
        { bikes: 0, loose: 0 }
      );
  }

  function isPickupDateBlocked(mondayDateIso) {
    return BLOCKED_PICKUP_DATES.includes(mondayDateIso);
  }

  function getCapacityForSlots(mondayDateIso, slots, excludedBookingId) {
    if (isPickupDateBlocked(mondayDateIso)) {
      return {
        available: false,
        message: BLOCKED_PICKUP_DATE_MESSAGE,
        usage: { bikes: 0, loose: 0 },
        remaining: { bikes: 0, loose: 0 },
      };
    }
    const usage = getMondayUsage(mondayDateIso, excludedBookingId);
    const remaining = {
      bikes: CAPACITY_LIMITS.maxBikesPerMonday - usage.bikes,
      loose: CAPACITY_LIMITS.maxLooseJobsPerMonday - usage.loose,
    };
    const need = slots || { bikes: 0, loose: 0 };
    const bikeOk = need.bikes === 0 || remaining.bikes >= need.bikes;
    const looseOk = need.loose === 0 || remaining.loose >= need.loose;
    return {
      available: bikeOk && looseOk,
      message: !bikeOk
        ? "Bike pickup capacity full for this Monday."
        : !looseOk
          ? "Loose suspension pickup capacity full for this Monday."
          : "",
      usage,
      remaining,
    };
  }

  function getCapacityForPickupType(mondayDateIso, pickupType, excludedBookingId) {
    const meta = PICKUP_PRICING[pickupType] || { bikes: 0, loose: 0 };
    return getCapacityForSlots(mondayDateIso, meta, excludedBookingId);
  }

  function listBookings() {
    return readAllRaw().sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }

  function getBookingById(bookingId) {
    return readAllRaw().find((booking) => booking.booking_id === bookingId) || null;
  }

  function saveBooking(booking) {
    const all = readAllRaw();
    const index = all.findIndex((item) => item.booking_id === booking.booking_id);
    if (index >= 0) all[index] = booking;
    else all.push(booking);
    writeAllRaw(all);
    return booking;
  }

  function createBooking(payload) {
    const booking = {
      booking_id: generateBookingId(),
      created_at: new Date().toISOString(),
      booking_status: "New request",
      ...payload,
    };
    const slots = getBookingPickupSlots(booking);
    const capacity = getCapacityForSlots(booking.preferred_monday_date, slots);
    if (booking.wants_pickup_dropoff && !capacity.available) {
      throw new Error(capacity.message || "Selected Monday is at capacity.");
    }
    return saveBooking(booking);
  }

  function updateBookingStatus(bookingId, status) {
    const booking = getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");
    booking.booking_status = status;
    return saveBooking(booking);
  }

  function getWorkshopDateParts(date = new Date()) {
    const parts = WORKSHOP_DATE_FORMAT.formatToParts(date);
    const value = (type) => Number(parts.find((part) => part.type === type)?.value);
    return { year: value("year"), month: value("month"), day: value("day") };
  }

  function formatUtcDate(date) {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  function getUpcomingMondays(count = 16) {
    const today = getWorkshopDateParts();
    const cursor = new Date(Date.UTC(today.year, today.month - 1, today.day));
    const day = cursor.getUTCDay();
    const daysUntilMonday = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
    cursor.setUTCDate(cursor.getUTCDate() + daysUntilMonday);
    const mondays = [];
    while (mondays.length < count) {
      mondays.push(formatUtcDate(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return mondays;
  }

  function formatMondayLabel(isoDate) {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  global.BookingStorage = {
    STORAGE_KEY,
    CAPACITY_LIMITS,
    BLOCKED_PICKUP_DATES,
    BLOCKED_PICKUP_DATE_MESSAGE,
    PICKUP_PRICING,
    BOOKING_STATUSES,
    generateBookingId,
    listBookings,
    getBookingById,
    saveBooking,
    createBooking,
    updateBookingStatus,
    getMondayUsage,
    getBookingPickupSlots,
    isPickupDateBlocked,
    getCapacityForSlots,
    getCapacityForPickupType,
    getUpcomingMondays,
    formatMondayLabel,
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  if (typeof document !== "undefined" && document.getElementById("bookingForm")) {
    loadScript("assets/js/supabase-config.js")
      .catch(() => undefined)
      .then(() => loadScript("assets/js/booking-production.js"))
      .catch((error) => console.warn("Production booking adapter did not load", error));
  }
})(typeof window !== "undefined" ? window : globalThis);
