/**
 * Mountain Race Shop™ — simple admin booking list
 * Reads from the same BookingStorage layer as the public form.
 * For production: protect this page (HTTP auth, Supabase RLS, or private admin app).
 */

(function () {
  "use strict";

  const tableBody = document.getElementById("bookingsTableBody");
  const emptyState = document.getElementById("bookingsEmpty");
  const exportBtn = document.getElementById("exportBookings");

  if (!tableBody || !window.BookingStorage) return;

  const { BookingStorage } = window;

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function bikeLabel(b) {
    return [b.bike_brand, b.bike_model, b.bike_year].filter(Boolean).join(" ");
  }

  function pickupLabel(b) {
    if (!b.wants_pickup_dropoff) return "No";
    const type = BookingStorage.PICKUP_PRICING[b.pickup_type];
    const typeLabel = type ? type.label : b.pickup_type;
    return `Yes — ${typeLabel}`;
  }

  function render() {
    const bookings = BookingStorage.listBookings();
    tableBody.innerHTML = "";

    if (bookings.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    for (const b of bookings) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(b.created_at)}</td>
        <td><strong>${escapeHtml(b.customer_name)}</strong><br/><small>${escapeHtml(b.booking_id)}</small></td>
        <td><a href="tel:${escapeAttr(b.phone)}">${escapeHtml(b.phone)}</a></td>
        <td>${escapeHtml(bikeLabel(b))}</td>
        <td>${escapeHtml((b.selected_services || []).join(", "))}</td>
        <td>${escapeHtml(pickupLabel(b))}</td>
        <td>${escapeHtml(b.preferred_monday_date || "—")}</td>
        <td>${escapeHtml(b.pickup_area || "—")}</td>
        <td>${escapeHtml(b.payment_preference || "—")}</td>
        <td>
          <select data-booking-id="${escapeAttr(b.booking_id)}" class="status-select" aria-label="Booking status for ${escapeAttr(b.booking_id)}">
            ${BookingStorage.BOOKING_STATUSES.map(
              (s) =>
                `<option value="${escapeAttr(s)}" ${s === b.booking_status ? "selected" : ""}>${escapeHtml(s)}</option>`
            ).join("")}
          </select>
        </td>
      `;
      tableBody.appendChild(tr);
    }

    tableBody.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        try {
          BookingStorage.updateBookingStatus(sel.dataset.bookingId, sel.value);
        } catch (e) {
          alert(e.message);
          render();
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  exportBtn?.addEventListener("click", () => {
    const data = JSON.stringify(BookingStorage.listBookings(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mrs-bookings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("refreshBookings")?.addEventListener("click", render);

  render();
})();
