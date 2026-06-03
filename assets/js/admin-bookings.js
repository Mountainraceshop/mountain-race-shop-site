/**
 * Mountain Race Shop™ — admin booking list
 */

(function () {
  "use strict";

  const tableBody = document.getElementById("bookingsTableBody");
  const emptyState = document.getElementById("bookingsEmpty");
  const exportBtn = document.getElementById("exportBookings");

  if (!tableBody || !window.BookingStorage) return;

  const { BookingStorage } = window;

  const BRAKE_LABELS = {
    check_front: "Front check",
    check_rear: "Rear check",
    check_oil_contamination: "Oil contamination check",
    replace_front_quote: "Replace front (quote first)",
    replace_rear_quote: "Replace rear (quote first)",
  };

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

  function suspensionLabel(b) {
    if (b.selected_suspension_service) return b.selected_suspension_service;
    if (b.selected_services?.length) return b.selected_services.join(", ");
    return "—";
  }

  function suspensionMeta(b) {
    const parts = [];
    if (b.suspension_service_price != null) {
      parts.push(`$${b.suspension_service_price}`);
    }
    if (b.suspension_service_location_type) {
      parts.push(
        b.suspension_service_location_type === "on_bike"
          ? "On bike"
          : b.suspension_service_location_type === "off_bike"
            ? "Off bike"
            : "—"
      );
    }
    if (b.air_fork_service) parts.push("Air fork");
    return parts.length ? parts.join("<br/>") : "—";
  }

  function pickupLabel(b) {
    if (!b.wants_pickup_dropoff) return "No";
    const type = BookingStorage.PICKUP_PRICING[b.pickup_type];
    const typeLabel = type ? type.label : b.pickup_type;
    const price =
      b.pickup_price != null
        ? ` · $${b.pickup_price}`
        : type
          ? ` · $${type.price}`
          : "";
    const monday = b.preferred_monday_date || "—";
    const area = b.pickup_area || "—";
    const wear =
      b.wear_parts_extra_note || b.extra_parts_note_acknowledged
        ? "<br/><small>Wear parts extra if needed</small>"
        : "";
    return `Yes — ${typeLabel}${price}<br/><small>${monday} · ${area}</small>${wear}`;
  }

  function brakeLabel(b) {
    const opts = b.brake_pad_check_options || [];
    if (!opts.length) return "—";
    return opts.map((id) => BRAKE_LABELS[id] || id).join("<br/>");
  }

  function listOrDash(arr) {
    if (!arr || !arr.length) return "—";
    return arr.join(", ");
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
        <td>${escapeHtml(suspensionLabel(b))}</td>
        <td>${suspensionMeta(b)}</td>
        <td>${b.estimated_fixed_total != null ? `$${b.estimated_fixed_total}` : "—"}</td>
        <td>${escapeHtml(listOrDash(b.selected_engine_services))}</td>
        <td>${escapeHtml(listOrDash(b.selected_tyres))}${b.tyre_recommendation_required ? "<br/><small>Recommend tyre</small>" : ""}</td>
        <td>${b.tyre_fitting_cost ? `$${b.tyre_fitting_cost}` : "—"}</td>
        <td>${brakeLabel(b)}${b.brake_pad_quote_required ? "<br/><small>Quote required</small>" : ""}</td>
        <td>${pickupLabel(b)}</td>
        <td>${escapeHtml(b.payment_preference || "—")}</td>
        <td>
          <select data-booking-id="${escapeAttr(b.booking_id)}" class="status-select" aria-label="Booking status">
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
