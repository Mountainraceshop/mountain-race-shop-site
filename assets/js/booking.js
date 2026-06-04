/**
 * Mountain Race Shop™ — booking form logic
 */

(function () {
  "use strict";

  const BOOKING_EMAIL_ENDPOINT =
    "https://formsubmit.co/ajax/fenianparktrading@gmail.com";
  const SEND_EMAIL_ON_SUBMIT = true;

  const BRAKE_REPLACE_IDS = new Set(["replace_front_quote", "replace_rear_quote"]);

  const PICKUP_AREA_NOTES = {
    tuggeranong: "Tuggeranong: exact pickup location to be confirmed.",
    watson:
      "Watson / North Canberra: near Watson / Dickson / nearby McDonald's or agreed meeting point.",
    fyshwick:
      "Fyshwick: exact pickup point to be confirmed. Driver must be out of Fyshwick by 12:00 noon each Monday.",
    other: "Other Canberra location — describe in notes below.",
  };

  const form = document.getElementById("bookingForm");
  const confirmation = document.getElementById("bookingConfirmation");
  const riderPanel = document.getElementById("riderPanel");
  const enginePanel = document.getElementById("enginePanel");
  const tyrePanel = document.getElementById("tyrePanel");
  const pickupPanel = document.getElementById("pickupPanel");
  const cashNote = document.getElementById("cashNote");
  const mondayOptionsEl = document.getElementById("mondayOptions");
  const pickupAreaNotes = document.getElementById("pickupAreaNotes");
  const submitBtn = document.getElementById("submitBooking");
  const suppliedPartsWrap = document.getElementById("suppliedPartsWrap");
  const tyreFittingQtyWrap = document.getElementById("tyreFittingQtyWrap");
  const tyreFittingCostDisplay = document.getElementById("tyreFittingCostDisplay");
  const suspensionOnBikeHint = document.getElementById("suspensionOnBikeHint");
  const suspensionOffBikeHint = document.getElementById("suspensionOffBikeHint");
  const pickupSuspensionHint = document.getElementById("pickupSuspensionHint");
  const estimatedTotalBreakdown = document.getElementById("estimatedTotalBreakdown");
  const estimatedTotalAmount = document.getElementById("estimatedTotalAmount");

  if (!form || !window.BookingStorage || !window.BookingCatalog) return;

  const { BookingStorage } = window;
  const {
    ENGINE_SERVICES,
    TYRE_CATEGORIES,
    TYRE_CATALOG,
    BRAKE_PAD_OPTIONS,
    TYRE_FITTING_RATE,
    SUSPENSION_SERVICES,
    getSuspensionServiceById,
    getRecommendedPickupType,
  } = window.BookingCatalog;

  function $(id) {
    return document.getElementById(id);
  }

  function getSelectedSuspensionServiceId() {
    const el = form.querySelector('input[name="suspension_service"]:checked');
    return el ? el.value : "";
  }

  function getSuspensionService() {
    return getSuspensionServiceById(getSelectedSuspensionServiceId());
  }

  function hasSuspensionSelection() {
    return Boolean(getSelectedSuspensionServiceId());
  }

  /** @deprecated — use selected_suspension_service; kept for admin backward compat */
  function getSelectedServices() {
    const svc = getSuspensionService();
    return svc ? [svc.label] : [];
  }

  function getSelectedEngineServices() {
    return Array.from(
      form.querySelectorAll('input[name="engine_services"]:checked')
    ).map((el) => el.value);
  }

  function getSelectedTyreCategories() {
    return Array.from(
      form.querySelectorAll('input[name="tyre_categories"]:checked')
    ).map((el) => el.value);
  }

  function getSelectedCatalogueTyres() {
    return Array.from(
      form.querySelectorAll('input[name="catalogue_tyres"]:checked')
    ).map((el) => el.value);
  }

  function getSelectedTyres() {
    const cats = getSelectedTyreCategories();
    const catalogue = getSelectedCatalogueTyres();
    return [...cats, ...catalogue];
  }

  function hasTyreOrder() {
    return (
      getSelectedTyreCategories().length > 0 ||
      getSelectedCatalogueTyres().length > 0 ||
      $("tyreFittingRequired")?.checked === true
    );
  }

  function tyreRecommendationRequired() {
    return getSelectedTyreCategories().includes("tyre_recommend");
  }

  function getBrakePadSelections() {
    return Array.from(
      form.querySelectorAll('input[name="brake_pad_options"]:checked')
    ).map((el) => el.value);
  }

  function hasBrakePadRequest() {
    const sel = getBrakePadSelections();
    return sel.length > 0 && !sel.includes("brake_no_thanks");
  }

  function hasAnyBookingSelection() {
    return (
      hasSuspensionSelection() ||
      getSelectedEngineServices().length > 0 ||
      hasTyreOrder() ||
      hasBrakePadRequest()
    );
  }

  function needsRiderDetails() {
    const svc = getSuspensionService();
    return Boolean(svc?.requiresRider);
  }

  function getEffectivePickupSlots() {
    if (!wantsPickup()) return { bikes: 0, loose: 0 };
    const suspension = getSuspensionService();
    if (suspension && (suspension.pickupBikes > 0 || suspension.pickupLoose > 0)) {
      return {
        bikes: suspension.pickupBikes,
        loose: suspension.pickupLoose,
      };
    }
    const pickupType = getPickupType();
    const meta = BookingStorage.PICKUP_PRICING[pickupType];
    if (!meta) return { bikes: 0, loose: 0 };
    return { bikes: meta.bikes, loose: meta.loose };
  }

  function getSuspensionPrice() {
    const svc = getSuspensionService();
    return svc?.price != null ? svc.price : 0;
  }

  function computeEstimatedFixedTotal() {
    let total = getSuspensionPrice();
    if (wantsPickup()) {
      const pickupType = getPickupType();
      const meta = BookingStorage.PICKUP_PRICING[pickupType];
      if (meta) total += meta.price;
    }
    total += getTyreFittingCost();
    return total;
  }

  function needsEngineDetails() {
    return getSelectedEngineServices().length > 0;
  }

  function wantsPickup() {
    return $("wantsPickup")?.checked === true;
  }

  function getPickupType() {
    const el = form.querySelector('input[name="pickup_type"]:checked');
    return el ? el.value : "";
  }

  function getTyreFittingCost() {
    if (!$("tyreFittingRequired")?.checked) return 0;
    const qty = Number($("tyre_fitting_quantity")?.value) || 0;
    return qty * TYRE_FITTING_RATE;
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

  function clearFieldError(fieldId) {
    const wrap = document.querySelector(`[data-field="${fieldId}"]`);
    if (!wrap) return;
    wrap.classList.remove("has-error");
    const err = wrap.querySelector(".field-error");
    if (err) err.textContent = "";
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

    if (!hasAnyBookingSelection()) {
      const servicesErr = $("servicesError");
      if (servicesErr) {
        servicesErr.style.display = "block";
        servicesErr.textContent =
          "Select at least one suspension, engine, tyre or brake pad option";
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

    if (needsEngineDetails()) {
      if (!$("engine_symptoms")?.value.trim()) {
        setFieldError(
          "engine_symptoms",
          "Describe current symptoms / reason for rebuild"
        );
        valid = false;
      }
    }

    if (hasTyreOrder()) {
      const recommend = getSelectedTyreCategories().includes("tyre_recommend");
      const hasSize =
        $("front_tyre_size")?.value.trim() ||
        $("rear_tyre_size")?.value.trim();
      const hasCatalogue = getSelectedCatalogueTyres().length > 0;

      if (!recommend && !hasSize && !hasCatalogue) {
        setFieldError(
          "front_tyre_size",
          "Enter a tyre size, select a catalogue tyre, or choose “please recommend”"
        );
        valid = false;
      }

      if ($("tyreFittingRequired")?.checked) {
        const qty = Number($("tyre_fitting_quantity")?.value);
        if (!qty || qty < 1) {
          setFieldError(
            "tyre_fitting_quantity",
            "Enter how many tyres need fitting"
          );
          valid = false;
        }
      }
    }

    const brakeSel = getBrakePadSelections();
    for (const id of brakeSel) {
      if (BRAKE_REPLACE_IDS.has(id)) {
        const opt = BRAKE_PAD_OPTIONS.find((o) => o.id === id);
        if (opt && !opt.label.includes("quote first")) {
          console.warn("Brake option must be quote first:", id);
        }
      }
    }

    const suspension = getSuspensionService();
    if (suspension?.price != null && !$("extra_parts_note_acknowledged")?.checked) {
      setFieldError(
        "extra_parts_note_acknowledged",
        "Please acknowledge that wear parts may be extra"
      );
      valid = false;
    }

    if (wantsPickup()) {
      const pickupType = getPickupType();
      if (!pickupType) {
        setFieldError("pickup_type", "Select pickup type");
        valid = false;
      }
      if (suspension?.location === "on_bike" && pickupType && pickupType !== "complete_bike") {
        setFieldError(
          "pickup_type",
          "On-the-bike suspension service requires complete bike pickup/drop-off"
        );
        valid = false;
      }
      if (
        suspension?.location === "off_bike" &&
        suspension.pickupLoose > 0 &&
        pickupType === "complete_bike"
      ) {
        setFieldError(
          "pickup_type",
          "Off-the-bike suspension should use loose fork/shock pickup (not complete bike)"
        );
        valid = false;
      }
      const monday = form.querySelector(
        'input[name="preferred_monday_date"]:checked'
      );
      const slots = getEffectivePickupSlots();
      if (!monday) {
        setFieldError("preferred_monday_date", "Select a Monday date");
        valid = false;
      } else if (BookingStorage.isPickupDateBlocked(monday.value)) {
        setFieldError(
          "preferred_monday_date",
          BookingStorage.BLOCKED_PICKUP_DATE_MESSAGE
        );
        valid = false;
      } else if (monday.disabled) {
        setFieldError("preferred_monday_date", "Selected Monday is at capacity");
        valid = false;
      } else if (slots.bikes > 0 || slots.loose > 0) {
        const cap = BookingStorage.getCapacityForSlots(monday.value, slots);
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

  function buildTyreSelectionDetails() {
    const selected = [];
    for (const id of getSelectedTyreCategories()) {
      const cat = TYRE_CATEGORIES.find((c) => c.id === id);
      selected.push(cat ? cat.label : id);
    }
    for (const code of getSelectedCatalogueTyres()) {
      for (const group of TYRE_CATALOG) {
        const item = group.items.find((i) => i.id === code);
        if (item) {
          selected.push(
            `${group.group} ${item.size} (${item.code}) RRP $${item.rrp.toFixed(2)} — order only`
          );
        }
      }
    }
    return selected;
  }

  function buildBookingPayload() {
    const pickupType = wantsPickup() ? getPickupType() : "";
    const pricing = pickupType ? BookingStorage.PICKUP_PRICING[pickupType] : null;
    const pickupAreaEl = form.querySelector('input[name="pickup_area"]:checked');
    const brakeSel = getBrakePadSelections();
    const includeEngineDetails = needsEngineDetails();
    const includeTyreOrder = hasTyreOrder();
    const fittingQty = includeTyreOrder && $("tyreFittingRequired")?.checked
      ? Number($("tyre_fitting_quantity")?.value) || 0
      : 0;
    const suspension = getSuspensionService();
    const suspensionId = getSelectedSuspensionServiceId();
    const pickupSlots = wantsPickup() ? getEffectivePickupSlots() : { bikes: 0, loose: 0 };
    const extraPartsNoteAcknowledged =
      $("extra_parts_note_acknowledged")?.checked === true;

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
      selected_suspension_service: suspension ? suspension.label : null,
      suspension_service_id: suspensionId || null,
      suspension_service_price: suspension?.price ?? null,
      suspension_service_location_type: suspension?.location || null,
      air_fork_service: suspension?.airFork === true,
      includes_fork_springs: suspension?.includesForkSprings === true,
      includes_shock_spring: suspension?.includesShockSpring === true,
      estimated_fixed_total: computeEstimatedFixedTotal(),
      extra_parts_note_acknowledged: extraPartsNoteAcknowledged,
      pickup_capacity_bikes: pickupSlots.bikes,
      pickup_capacity_loose: pickupSlots.loose,
      wear_parts_extra_note:
        suspension?.price != null && extraPartsNoteAcknowledged
          ? "Wear parts extra if needed. We will contact you before fitting extra parts."
          : null,
      selected_engine_services: getSelectedEngineServices(),
      engine_hours: includeEngineDetails
        ? $("engine_hours")?.value.trim() || null
        : null,
      last_engine_rebuild_date:
        includeEngineDetails
          ? $("last_engine_rebuild_date")?.value.trim() || null
          : null,
      engine_symptoms: includeEngineDetails
        ? $("engine_symptoms")?.value.trim() || null
        : null,
      engine_running_status: includeEngineDetails
        ? form.querySelector('input[name="engine_running_status"]:checked')
            ?.value || null
        : null,
      engine_in_bike: includeEngineDetails
        ? form.querySelector('input[name="engine_in_bike"]:checked')?.value ||
          null
        : null,
      customer_supplied_engine_parts:
        includeEngineDetails
          ? form.querySelector(
              'input[name="customer_supplied_engine_parts"]:checked'
            )?.value || null
          : null,
      supplied_parts_notes: includeEngineDetails
        ? $("supplied_parts_notes")?.value.trim() || null
        : null,
      selected_tyres: includeTyreOrder ? buildTyreSelectionDetails() : [],
      front_tyre_size: includeTyreOrder
        ? $("front_tyre_size")?.value.trim() || null
        : null,
      rear_tyre_size: includeTyreOrder
        ? $("rear_tyre_size")?.value.trim() || null
        : null,
      current_tyre_brand: includeTyreOrder
        ? $("current_tyre_brand")?.value.trim() || null
        : null,
      tyre_recommendation_required:
        includeTyreOrder && tyreRecommendationRequired(),
      tyre_fitting_required:
        includeTyreOrder && $("tyreFittingRequired")?.checked === true,
      tyre_fitting_quantity: fittingQty || null,
      tyre_fitting_cost: includeTyreOrder ? getTyreFittingCost() || null : null,
      tube_required: includeTyreOrder && $("tubeRequired")?.checked === true,
      tyre_terrain_type: includeTyreOrder
        ? form.querySelector('input[name="tyre_terrain_type"]:checked')?.value ||
          null
        : null,
      brake_pad_check_options: brakeSel.filter((id) => id !== "brake_no_thanks"),
      brake_pad_oil_contamination_check: brakeSel.includes(
        "check_oil_contamination"
      ),
      brake_pad_quote_required: brakeSel.some((id) =>
        BRAKE_REPLACE_IDS.has(id)
      ),
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
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("; ") : v}`)
      .join("\n");
  }

  async function sendBookingEmail(booking) {
    if (!SEND_EMAIL_ON_SUBMIT || !BOOKING_EMAIL_ENDPOINT) return;

    const payload = {
      _subject: `New workshop booking — ${booking.booking_id}`,
      _template: "table",
      booking_id: booking.booking_id,
      customer_name: booking.customer_name,
      phone: booking.phone,
      email: booking.email,
      bike: `${booking.bike_brand} ${booking.bike_model} (${booking.bike_year})`,
      selected_suspension_service: booking.selected_suspension_service,
      suspension_service_price: booking.suspension_service_price,
      estimated_fixed_total: booking.estimated_fixed_total,
      selected_services: (booking.selected_services || []).join(", "),
      selected_engine_services: (booking.selected_engine_services || []).join(
        ", "
      ),
      selected_tyres: (booking.selected_tyres || []).join("; "),
      tyre_fitting_cost: booking.tyre_fitting_cost,
      brake_pad_check_options: (booking.brake_pad_check_options || []).join(
        ", "
      ),
      wants_pickup_dropoff: booking.wants_pickup_dropoff ? "Yes" : "No",
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
    const slots = getEffectivePickupSlots();
    const mondays = BookingStorage.getUpcomingMondays(16);
    mondayOptionsEl.innerHTML = "";

    if (!pickupType && slots.bikes === 0 && slots.loose === 0) {
      mondayOptionsEl.innerHTML =
        '<p class="section-hint">Select a suspension service or pickup type to see available Mondays.</p>';
      return;
    }

    for (const iso of mondays) {
      const cap = BookingStorage.getCapacityForSlots(iso, slots);
      const isBlocked = BookingStorage.isPickupDateBlocked(iso);
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
      if (!cap.available) input.disabled = true;

      const text = document.createElement("div");
      text.innerHTML = `<strong>${label}</strong>`;
      const meta = document.createElement("div");
      meta.className = "monday-option-meta";
      meta.textContent = isBlocked
        ? BookingStorage.BLOCKED_PICKUP_DATE_MESSAGE
        : cap.available
          ? `Remaining — bikes: ${Math.max(0, cap.remaining.bikes)}, loose jobs: ${Math.max(0, cap.remaining.loose)}`
          : cap.message;

      text.appendChild(meta);
      wrap.appendChild(input);
      wrap.appendChild(text);
      mondayOptionsEl.appendChild(wrap);
    }
  }

  function updatePreferredMondayDateError() {
    const monday = form.querySelector(
      'input[name="preferred_monday_date"]:checked'
    );
    if (
      wantsPickup() &&
      monday &&
      BookingStorage.isPickupDateBlocked(monday.value)
    ) {
      setFieldError(
        "preferred_monday_date",
        BookingStorage.BLOCKED_PICKUP_DATE_MESSAGE
      );
      return;
    }
    clearFieldError("preferred_monday_date");
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

  function updateTyreFittingDisplay() {
    const fitting = $("tyreFittingRequired")?.checked;
    if (tyreFittingQtyWrap) {
      tyreFittingQtyWrap.style.display = fitting ? "block" : "none";
    }
    if (tyreFittingCostDisplay) {
      if (fitting) {
        const cost = getTyreFittingCost();
        const qty = Number($("tyre_fitting_quantity")?.value) || 0;
        tyreFittingCostDisplay.style.display = "block";
        tyreFittingCostDisplay.textContent = `Estimated fitting: $${cost} AUD (${qty} tyre${qty === 1 ? "" : "s"} × $${TYRE_FITTING_RATE}). Tube extra if required.`;
      } else {
        tyreFittingCostDisplay.style.display = "none";
      }
    }
  }

  function updateSuspensionHints() {
    const svc = getSuspensionService();
    if (suspensionOnBikeHint) {
      if (svc?.location === "on_bike") {
        suspensionOnBikeHint.style.display = "block";
        suspensionOnBikeHint.textContent =
          svc.onBikeNote ||
          "Complete bike required. Monday pickup/drop-off uses a complete bike slot (max 3 per Monday).";
      } else {
        suspensionOnBikeHint.style.display = "none";
      }
    }
    if (suspensionOffBikeHint) {
      if (svc?.location === "off_bike" && svc.pickupLoose > 0) {
        suspensionOffBikeHint.style.display = "block";
        suspensionOffBikeHint.textContent =
          "Off-the-bike service: deliver forks/shock loose. Monday pickup uses loose suspension job capacity (max 10 per Monday).";
      } else {
        suspensionOffBikeHint.style.display = "none";
      }
    }
    if (pickupSuspensionHint && wantsPickup()) {
      const rec = getRecommendedPickupType(svc);
      if (rec && svc) {
        const label = BookingStorage.PICKUP_PRICING[rec]?.label || rec;
        pickupSuspensionHint.style.display = "block";
        pickupSuspensionHint.textContent = `Recommended pickup for your suspension service: ${label}.`;
      } else {
        pickupSuspensionHint.style.display = "none";
      }
    } else if (pickupSuspensionHint) {
      pickupSuspensionHint.style.display = "none";
    }
  }

  function updateEstimatedTotalDisplay() {
    if (!estimatedTotalBreakdown || !estimatedTotalAmount) return;
    const lines = [];
    const suspension = getSuspensionService();
    if (suspension?.price != null) {
      lines.push({ label: suspension.label, amount: suspension.price });
    } else if (suspension) {
      lines.push({ label: suspension.label, amount: null });
    }
    if (wantsPickup()) {
      const meta = BookingStorage.PICKUP_PRICING[getPickupType()];
      if (meta) {
        lines.push({ label: meta.label, amount: meta.price });
      }
    }
    const fitting = getTyreFittingCost();
    if (fitting > 0) {
      lines.push({ label: "Tyre fitting", amount: fitting });
    }

    estimatedTotalBreakdown.innerHTML = lines
      .map((line) => {
        const amt =
          line.amount != null
            ? `$${line.amount}`
            : "<em>Quoted / confirmed later</em>";
        return `<div class="estimate-line"><span>${line.label}</span><span>${amt}</span></div>`;
      })
      .join("");

    const total = computeEstimatedFixedTotal();
    estimatedTotalAmount.textContent =
      total > 0 ? `$${total} AUD` : "— (no fixed-price items selected)";
  }

  function renderSuspensionPricingSchedule() {
    const el = $("suspensionPricingSchedule");
    if (!el) return;
    el.innerHTML = SUSPENSION_SERVICES.filter((s) => s.price != null)
      .map(
        (s, i) => `
      <article class="pricing-schedule-item">
        <h3>${i + 1}. ${s.label}</h3>
        <p class="pricing-schedule-price">Price: $${s.price}</p>
        <p class="section-hint">Includes:</p>
        <ul class="pricing-includes">${s.includes.map((x) => `<li>${x}</li>`).join("")}</ul>
      </article>`
      )
      .join("");
  }

  function renderSuspensionCards() {
    const grid = $("serviceGrid");
    if (!grid) return;
    const noneCard = `
      <label class="service-card service-card--priced">
        <input type="radio" name="suspension_service" value="" checked />
        <span class="service-card-inner">
          <span class="service-card-check" aria-hidden="true"></span>
          <span class="service-card-body">
            <span class="service-card-title">No suspension service</span>
            <span class="service-price-badge service-price-badge--muted">Skip</span>
          </span>
        </span>
      </label>`;
    grid.innerHTML = noneCard + SUSPENSION_SERVICES.map((s) => {
      const priceHtml = s.price
        ? `<span class="service-price-badge">${s.priceLabel}</span>`
        : `<span class="service-price-badge service-price-badge--muted">${s.priceLabel}</span>`;
      return `
      <label class="service-card service-card--priced">
        <input type="radio" name="suspension_service" value="${s.id}" />
        <span class="service-card-inner">
          <span class="service-card-check" aria-hidden="true"></span>
          <span class="service-card-body">
            <span class="service-card-title">${s.label}${s.price ? ` — ${s.priceLabel}` : ""}</span>
            ${priceHtml}
          </span>
        </span>
      </label>`;
    }).join("");
  }

  function togglePanels() {
    if (riderPanel) riderPanel.classList.toggle("is-visible", needsRiderDetails());
    if (enginePanel) enginePanel.classList.toggle("is-visible", needsEngineDetails());
    if (tyrePanel) tyrePanel.classList.toggle("is-visible", hasTyreOrder());
    if (pickupPanel) pickupPanel.classList.toggle("is-visible", wantsPickup());

    updateSuspensionHints();
    updateEstimatedTotalDisplay();

    const supplied =
      form.querySelector('input[name="customer_supplied_engine_parts"]:checked')
        ?.value === "Yes";
    if (suppliedPartsWrap) {
      suppliedPartsWrap.style.display = supplied ? "block" : "none";
    }

    updateTyreFittingDisplay();

    const pay = form.querySelector('input[name="payment_preference"]:checked')?.value;
    if (cashNote) {
      cashNote.classList.toggle(
        "is-visible",
        pay === "cash_pickup" || pay === "cash_workshop"
      );
    }
  }

  function updatePickupAreaNotes() {
    if (!pickupAreaNotes) return;
    const area = form.querySelector('input[name="pickup_area"]:checked')?.value;
    pickupAreaNotes.textContent = area ? PICKUP_AREA_NOTES[area] || "" : "";
  }

  function renderCheckboxGrid(containerId, name, items, cols) {
    const grid = $(containerId);
    if (!grid) return;
    grid.innerHTML = items
      .map(
        (s) => `
      <label class="service-card">
        <input type="checkbox" name="${name}" value="${s.id}" />
        <span class="service-card-inner">
          <span class="service-card-check" aria-hidden="true"></span>
          <span class="service-card-title">${s.label}</span>
        </span>
      </label>`
      )
      .join("");
    if (cols === 1) grid.classList.add("service-grid-single");
  }

  function renderTyreCatalog() {
    const grid = $("tyreCatalogGrid");
    if (!grid) return;
    grid.innerHTML = TYRE_CATALOG.map(
      (group) => `
      <div class="tyre-catalog-group">
        <h3 class="tyre-catalog-heading">${group.group}</h3>
        <p class="section-hint">Order only — availability to be confirmed</p>
        <div class="tyre-catalog-items">
          ${group.items
            .map(
              (item) => `
            <label class="service-card tyre-catalog-card">
              <input type="checkbox" name="catalogue_tyres" value="${item.id}" />
              <span class="service-card-inner">
                <span class="service-card-check" aria-hidden="true"></span>
                <span class="service-card-title">${item.size}</span>
                <span class="tyre-catalog-meta">Code ${item.code} · Listed $${item.tradeExGst.toFixed(2)} ex GST · RRP $${item.rrp.toFixed(2)}</span>
              </span>
            </label>`
            )
            .join("")}
        </div>
      </div>`
    ).join("");
  }

  function handleBrakeExclusive(e) {
    if (e.target.name !== "brake_pad_options") return;
    if (e.target.value === "brake_no_thanks" && e.target.checked) {
      form
        .querySelectorAll('input[name="brake_pad_options"]')
        .forEach((el) => {
          if (el.value !== "brake_no_thanks") el.checked = false;
        });
    } else if (e.target.checked && e.target.value !== "brake_no_thanks") {
      const noThanks = form.querySelector(
        'input[name="brake_pad_options"][value="brake_no_thanks"]'
      );
      if (noThanks) noThanks.checked = false;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      const firstErr = form.querySelector(
        ".form-field.has-error, #servicesError"
      );
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

  renderSuspensionPricingSchedule();
  renderSuspensionCards();
  renderCheckboxGrid("engineGrid", "engine_services", ENGINE_SERVICES);
  renderCheckboxGrid("tyreCategoryGrid", "tyre_categories", TYRE_CATEGORIES);
  renderCheckboxGrid("brakePadGrid", "brake_pad_options", BRAKE_PAD_OPTIONS);
  renderTyreCatalog();
  renderMondayOptions();
  togglePanels();
  updateEstimatedTotalDisplay();

  form.addEventListener("change", (e) => {
    handleBrakeExclusive(e);
    togglePanels();
    updatePickupAreaNotes();
    if (
      e.target.name === "pickup_type" ||
      e.target.id === "wantsPickup" ||
      e.target.name === "suspension_service"
    ) {
      renderMondayOptions();
      updatePickupPriceDisplay();
    }
    if (e.target.name === "preferred_monday_date") {
      updatePreferredMondayDateError();
    }
    if (
      e.target.id === "tyreFittingRequired" ||
      e.target.id === "tyre_fitting_quantity"
    ) {
      updateTyreFittingDisplay();
      updateEstimatedTotalDisplay();
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
