/**
 * Mountain Race Shop™ — booking form logic
 *
 * EMAIL INTEGRATION: set BOOKING_EMAIL_ENDPOINT below.
 * Default uses FormSubmit.co (static-site friendly). Replace with your own
 * API route, Supabase edge function, or Google Apps Script URL when ready.
 */

(function () {
  "use strict";

  const BOOKING_EMAIL_ENDPOINT =
    "https://formsubmit.co/ajax/fenianparktrading@gmail.com";

  /** Set to false once FormSubmit is activated (check inbox for activation link). */
  const SEND_EMAIL_ON_SUBMIT = true;

  const SERVICES = [
    { id: "fork_seal_replacement", label: "Fork seal replacement" },
    { id: "fork_service", label: "Fork service" },
    { id: "shock_service", label: "Shock service" },
    { id: "fork_revalve", label: "Fork revalve" },
    { id: "shock_revalve", label: "Shock revalve" },
    { id: "fork_springs", label: "Fork springs" },
    { id: "shock_spring", label: "Shock spring" },
    { id: "full_suspension_setup", label: "Full suspension setup" },
    { id: "other", label: "Other / not sure" },
  ];

  const RIDER_WEIGHT_SERVICES = new Set([
    "fork_springs",
    "shock_spring",
    "fork_revalve",
    "shock_revalve",
  ]);

  const PICKUP_AREA_NOTES = {
    tuggeranong: "Tuggeranong: exact pickup location to be confirmed.",
    watson: "Watson / North Canberra: near Watson / Dickson / nearby McDonald's or agreed meeting point.",
    fyshwick: "Fyshwick: exact pickup point to be confirmed. Driver must be out of Fyshwick by 12:00 noon each Monday.",
    other: "Other Canberra location — describe in notes below.",
  };

  const form = document.getElementById("bookingForm");
  const confirmation = document.getElementById("bookingConfirmation");
  const riderPanel = document.getElementById("riderPanel");
  const pickupPanel = document.getElementById("pickupPanel");
  const cashNote = document.getElementById("cashNote");
  const mondayOptionsEl = document.getElementById("mondayOptions");
  const pickupAreaNotes = document.getElementById("pickupAreaNotes");
  const submitBtn = document.getElementById("submitBooking");

  if (!form || !window.BookingStorage) return;

  const { BookingStorage } = window;

  function $(id) {
    return document.getElementById(id);
  }

  function getSelectedServices() {
    return Array.from(
      form.querySelectorAll('input[name="services"]:checked')
    ).map((el) => el.value);
  }

  function needsRiderDetails() {
    const selected = getSelectedServices();
    return selected.some((id) => RIDER_WEIGHT_SERVICES.has(id));
  }

  function wantsPickup() {
    return $("wantsPickup")?.checked === true;
  }

  function getPickupType() {
    const el = form.querySelector('input[name="pickup_type"]:checked');
    return el ? el.value : "";
  }

  function clearFieldErrors() {
    form.querySelectorAll(".form-field.has-error").forEach((f) => {
      f.classList.remove("has-error");
      const err = f.querySelector(".field-error");
      if (err) err.textContent = "";
    });
    const servicesErr = $("servicesError");
    if (servicesErr) {
      servicesErr.style.display = "none";
      servicesErr.textContent = "";
    }
  }

  function setFieldError(fieldId, message) {
    const wrap = document.querySelector(`[data-field="${fieldId}"]`);
    if (!wrap) return;
    wrap.classList.add("has-error");
    const err = wrap.querySelector(".field-error");
    if (err) err.textContent = message;
  }

  function validate() {
    clearFieldErrors();
    let valid = true;

    const requiredText = [
      ["customer_name", "Full name is required"],
      ["phone", "Phone number is required"],
      ["email", "Email address is required"],
      ["suburb", "Suburb / pickup location area is required"],
      ["bike_brand", "Bike brand is required"],
      ["bike_model", "Bike model is required"],
      ["bike_year", "Bike year is required"],
    ];

    for (const [id, msg] of requiredText) {
      const el = $(id);
      if (!el?.value.trim()) {
        setFieldError(id, msg);
        valid = false;
      }
    }

    const email = $("email")?.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("email", "Enter a valid email address");
      valid = false;
    }

    if (!form.querySelector('input[name="preferred_contact_method"]:checked')) {
      setFieldError("preferred_contact_method", "Select a preferred contact method");
      valid = false;
    }

    if (!form.querySelector('input[name="motorcycle_type"]:checked')) {
      setFieldError("motorcycle_type", "Select motorcycle type");
      valid = false;
    }

    if (!form.querySelector('input[name="suspension_removed_status"]:checked')) {
      setFieldError("suspension_removed_status", "Select suspension status");
      valid = false;
    }

    const services = getSelectedServices();
    if (services.length === 0) {
      const servicesErr = $("servicesError");
      if (servicesErr) {
        servicesErr.style.display = "block";
        servicesErr.textContent = "Select at least one service";
      }
      valid = false;
    }

    if (needsRiderDetails()) {
      const weight = $("rider_body_weight_kg")?.value.trim();
      if (!weight || Number(weight) <= 0) {
        setFieldError(
          "rider_body_weight_kg",
          "Rider body weight (kg) is required for spring or revalve work"
        );
        valid = false;
      }
      if (!form.querySelector('input[name="skill_level"]:checked')) {
        setFieldError("skill_level", "Select skill level");
        valid = false;
      }
      if (!form.querySelector('input[name="riding_type"]:checked')) {
        setFieldError("riding_type", "Select main riding type");
        valid = false;
      }
    }

    if (wantsPickup()) {
      const pickupType = getPickupType();
      if (!pickupType) {
        setFieldError("pickup_type", "Select pickup type");
        valid = false;
      }
      const monday = form.querySelector('input[name="preferred_monday_date"]:checked');
      if (!monday) {
        setFieldError("preferred_monday_date", "Select a Monday date");
        valid = false;
      } else if (monday.disabled) {
        setFieldError("preferred_monday_date", "Selected Monday is at capacity");
        valid = false;
      } else if (pickupType) {
        const cap = BookingStorage.getCapacityForPickupType(
          monday.value,
          pickupType
        );
        if (!cap.available) {
          setFieldError("preferred_monday_date", cap.message);
          valid = false;
        }
      }
      if (!form.querySelector('input[name="pickup_area"]:checked')) {
        setFieldError("pickup_area", "Select pickup area");
        valid = false;
      }
    }

    if (!form.querySelector('input[name="payment_preference"]:checked')) {
      setFieldError("payment_preference", "Select payment preference");
      valid = false;
    }

    if (!$("accepted_terms")?.checked) {
      setFieldError("accepted_terms", "You must accept the pricing notice");
      valid = false;
    }

    return valid;
  }

  function buildBookingPayload() {
    const pickupType = wantsPickup() ? getPickupType() : "";
    const pricing = pickupType ? BookingStorage.PICKUP_PRICING[pickupType] : null;

    const pickupAreaEl = form.querySelector('input[name="pickup_area"]:checked');

    return {
      customer_name: $("customer_name").value.trim(),
      phone: $("phone").value.trim(),
      email: $("email").value.trim(),
      suburb: $("suburb").value.trim(),
      preferred_contact_method: form.querySelector(
        'input[name="preferred_contact_method"]:checked'
      )?.value,
      bike_brand: $("bike_brand").value.trim(),
      bike_model: $("bike_model").value.trim(),
      bike_year: $("bike_year").value.trim(),
      motorcycle_type: form.querySelector('input[name="motorcycle_type"]:checked')
        ?.value,
      suspension_removed_status: form.querySelector(
        'input[name="suspension_removed_status"]:checked'
      )?.value,
      selected_services: getSelectedServices(),
      rider_body_weight_kg: $("rider_body_weight_kg")?.value.trim() || null,
      rider_weight_with_gear_kg:
        $("rider_weight_with_gear_kg")?.value.trim() || null,
      skill_level:
        form.querySelector('input[name="skill_level"]:checked')?.value || null,
      riding_type:
        form.querySelector('input[name="riding_type"]:checked')?.value || null,
      rider_complaint_or_goal: $("rider_complaint_or_goal")?.value.trim() || null,
      wants_pickup_dropoff: wantsPickup(),
      pickup_type: pickupType || null,
      pickup_price: pricing ? pricing.price : null,
      preferred_monday_date:
        form.querySelector('input[name="preferred_monday_date"]:checked')
          ?.value || null,
      pickup_area: pickupAreaEl?.value || null,
      pickup_notes: $("pickup_notes")?.value.trim() || null,
      payment_preference: form.querySelector(
        'input[name="payment_preference"]:checked'
      )?.value,
      accepted_terms: $("accepted_terms").checked,
    };
  }

  function formatBookingEmailBody(booking) {
    return Object.entries(booking)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
  }

  async function sendBookingEmail(booking) {
    if (!SEND_EMAIL_ON_SUBMIT || !BOOKING_EMAIL_ENDPOINT) return;

    const payload = {
      _subject: `New suspension booking — ${booking.booking_id}`,
      _template: "table",
      booking_id: booking.booking_id,
      created_at: booking.created_at,
      booking_status: booking.booking_status,
      customer_name: booking.customer_name,
      phone: booking.phone,
      email: booking.email,
      suburb: booking.suburb,
      preferred_contact_method: booking.preferred_contact_method,
      bike: `${booking.bike_brand} ${booking.bike_model} (${booking.bike_year})`,
      motorcycle_type: booking.motorcycle_type,
      suspension_removed_status: booking.suspension_removed_status,
      selected_services: booking.selected_services.join(", "),
      rider_body_weight_kg: booking.rider_body_weight_kg,
      rider_weight_with_gear_kg: booking.rider_weight_with_gear_kg,
      skill_level: booking.skill_level,
      riding_type: booking.riding_type,
      rider_complaint_or_goal: booking.rider_complaint_or_goal,
      wants_pickup_dropoff: booking.wants_pickup_dropoff ? "Yes" : "No",
      pickup_type: booking.pickup_type,
      pickup_price: booking.pickup_price,
      preferred_monday_date: booking.preferred_monday_date,
      pickup_area: booking.pickup_area,
      pickup_notes: booking.pickup_notes,
      payment_preference: booking.payment_preference,
      message: formatBookingEmailBody(booking),
    };

    const res = await fetch(BOOKING_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Email delivery failed. Booking was saved locally.");
    }
  }

  function renderMondayOptions() {
    if (!mondayOptionsEl) return;

    const pickupType = getPickupType();
    const mondays = BookingStorage.getUpcomingMondays(16);
    mondayOptionsEl.innerHTML = "";

    if (!pickupType) {
      mondayOptionsEl.innerHTML =
        '<p class="section-hint">Select a pickup type to see available Mondays.</p>';
      return;
    }

    for (const iso of mondays) {
      const cap = BookingStorage.getCapacityForPickupType(iso, pickupType);
      const label = BookingStorage.formatMondayLabel(iso);
      const id = `monday-${iso}`;

      const wrap = document.createElement("label");
      wrap.className = "monday-option" + (cap.available ? "" : " is-disabled");
      wrap.setAttribute("for", id);

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "preferred_monday_date";
      input.id = id;
      input.value = iso;
      input.required = wantsPickup();
      if (!cap.available) {
        input.disabled = true;
      }

      const text = document.createElement("div");
      text.innerHTML = `<strong>${label}</strong>`;
      const meta = document.createElement("div");
      meta.className = "monday-option-meta";
      if (cap.available) {
        meta.textContent = `Remaining — bikes: ${Math.max(0, cap.remaining.bikes)}, loose jobs: ${Math.max(0, cap.remaining.loose)}`;
      } else {
        meta.textContent = cap.message;
      }

      text.appendChild(meta);
      wrap.appendChild(input);
      wrap.appendChild(text);
      mondayOptionsEl.appendChild(wrap);
    }
  }

  function updatePickupPriceDisplay() {
    const el = $("pickupPriceDisplay");
    const type = getPickupType();
    if (!el) return;
    if (!type) {
      el.textContent = "";
      return;
    }
    const p = BookingStorage.PICKUP_PRICING[type];
    el.innerHTML = `Selected pickup fee: <span class="pickup-price-highlight">$${p.price} AUD</span>`;
  }

  function togglePanels() {
    if (riderPanel) {
      riderPanel.classList.toggle("is-visible", needsRiderDetails());
    }
    if (pickupPanel) {
      pickupPanel.classList.toggle("is-visible", wantsPickup());
    }
    const pay = form.querySelector('input[name="payment_preference"]:checked')?.value;
    if (cashNote) {
      const isCash =
        pay === "cash_pickup" || pay === "cash_workshop";
      cashNote.classList.toggle("is-visible", isCash);
    }
  }

  function updatePickupAreaNotes() {
    if (!pickupAreaNotes) return;
    const area = form.querySelector('input[name="pickup_area"]:checked')?.value;
    pickupAreaNotes.textContent = area ? PICKUP_AREA_NOTES[area] || "" : "";
  }

  function renderServiceCards() {
    const grid = $("serviceGrid");
    if (!grid) return;
    grid.innerHTML = SERVICES.map(
      (s) => `
      <label class="service-card">
        <input type="checkbox" name="services" value="${s.id}" />
        <span class="service-card-inner">
          <span class="service-card-check" aria-hidden="true"></span>
          <span class="service-card-title">${s.label}</span>
        </span>
      </label>`
    ).join("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      const firstErr = form.querySelector(".form-field.has-error, #servicesError");
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      const payload = buildBookingPayload();
      const booking = BookingStorage.createBooking(payload);

      try {
        await sendBookingEmail(booking);
      } catch (emailErr) {
        console.warn(emailErr);
        /* Booking still saved locally; staff can view admin page */
      }

      form.hidden = true;
      confirmation.classList.add("is-visible");
      $("confirmationRef").textContent = booking.booking_id;
      confirmation.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      alert(err.message || "Could not submit booking. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit booking request";
    }
  }

  renderServiceCards();
  renderMondayOptions();
  togglePanels();

  form.addEventListener("change", (e) => {
    togglePanels();
    updatePickupAreaNotes();
    if (e.target.name === "pickup_type" || e.target.id === "wantsPickup") {
      renderMondayOptions();
      updatePickupPriceDisplay();
    }
    if (e.target.name === "services" || e.target.name === "payment_preference") {
      togglePanels();
    }
  });

  $("wantsPickup")?.addEventListener("change", () => {
    renderMondayOptions();
    togglePanels();
  });

  form.querySelectorAll('input[name="pickup_type"]').forEach((el) => {
    el.addEventListener("change", () => {
      renderMondayOptions();
      updatePickupPriceDisplay();
    });
  });

  form.addEventListener("submit", handleSubmit);
})();
