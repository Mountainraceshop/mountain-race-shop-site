/* Mountain Race Shop — production booking persistence adapter.
 * Configure window.MRS_BOOKING_CONFIG before this script loads.
 * The Supabase anon key is designed for browser use; RLS in supabase/schema.sql
 * restricts anonymous clients to INSERT only.
 */
(function (global) {
  "use strict";

  function config() {
    return global.MRS_BOOKING_CONFIG || {};
  }

  function configured() {
    const c = config();
    return Boolean(c.supabaseUrl && c.supabaseAnonKey);
  }

  function endpoint() {
    return config().supabaseUrl.replace(/\/$/, "") + "/rest/v1/bookings";
  }

  function headers() {
    const key = config().supabaseAnonKey;
    return {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  }

  function normalise(booking) {
    return {
      booking_id: booking.booking_id,
      booking_status: booking.booking_status || "New request",
      customer_name: booking.customer_name || "",
      phone: booking.phone || "",
      email: booking.email || "",
      suburb: booking.suburb || null,
      preferred_contact_method: booking.preferred_contact_method || null,
      bike_brand: booking.bike_brand || "",
      bike_model: booking.bike_model || "",
      bike_year: booking.bike_year ? Number(booking.bike_year) : null,
      motorcycle_type: booking.motorcycle_type || null,
      rider_weight: booking.rider_weight || null,
      main_use: booking.main_use || null,
      handling_problem: booking.handling_problem || booking.customer_description || null,
      service_name: booking.service_name || booking.suspension_service_label || null,
      service_code: booking.service_code || booking.suspension_service || null,
      wants_pickup_dropoff: Boolean(booking.wants_pickup_dropoff),
      preferred_monday_date: booking.preferred_monday_date || null,
      pickup_type: booking.pickup_type || null,
      payload: booking,
    };
  }

  async function createBooking(booking) {
    if (!configured()) {
      throw new Error("Production booking storage is not configured.");
    }
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(normalise(booking)),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error("Booking submission failed (" + response.status + "): " + detail);
    }
    const rows = await response.json();
    return rows[0] || booking;
  }

  global.MRSProductionBookingStorage = {
    isConfigured: configured,
    createBooking: createBooking,
  };
})(window);
