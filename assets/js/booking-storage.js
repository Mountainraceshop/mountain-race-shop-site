/**
 * Mountain Race Shop™ — booking storage layer
 *
 * Default: browser localStorage (single-device demo / workshop tablet).
 * Production: replace with SupabaseBookingStorage (see SUPABASE INTEGRATION below).
 */

(function (global) {
  "use strict";

  const STORAGE_KEY = "mrs_bookings_v1";
  const STORAGE_LOCK_KEY = `${STORAGE_KEY}_lock`;
  const STORAGE_LOCK_TTL_MS = 2000;
  const STORAGE_LOCK_WAIT_MS = 1000;

  const CAPACITY_LIMITS = {
    maxBikesPerMonday: 3,
    maxLooseJobsPerMonday: 10,
  };

  const PICKUP_PRICING = {
    complete_bike: { label: "Complete bike pickup/drop-off", price: 25, bikes: 1, loose: 0 },
    loose_forks: { label: "Loose forks only", price: 10, bikes: 0, loose: 1 },
    loose_shock: { label: "Loose shock only", price: 10, bikes: 0, loose: 1 },
    loose_forks_and_shock: {
      label: "Loose forks and shock",
      price: 10,
      bikes: 0,
      loose: 2,
    },
  };

  const BOOKING_STATUSES = [
    "New request",
    "Confirmed",
    "Waiting on parts",
    "Completed",
    "Cancelled",
  ];

  const WORKSHOP_TIME_ZONE = "Australia/Sydney";
  const WORKSHOP_DATE_FORMAT = new Intl.DateTimeFormat("en-AU", {
    timeZone: WORKSHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  function generateBookingId() {
    const d = new Date();
    const ymd =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MRS-${ymd}-${rand}`;
  }

  function readAllRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to read bookings", e);
      return [];
    }
  }

  function writeAllRaw(bookings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }

  function readStorageLock() {
    try {
      const raw = localStorage.getItem(STORAGE_LOCK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function acquireStorageLock() {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const deadline = Date.now() + STORAGE_LOCK_WAIT_MS;

    while (Date.now() <= deadline) {
      const now = Date.now();
      const current = readStorageLock();
      if (!current || current.expires_at <= now) {
        localStorage.setItem(
          STORAGE_LOCK_KEY,
          JSON.stringify({ token, expires_at: now + STORAGE_LOCK_TTL_MS })
        );

        const stored = readStorageLock();
        if (stored && stored.token === token) {
          return token;
        }
      }
    }

    throw new Error("Booking storage is busy. Please try again.");
  }

  function releaseStorageLock(token) {
    const current = readStorageLock();
    if (current && current.token === token) {
      localStorage.removeItem(STORAGE_LOCK_KEY);
    }
  }

  function withStorageLock(callback) {
    const token = acquireStorageLock();
    try {
      return callback();
    } finally {
      releaseStorageLock(token);
    }
  }

  /**
   * Aggregate Monday capacity from non-cancelled bookings with pickup enabled.
   */
  function getMondayUsage(mondayDateIso, excludedBookingId) {
    const bookings = readAllRaw().filter(
      (b) =>
        b.wants_pickup_dropoff &&
        b.preferred_monday_date === mondayDateIso &&
        b.booking_status !== "Cancelled" &&
        b.booking_id !== excludedBookingId
    );

    let bikes = 0;
    let loose = 0;

    for (const b of bookings) {
      const meta = PICKUP_PRICING[b.pickup_type];
      if (!meta) continue;
      bikes += meta.bikes;
      loose += meta.loose;
    }

    return { bikes, loose };
  }

  function getCapacityForPickupType(
    mondayDateIso,
    pickupType,
    excludedBookingId
  ) {
    const usage = getMondayUsage(mondayDateIso, excludedBookingId);
    const bikesRemaining = CAPACITY_LIMITS.maxBikesPerMonday - usage.bikes;
    const looseRemaining = CAPACITY_LIMITS.maxLooseJobsPerMonday - usage.loose;
    const need = PICKUP_PRICING[pickupType];

    if (!need) {
      return {
        available: false,
        message: "Select a valid pickup type.",
        usage,
        remaining: {
          bikes: bikesRemaining,
          loose: looseRemaining,
        },
      };
    }

    const bikeOk = need.bikes === 0 || bikesRemaining >= need.bikes;
    const looseOk = need.loose === 0 || looseRemaining >= need.loose;

    let message = "";
    if (!bikeOk) {
      message = "Bike pickup capacity full for this Monday.";
    } else if (!looseOk) {
      message = "Loose suspension pickup capacity full for this Monday.";
    }

    return {
      available: bikeOk && looseOk,
      message,
      usage,
      remaining: {
        bikes: bikesRemaining,
        loose: looseRemaining,
      },
    };
  }

  function validatePickupCapacity(booking, excludedBookingId) {
    if (!booking.wants_pickup_dropoff || !booking.preferred_monday_date) return;

    const cap = getCapacityForPickupType(
      booking.preferred_monday_date,
      booking.pickup_type,
      excludedBookingId
    );
    if (!cap.available) {
      throw new Error(cap.message || "Selected Monday is at capacity.");
    }
  }

  function listBookings() {
    return readAllRaw().sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  function getBookingById(bookingId) {
    return readAllRaw().find((b) => b.booking_id === bookingId) || null;
  }

  function saveBooking(booking) {
    const all = readAllRaw();
    const idx = all.findIndex((b) => b.booking_id === booking.booking_id);
    if (idx >= 0) {
      all[idx] = booking;
    } else {
      all.push(booking);
    }
    writeAllRaw(all);
    return booking;
  }

  function createBooking(payload) {
    return withStorageLock(() => {
      const booking = {
        booking_id: generateBookingId(),
        created_at: new Date().toISOString(),
        booking_status: "New request",
        ...payload,
      };

      validatePickupCapacity(booking);

      return saveBooking(booking);
    });
  }

  function updateBookingStatus(bookingId, status) {
    return withStorageLock(() => {
      const booking = getBookingById(bookingId);
      if (!booking) throw new Error("Booking not found");
      if (booking.booking_status === "Cancelled" && status !== "Cancelled") {
        validatePickupCapacity(booking, booking.booking_id);
      }
      booking.booking_status = status;
      return saveBooking(booking);
    });
  }

  /**
   * Next N Mondays (ISO date strings YYYY-MM-DD) in Australia/Sydney calendar day.
   */
  function getUpcomingMondays(count = 16) {
    const mondays = [];
    const today = getWorkshopDateParts();
    const cursor = new Date(Date.UTC(today.year, today.month - 1, today.day));
    const day = cursor.getUTCDay();
    const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    if (day !== 1) {
      cursor.setUTCDate(cursor.getUTCDate() + daysUntilMonday);
    }

    while (mondays.length < count) {
      const iso = formatUtcDate(cursor);
      mondays.push(iso);
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return mondays;
  }

  function getWorkshopDateParts(date = new Date()) {
    const parts = WORKSHOP_DATE_FORMAT.formatToParts(date);
    return {
      year: Number(parts.find((part) => part.type === "year").value),
      month: Number(parts.find((part) => part.type === "month").value),
      day: Number(parts.find((part) => part.type === "day").value),
    };
  }

  function formatUtcDate(date) {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  function formatMondayLabel(isoDate) {
    const d = new Date(isoDate + "T12:00:00");
    return d.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  /* --------------------------------------------------------------------------
   * SUPABASE INTEGRATION (replace localStorage for multi-user production)
   *
   * 1. Create table `bookings` with columns matching the booking object below.
   * 2. Implement async methods:
   *    - listBookings() -> select * order by created_at desc
   *    - createBooking(payload) -> insert + RPC to check capacity atomically
   *    - getMondayUsage(date) -> SQL aggregate:
   *        sum(bikes) where status != 'Cancelled' and wants_pickup_dropoff
   *    - updateBookingStatus(id, status) -> update
   * 3. Use a Postgres function or edge function to enforce capacity in one
   *    transaction so two customers cannot overbook the same Monday.
   * -------------------------------------------------------------------------- */

  const BookingStorage = {
    STORAGE_KEY,
    CAPACITY_LIMITS,
    PICKUP_PRICING,
    BOOKING_STATUSES,
    generateBookingId,
    listBookings,
    getBookingById,
    saveBooking,
    createBooking,
    updateBookingStatus,
    getMondayUsage,
    getCapacityForPickupType,
    getUpcomingMondays,
    formatMondayLabel,
  };

  global.BookingStorage = BookingStorage;
})(typeof window !== "undefined" ? window : global);
