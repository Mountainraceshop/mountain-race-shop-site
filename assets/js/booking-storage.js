/**
 * Mountain Race Shop™ — booking storage layer
 *
 * Default: browser localStorage (single-device demo / workshop tablet).
 * Production: replace with SupabaseBookingStorage (see SUPABASE INTEGRATION below).
 */

(function (global) {
  "use strict";

  const STORAGE_KEY = "mrs_bookings_v1";

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

  /**
   * Aggregate Monday capacity from non-cancelled bookings with pickup enabled.
   */
  function getMondayUsage(mondayDateIso) {
    const bookings = readAllRaw().filter(
      (b) =>
        b.wants_pickup_dropoff &&
        b.preferred_monday_date === mondayDateIso &&
        b.booking_status !== "Cancelled"
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

  function getCapacityForPickupType(mondayDateIso, pickupType) {
    const usage = getMondayUsage(mondayDateIso);
    const need = PICKUP_PRICING[pickupType] || { bikes: 0, loose: 0 };

    const bikesRemaining = CAPACITY_LIMITS.maxBikesPerMonday - usage.bikes;
    const looseRemaining = CAPACITY_LIMITS.maxLooseJobsPerMonday - usage.loose;

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
    const booking = {
      booking_id: generateBookingId(),
      created_at: new Date().toISOString(),
      booking_status: "New request",
      ...payload,
    };

    if (booking.wants_pickup_dropoff && booking.preferred_monday_date) {
      const cap = getCapacityForPickupType(
        booking.preferred_monday_date,
        booking.pickup_type
      );
      if (!cap.available) {
        throw new Error(cap.message || "Selected Monday is at capacity.");
      }
    }

    return saveBooking(booking);
  }

  function updateBookingStatus(bookingId, status) {
    const booking = getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");
    booking.booking_status = status;
    return saveBooking(booking);
  }

  /**
   * Next N Mondays (ISO date strings YYYY-MM-DD) in Australia/Sydney calendar day.
   */
  function getUpcomingMondays(count = 16) {
    const mondays = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);

    const day = cursor.getDay();
    const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    if (day !== 1) {
      cursor.setDate(cursor.getDate() + (day === 0 ? 1 : daysUntilMonday));
    }

    while (mondays.length < count) {
      const iso = cursor.toISOString().slice(0, 10);
      mondays.push(iso);
      cursor.setDate(cursor.getDate() + 7);
    }
    return mondays;
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
