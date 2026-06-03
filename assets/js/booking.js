/**
 * Mountain Race Shop™ — booking form logic
 */

(function () {
  "use strict";

  const BOOKING_EMAIL_ENDPOINT =
    "https://formsubmit.co/ajax/fenianparktrading@gmail.com";
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

  if (!form || !window.BookingStorage || !window.BookingCatalog) return;

  const { BookingStorage } = window;
  const {
    ENGINE_SERVICES,
    TYRE_CATEGORIES,
    TYRE_CATALOG,
    BRAKE_PAD_OPTIONS,
    TYRE_FITTING_RATE,
  } = window.BookingCatalog;

  function $(id) {
    return document.getElementById(id);
  }

  function getSelectedServices() {
    return Array.from(
      form.querySelectorAll('input[name="services"]:checked')
    ).map((el) => el.value);
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
      getSelectedServices().length > 0 ||
      getSelectedEngineServices().length > 0 ||
      hasTyreOrder() ||
      hasBrakePadRequest()
    );
  }

  function needsRiderDetails() {
    return getSelectedServices().some((id) => RIDER_WEIGHT_SERVICES.has(id));
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

    if (wantsPickup()) {
      const pickupType = getPickupType();
      if (!pickupType) {
        setFieldError("pickup_type", "Select pickup type");
        valid = false;
      }
      const monday = form.querySelector(
        'input[name="preferred_monday_date"]:checked'
      );
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
    const fittingQty = $("tyreFittingRequired")?.checked
      ? Number($("tyre_fitting_quantity")?.value) || 0
      : 0;

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
      selected_engine_services: getSelectedEngineServices(),
      engine_hours: $("engine_hours")?.value.trim() || null,
      last_engine_rebuild_date:
        $("last_engine_rebuild_date")?.value.trim() || null,
      engine_symptoms: $("engine_symptoms")?.value.trim() || null,
      engine_running_status:
        form.querySelector('input[name="engine_running_status"]:checked')
          ?.value || null,
      engine_in_bike:
        form.querySelector('input[name="engine_in_bike"]:checked')?.value ||
        null,
      customer_supplied_engine_parts:
        form.querySelector('input[name="customer_supplied_engine_parts"]:checked')
          ?.value || null,
      supplied_parts_notes: $("supplied_parts_notes")?.value.trim() || null,
      selected_tyres: buildTyreSelectionDetails(),
      front_tyre_size: $("front_tyre_size")?.value.trim() || null,
      rear_tyre_size: $("rear_tyre_size")?.value.trim() || null,
      current_tyre_brand: $("current_tyre_brand")?.value.trim() || null,
      tyre_recommendation_required:
        getSelectedTyreCategories().includes("tyre_recommend") ||
        tyreRecommendationRequired(),
      tyre_fitting_required: $("tyreFittingRequired")?.checked === true,
      tyre_fitting_quantity: fittingQty || null,
      tyre_fitting_cost: getTyreFittingCost() || null,
      tube_required: $("tubeRequired")?.checked === true,
      tyre_terrain_type:
        form.querySelector('input[name="tyre_terrain_type"]:checked')?.value ||
        null,
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
      if (!cap.available) input.disabled = true;

      const text = document.createElement("div");
      text.innerHTML = `<strong>${label}</strong>`;
      const meta = document.createElement("div");
      meta.className = "monday-option-meta";
      meta.textContent = cap.available
        ? `Remaining — bikes: ${Math.max(0, cap.remaining.bikes)}, loose jobs: ${Math.max(0, cap.remaining.loose)}`
        : cap.message;

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

  function togglePanels() {
    if (riderPanel) riderPanel.classList.toggle("is-visible", needsRiderDetails());
    if (enginePanel) enginePanel.classList.toggle("is-visible", needsEngineDetails());
    if (tyrePanel) tyrePanel.classList.toggle("is-visible", hasTyreOrder());
    if (pickupPanel) pickupPanel.classList.toggle("is-visible", wantsPickup());

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

  renderCheckboxGrid("serviceGrid", "services", SERVICES);
  renderCheckboxGrid("engineGrid", "engine_services", ENGINE_SERVICES);
  renderCheckboxGrid("tyreCategoryGrid", "tyre_categories", TYRE_CATEGORIES);
  renderCheckboxGrid("brakePadGrid", "brake_pad_options", BRAKE_PAD_OPTIONS);
  renderTyreCatalog();
  renderMondayOptions();
  togglePanels();

  form.addEventListener("change", (e) => {
    handleBrakeExclusive(e);
    togglePanels();
    updatePickupAreaNotes();
    if (e.target.name === "pickup_type" || e.target.id === "wantsPickup") {
      renderMondayOptions();
      updatePickupPriceDisplay();
    }
    if (
      e.target.id === "tyreFittingRequired" ||
      e.target.id === "tyre_fitting_quantity"
    ) {
      updateTyreFittingDisplay();
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
