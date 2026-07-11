/**
 * Mountain Race Shop™ — production booking adapter.
 *
 * Runs only when assets/js/supabase-config.js contains a URL and anon key.
 * It intercepts form submission before the legacy local fallback, submits the
 * booking through an atomic Supabase RPC, and refreshes shared Monday capacity.
 */
(function () {
  "use strict";

  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const config = window.MRS_SUPABASE_CONFIG || {};
  window.MRS_PRODUCTION_BOOKING_READY = false;
  window.MRS_PRODUCTION_BOOKING_UNAVAILABLE = false;

  if (!config.url || !config.anonKey) {
    window.MRS_PRODUCTION_BOOKING_UNAVAILABLE = true;
    const form = document.getElementById("bookingForm");
    form?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.alert(
          "Online booking is not configured yet. Please contact Mountain Race Shop directly."
        );
      },
      true
    );
    console.error("Supabase booking configuration is missing.");
    return;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (window.supabase) resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load secure booking service."));
      document.head.appendChild(script);
    });
  }

  const byId = (id) => document.getElementById(id);
  const fieldValue = (id) => byId(id)?.value?.trim() || "";
  const selectedValue = (name) =>
    document.querySelector(`input[name="${name}"]:checked`)?.value || "";
  const selectedValues = (name) =>
    Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
      (element) => element.value
    );
  const checked = (id) => byId(id)?.checked === true;

  function suspensionService() {
    const id = selectedValue("suspension_service");
    return window.BookingCatalog?.getSuspensionServiceById?.(id) || null;
  }

  function pickupSlots() {
    if (!checked("wantsPickup")) return { bikes: 0, loose: 0 };
    const service = suspensionService();
    if (service && (service.pickupBikes > 0 || service.pickupLoose > 0)) {
      return { bikes: service.pickupBikes || 0, loose: service.pickupLoose || 0 };
    }
    const meta = window.BookingStorage?.PICKUP_PRICING?.[selectedValue("pickup_type")];
    return meta ? { bikes: meta.bikes, loose: meta.loose } : { bikes: 0, loose: 0 };
  }

  function selectedTyreDetails() {
    const details = [];
    const catalog = window.BookingCatalog || {};
    for (const id of selectedValues("tyre_categories")) {
      const category = catalog.TYRE_CATEGORIES?.find((item) => item.id === id);
      details.push(category?.label || id);
    }
    for (const id of selectedValues("catalogue_tyres")) {
      for (const group of catalog.TYRE_CATALOG || []) {
        const item = group.items?.find((entry) => entry.id === id);
        if (item) {
          details.push(`${group.group} ${item.size} (${item.code}) — order only`);
        }
      }
    }
    return details;
  }

  function hasAnyService() {
    const brake = selectedValues("brake_pad_options").filter(
      (value) => value !== "brake_no_thanks"
    );
    return Boolean(
      selectedValue("suspension_service") ||
        selectedValues("engine_services").length ||
        selectedValues("tyre_categories").length ||
        selectedValues("catalogue_tyres").length ||
        checked("tyreFittingRequired") ||
        brake.length
    );
  }

  function fail(message, element) {
    window.alert(message);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus?.();
    return false;
  }

  function validateProductionForm(form) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    if (!hasAnyService()) {
      return fail("Select at least one suspension, engine, tyre or brake-pad option.", byId("servicesError"));
    }

    const service = suspensionService();
    if (service?.requiresRider) {
      if (!fieldValue("rider_body_weight_kg")) {
        return fail("Rider body weight is required for spring or revalve work.", byId("rider_body_weight_kg"));
      }
      if (!selectedValue("skill_level") || !selectedValue("riding_type")) {
        return fail("Select the rider skill level and main riding type.", byId("riderPanel"));
      }
    }

    if (selectedValues("engine_services").length && !fieldValue("engine_symptoms")) {
      return fail("Describe the current engine symptoms or reason for rebuild.", byId("engine_symptoms"));
    }

    const hasTyreOrder =
      selectedValues("tyre_categories").length ||
      selectedValues("catalogue_tyres").length ||
      checked("tyreFittingRequired");
    const tyreRecommendation = selectedValues("tyre_categories").includes("tyre_recommend");
    if (
      hasTyreOrder &&
      !tyreRecommendation &&
      !fieldValue("front_tyre_size") &&
      !fieldValue("rear_tyre_size") &&
      !selectedValues("catalogue_tyres").length
    ) {
      return fail("Enter a tyre size, choose a catalogue tyre, or request a recommendation.", byId("front_tyre_size"));
    }
    if (checked("tyreFittingRequired")) {
      const fittingQuantity = Number(fieldValue("tyre_fitting_quantity"));
      if (
        !Number.isInteger(fittingQuantity) ||
        fittingQuantity < 1 ||
        fittingQuantity > 4
      ) {
        return fail("Enter how many tyres need fitting (1 to 4).", byId("tyre_fitting_quantity"));
      }
    }

    if (service?.price != null && !checked("extra_parts_note_acknowledged")) {
      return fail("Please acknowledge that extra wear parts may be required.", byId("extra_parts_note_acknowledged"));
    }

    if (checked("wantsPickup")) {
      if (!selectedValue("pickup_type")) {
        return fail("Select a Canberra pickup type.", document.querySelector('[data-field="pickup_type"]'));
      }
      if (!selectedValue("preferred_monday_date")) {
        return fail("Select an available Monday pickup date.", document.querySelector('[data-field="preferred_monday_date"]'));
      }
      if (!selectedValue("pickup_area")) {
        return fail("Select a Canberra pickup area.", document.querySelector('[data-field="pickup_area"]'));
      }
      const recommendedPickup =
        window.BookingCatalog?.getRecommendedPickupType?.(service) || null;
      if (recommendedPickup && selectedValue("pickup_type") !== recommendedPickup) {
        const pickupLabel =
          window.BookingStorage?.PICKUP_PRICING?.[recommendedPickup]?.label ||
          recommendedPickup;
        return fail(
          `This suspension service requires: ${pickupLabel}.`,
          document.querySelector('[data-field="pickup_type"]')
        );
      }
    }

    if (!checked("accepted_terms")) {
      return fail("Please accept the booking and pricing notice.", byId("accepted_terms"));
    }
    return true;
  }

  function buildPayload() {
    const service = suspensionService();
    const slots = pickupSlots();
    const pickupType = checked("wantsPickup") ? selectedValue("pickup_type") : "";
    const pickupMeta = window.BookingStorage?.PICKUP_PRICING?.[pickupType];
    const fittingQuantity = checked("tyreFittingRequired")
      ? Number(fieldValue("tyre_fitting_quantity") || 0)
      : 0;
    const fittingRate = Number(window.BookingCatalog?.TYRE_FITTING_RATE || 30);
    const fittingCost = fittingQuantity * fittingRate;
    const fixedTotal =
      Number(service?.price || 0) + Number(pickupMeta?.price || 0) + fittingCost;
    const brakeSelections = selectedValues("brake_pad_options").filter(
      (value) => value !== "brake_no_thanks"
    );
    const params = new URLSearchParams(window.location.search);

    return {
      customer_name: fieldValue("customer_name"),
      phone: fieldValue("phone"),
      email: fieldValue("email"),
      suburb: fieldValue("suburb"),
      preferred_contact_method: selectedValue("preferred_contact_method"),
      bike_brand: fieldValue("bike_brand"),
      bike_model: fieldValue("bike_model"),
      bike_year: fieldValue("bike_year"),
      motorcycle_type: selectedValue("motorcycle_type"),
      suspension_removed_status: selectedValue("suspension_removed_status"),
      selected_services: service ? [service.label] : [],
      selected_suspension_service: service?.label || null,
      suspension_service_id: service?.id || null,
      suspension_service_price: service?.price ?? null,
      suspension_service_location_type: service?.location || null,
      air_fork_service: service?.airFork === true,
      includes_fork_springs: service?.includesForkSprings === true,
      includes_shock_spring: service?.includesShockSpring === true,
      estimated_fixed_total: fixedTotal,
      extra_parts_note_acknowledged: checked("extra_parts_note_acknowledged"),
      selected_engine_services: selectedValues("engine_services"),
      engine_hours: fieldValue("engine_hours") || null,
      last_engine_rebuild_date: fieldValue("last_engine_rebuild_date") || null,
      engine_symptoms: fieldValue("engine_symptoms") || null,
      engine_running_status: selectedValue("engine_running_status") || null,
      engine_in_bike: selectedValue("engine_in_bike") || null,
      customer_supplied_engine_parts:
        selectedValue("customer_supplied_engine_parts") || null,
      supplied_parts_notes: fieldValue("supplied_parts_notes") || null,
      selected_tyres: selectedTyreDetails(),
      front_tyre_size: fieldValue("front_tyre_size") || null,
      rear_tyre_size: fieldValue("rear_tyre_size") || null,
      current_tyre_brand: fieldValue("current_tyre_brand") || null,
      tyre_recommendation_required: selectedValues("tyre_categories").includes(
        "tyre_recommend"
      ),
      tyre_fitting_required: checked("tyreFittingRequired"),
      tyre_fitting_quantity: fittingQuantity || null,
      tyre_fitting_cost: fittingCost || null,
      tube_required: checked("tubeRequired"),
      tyre_terrain_type: selectedValue("tyre_terrain_type") || null,
      brake_pad_check_options: brakeSelections,
      brake_pad_oil_contamination_check: brakeSelections.includes(
        "check_oil_contamination"
      ),
      brake_pad_quote_required: brakeSelections.some((value) =>
        ["replace_front_quote", "replace_rear_quote"].includes(value)
      ),
      rider_body_weight_kg: fieldValue("rider_body_weight_kg") || null,
      rider_weight_with_gear_kg: fieldValue("rider_weight_with_gear_kg") || null,
      skill_level: selectedValue("skill_level") || null,
      riding_type: selectedValue("riding_type") || null,
      rider_complaint_or_goal: fieldValue("rider_complaint_or_goal") || null,
      wants_pickup_dropoff: checked("wantsPickup"),
      pickup_type: pickupType || null,
      pickup_price: pickupMeta?.price ?? null,
      preferred_monday_date: selectedValue("preferred_monday_date") || null,
      pickup_area: selectedValue("pickup_area") || null,
      pickup_notes: fieldValue("pickup_notes") || null,
      pickup_capacity_bikes: slots.bikes,
      pickup_capacity_loose: slots.loose,
      payment_preference: selectedValue("payment_preference"),
      accepted_terms: checked("accepted_terms"),
      source: params.get("utm_source") || params.get("source") || "website_direct",
      campaign: params.get("utm_campaign") || null,
      medium: params.get("utm_medium") || null,
      referral_code: params.get("ref") || params.get("referral_code") || null,
      landing_page: window.location.href,
    };
  }

  function trackBookingRequest(bookingId, estimatedValue) {
    window.mrsTrackBookingRequest = window.mrsTrackBookingRequest || function (data) {
      if (typeof window.fbq === "function" && config.metaPixelId) {
        window.fbq("track", "Lead", data);
      }
    };
    window.mrsTrackBookingRequest({
      content_name: "Workshop booking request",
      booking_id: bookingId,
      value: Number(estimatedValue || 0),
      currency: "AUD",
    });
  }

  function showConfirmation(bookingId) {
    const form = byId("bookingForm");
    const confirmation = byId("bookingConfirmation");
    form.hidden = true;
    confirmation?.classList.add("is-visible");
    if (byId("confirmationRef")) byId("confirmationRef").textContent = bookingId;
    confirmation?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function replaceContactEmail() {
    if (!config.contactEmail) return;
    document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
      if (link.textContent.includes("fenianparktrading")) {
        link.href = `mailto:${config.contactEmail}`;
        link.textContent = config.contactEmail;
      }
    });
  }

  async function refreshSharedCapacity(client) {
    if (!checked("wantsPickup")) return;
    const radios = Array.from(
      document.querySelectorAll('input[name="preferred_monday_date"]')
    );
    const dates = radios.map((radio) => radio.value).filter(Boolean);
    if (!dates.length) return;

    const { data, error } = await client.rpc("get_pickup_availability", {
      p_dates: dates,
    });
    if (error) {
      console.warn("Could not refresh shared pickup capacity", error);
      return;
    }

    const need = pickupSlots();
    const byDate = new Map((data || []).map((row) => [row.pickup_date, row]));
    for (const radio of radios) {
      const row = byDate.get(radio.value);
      if (!row) continue;
      const statusAvailable = row.date_status === "available";
      const enoughCapacity =
        Number(row.bikes_remaining) >= need.bikes &&
        Number(row.loose_remaining) >= need.loose;
      const available = statusAvailable && enoughCapacity;
      radio.disabled = !available;
      if (!available && radio.checked) radio.checked = false;
      const label = radio.closest("label");
      label?.classList.toggle("is-disabled", !available);
      const meta = label?.querySelector(".monday-option-meta");
      if (meta) {
        meta.textContent = available
          ? `Remaining — bikes: ${row.bikes_remaining}, loose jobs: ${row.loose_remaining}`
          : row.customer_message ||
            (row.date_status !== "available"
              ? "No Canberra pickup run is available on this date."
              : need.bikes > Number(row.bikes_remaining)
                ? "Bike pickup capacity full for this Monday."
                : "Loose suspension pickup capacity full for this Monday.");
      }
    }
  }

  async function init() {
    await loadScript(SDK_URL);
    const client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const form = byId("bookingForm");
    if (!form) return;

    replaceContactEmail();

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!validateProductionForm(form)) return;

        const button = byId("submitBooking");
        button.disabled = true;
        button.textContent = "Sending…";
        try {
          const payload = buildPayload();
          const { data, error } = await client.rpc("create_booking_atomic", {
            p_payload: payload,
          });
          if (error) throw error;
          const result = Array.isArray(data) ? data[0] : data;
          const bookingId = result?.booking_id;
          if (!bookingId) throw new Error("The booking was not confirmed by the server.");

          if (config.notificationsFunction) {
            client.functions
              .invoke(config.notificationsFunction, {
                body: {
                  booking_id: bookingId,
                  notification_token: result.notification_token,
                },
              })
              .catch((notificationError) =>
                console.warn("Booking saved; notification delivery needs attention", notificationError)
              );
          }
          trackBookingRequest(bookingId, result.estimated_fixed_total);
          showConfirmation(bookingId);
        } catch (error) {
          const message = String(error?.message || "");
          const invalidMatch = message.match(/MRS_INVALID:\s*(.+)$/);
          const alertMessage = message.includes("MRS_CAPACITY")
            ? "That Monday filled while you were completing the form. Please choose another available Monday."
            : message.includes("MRS_DATE_UNAVAILABLE")
              ? "That Monday is no longer available for Canberra pickup. Please choose another date."
              : message.includes("MRS_INVALID")
                ? `Your booking was not saved. Please check the form: ${invalidMatch?.[1] || "some details are invalid."}`
                : "Your booking was not saved. Please check your connection and try again.";
          window.alert(alertMessage);
          await refreshSharedCapacity(client);
        } finally {
          button.disabled = false;
          button.textContent = "Submit booking request";
        }
      },
      true
    );

    const scheduleRefresh = () =>
      window.setTimeout(() => refreshSharedCapacity(client), 50);
    form.addEventListener("change", (event) => {
      if (
        ["pickup_type", "suspension_service"].includes(event.target.name) ||
        event.target.id === "wantsPickup"
      ) {
        scheduleRefresh();
      }
    });
    scheduleRefresh();
    window.setInterval(() => refreshSharedCapacity(client), 60000);
    window.MRS_PRODUCTION_BOOKING_READY = true;
    window.MRS_PRODUCTION_BOOKING_UNAVAILABLE = false;
  }

  init().catch((error) => {
    window.MRS_PRODUCTION_BOOKING_READY = false;
    window.MRS_PRODUCTION_BOOKING_UNAVAILABLE = true;
    console.error("Production booking system failed to initialise", error);
    window.alert(
      "Online booking is temporarily unavailable. Please contact Mountain Race Shop directly."
    );
  });
})();
