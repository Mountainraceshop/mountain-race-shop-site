/* Mountain Race Shop — AI-assisted enquiry workflow prototype */
(function () {
  "use strict";

  const PRICE_GUIDE = {
    forkOff: 320,
    shockOff: 340,
    bothOff: 600,
    forkOn: 360,
    shockOn: 460,
    revalveSpringsOff: 1260,
    revalveSpringsOn: 1470,
    kashima: 1100,
    dlc: 850,
    cartridges: 2200,
    aftermarketShock: 2800,
    upgradeLabour: 300,
  };

  const ENQUIRY_TYPES = {
    fork: {
      label: "Fork Service Enquiry",
      package: "Fork service only",
      keywords: ["fork seal", "fork seals", "forks leaking", "fork service", "service my forks", "leaking forks", "forks are leaking"],
      required: ["bike_make", "bike_model", "bike_year", "fork_status", "shock_offer", "bushes", "springs_revalve_check", "pickup_requirement"],
      questions: {
        fork_status: "Confirm whether the forks are off the bike or still fitted",
        shock_offer: "Ask whether they also want the shock serviced while it is in",
        bushes: "Confirm bushes should be checked/replaced if needed",
        springs_revalve_check: "Ask whether they want springs or revalve considered while forks are apart",
      },
    },
    shock: {
      label: "Shock Service Enquiry",
      package: "Shock service only",
      keywords: ["shock service", "service my shock", "rear shock leaking", "shock is leaking", "rear is kicking", "rear shock", "shock rebuild"],
      required: ["bike_make", "bike_model", "bike_year", "shock_status", "fork_offer", "pickup_requirement", "rebuildable_check"],
      questions: {
        shock_status: "Confirm whether the shock is off the bike or still fitted",
        fork_offer: "Ask whether they also want the forks serviced",
        rebuildable_check: "Confirm whether the standard shock is rebuildable / parts are available",
      },
    },
    both: {
      label: "Fork and Shock Service Enquiry",
      package: "Fork and shock service package",
      keywords: ["both ends", "forks and shock", "fork and shock", "full suspension service", "service both", "suspension service"],
      required: ["bike_make", "bike_model", "bike_year", "both_status", "main_use", "handling_problem", "preferred_booking_date", "pickup_requirement"],
      questions: {
        both_status: "Confirm whether forks and shock are off-bike or still fitted",
        handling_problem: "Ask what handling problem or service symptom they want fixed",
      },
    },
    mx: {
      label: "Motocross Springs and Revalve Enquiry",
      package: "Revalve plus springs plus service",
      keywords: ["springs and revalve", "spring and revalve", "setup my mx", "mx bike", "motocross", "set up for my weight", "set up my bike", "do you still do suspension"],
      required: ["bike_make", "bike_model", "bike_year", "rider_weight", "skill_level", "main_use", "racing_level", "handling_problem", "both_status", "budget", "pickup_requirement"],
      questions: {
        handling_problem: "Ask what the bike is doing wrong now",
        budget: "Ask whether they have a budget range before scoping premium work",
      },
    },
    adventure: {
      label: "Adventure Touring Setup Enquiry",
      package: "Adventure touring upgrade",
      keywords: ["adventure", "touring", "camping gear", "luggage", "loaded", "two-up", "africa twin", "wallow", "too soft", "touring setup"],
      required: ["bike_make", "bike_model", "bike_year", "rider_weight", "luggage_weight", "solo_two_up", "road_surfaces", "trip_distances", "comfort_expectation", "handling_expectation", "budget", "rebuildable_check", "upgrade_interest"],
      questions: {
        solo_two_up: "Ask whether it is solo or two-up riding",
        road_surfaces: "Ask what road surfaces they use most",
        trip_distances: "Ask typical trip distances and load",
        comfort_expectation: "Ask comfort expectations",
        handling_expectation: "Ask handling/control expectations",
        upgrade_interest: "Ask whether aftermarket shock, cartridges or coatings are on the table",
      },
    },
    coating: {
      label: "Coatings / Premium Upgrade Enquiry",
      package: "Staged plan required",
      keywords: ["kashima", "dlc", "coated", "coatings", "fork tubes", "best setup", "premium"],
      required: ["bike_make", "bike_model", "bike_year", "rider_weight", "main_use", "skill_level", "handling_problem", "recent_service", "spring_valving_corrected", "budget"],
      questions: {
        recent_service: "Ask whether the suspension has been serviced recently",
        spring_valving_corrected: "Ask whether spring rate and valving have already been corrected",
      },
    },
    pickup: {
      label: "Canberra Pickup Enquiry",
      package: "Staged plan required",
      keywords: ["pickup", "pick up", "collect", "canberra", "monday pickup", "drop-off", "drop off"],
      required: ["pickup_location", "pickup_load", "bike_make", "bike_model", "bike_year", "phone", "preferred_booking_date", "job_requested"],
      questions: {
        pickup_load: "Confirm whether pickup is full bike, forks only, shock only, or forks and shock",
      },
    },
  };

  const LABELS = {
    customer_name: "Customer name, if available",
    phone: "Phone number, if available",
    email: "Email, if available",
    bike_make: "Bike make",
    bike_model: "Bike model",
    bike_year: "Bike year",
    job_requested: "Job requested",
    fork_or_shock: "Whether the job is forks, shock, or both",
    on_off_status: "Whether suspension is off the bike or still fitted",
    bike_type: "Bike type",
    main_use: "Riding type / main use",
    rider_weight: "Rider weight",
    pickup_requirement: "Pickup requirement",
    preferred_booking_date: "Preferred booking timeframe",
    budget: "Budget range",
    skill_level: "Realistic skill level",
    racing_level: "Racing level",
    gear_weight: "Riding gear weight",
    luggage_weight: "Luggage or camping gear weight",
    pickup_location: "Pickup suburb / location",
    fork_status: "Forks off bike or still fitted",
    shock_status: "Shock off bike or still fitted",
    both_status: "Fork and shock on/off-bike status",
    handling_problem: "What the bike is doing wrong",
    rebuildable_check: "Confirm shock is rebuildable / parts can be sourced",
    pickup_load: "Pickup load: full bike, forks only, shock only, or both",
  };

  const $ = (id) => document.getElementById(id);
  const form = $("enquiryForm");
  if (!form) return;

  function value(id) {
    return ($(id)?.value || "").trim();
  }

  function checked(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  }

  function hasAnyText(...ids) {
    return ids.some((id) => value(id));
  }

  function textBlob() {
    return [
      value("customer_message"),
      value("job_requested_text"),
      value("customer_description"),
      checked("requested_work").join(" "),
      checked("problem_description").join(" "),
      checked("goal_of_work").join(" "),
      value("bike_type"),
      value("main_use"),
      value("bike_make"),
      value("bike_model"),
    ].join(" ").toLowerCase();
  }

  function includesAny(text, terms) {
    return terms.some((term) => text.includes(term));
  }

  function classify(data) {
    const text = textBlob();
    const scores = Object.entries(ENQUIRY_TYPES).map(([key, type]) => {
      let score = 0;
      type.keywords.forEach((kw) => { if (text.includes(kw)) score += 2; });
      if (key === "fork" && data.requested.some((w) => /fork service|fork seals/i.test(w))) score += 4;
      if (key === "shock" && data.requested.includes("Shock service")) score += 4;
      if (key === "both" && data.requested.includes("Fork and shock service")) score += 5;
      if (key === "mx" && data.requested.some((w) => /springs|revalve|race setup/i.test(w))) score += 3;
      if (key === "adventure" && data.requested.includes("Adventure touring setup")) score += 5;
      if (key === "coating" && data.requested.some((w) => /kashima|dlc|cartridges|aftermarket shock/i.test(w))) score += 5;
      if (key === "pickup" && (data.requested.includes("Canberra pickup") || data.status.includes("Customer needs pickup"))) score += 5;
      return { key, score, type };
    }).sort((a, b) => b.score - a.score);

    const best = scores[0];
    if (!best || best.score === 0) {
      return { key: "general", label: "General Suspension Enquiry", confidence: "Low", reason: "No strong keyword match. Use the form details to guide the next question.", type: { required: [], package: "Staged plan required", questions: {} } };
    }
    return {
      key: best.key,
      label: best.type.label,
      confidence: best.score >= 8 ? "High" : best.score >= 4 ? "Medium" : "Low",
      reason: `Matched ${best.score} signal${best.score === 1 ? "" : "s"} from the message and selected work.`,
      type: best.type,
    };
  }

  function collectData() {
    const requested = checked("requested_work");
    const status = checked("bike_status");
    const problems = checked("problem_description");
    const goals = checked("goal_of_work");
    const parts = checked("parts_to_check");
    return {
      message: value("customer_message"),
      source: value("source"),
      name: value("customer_name"),
      phone: value("phone"),
      email: value("email"),
      location: value("location"),
      contact: value("preferred_contact_method"),
      make: value("bike_make"),
      model: value("bike_model"),
      year: value("bike_year"),
      bikeType: value("bike_type"),
      forkType: value("fork_type"),
      shockType: value("shock_type"),
      modified: document.querySelector('input[name="modified_before"]')?.checked ? "Yes" : "No / not stated",
      requested,
      jobText: value("job_requested_text"),
      status,
      pickupLocation: value("pickup_location"),
      preferredDate: value("preferred_booking_date"),
      riderWeight: value("rider_weight"),
      gearWeight: value("gear_weight"),
      luggageWeight: value("luggage_weight"),
      skillLevel: value("skill_level"),
      mainUse: value("main_use"),
      racingLevel: value("racing_level"),
      problems,
      customerDescription: value("customer_description"),
      goals,
      budgetProvided: value("budget_provided"),
      budgetAmount: value("budget_amount"),
      budgetMatch: value("budget_match"),
      parts,
      partsStatus: value("parts_status"),
      overridePackage: value("recommended_package_override"),
      minOption: value("minimum_option"),
      recommendedOption: value("recommended_option"),
      premiumOption: value("premium_option"),
      confirmedDate: value("confirmed_booking_date"),
      dropoffOrPickup: value("dropoff_or_pickup"),
      specialInstructions: value("special_instructions"),
      finalOutcome: value("final_outcome"),
    };
  }

  function isOlderModel(data) {
    const year = Number(data.year);
    return year && new Date().getFullYear() - year >= 10;
  }

  function needsPerformanceInfo(data, classification) {
    const text = textBlob();
    return ["mx", "adventure", "coating"].includes(classification.key) || includesAny(text, ["spring", "revalve", "setup", "weight", "handling", "race", "touring"]);
  }

  function fieldPresent(field, data) {
    const hasForkStatus = data.status.some((s) => ["Forks off bike", "Forks still fitted", "Complete bike coming in"].includes(s));
    const hasShockStatus = data.status.some((s) => ["Shock off bike", "Shock still fitted", "Complete bike coming in"].includes(s));
    const hasPickup = data.status.includes("Customer needs pickup") || /pickup|collect|canberra/i.test(data.message + " " + data.jobText);
    const forkOrShock = data.requested.some((w) => /fork|shock|suspension|revalve|spring/i.test(w)) || /fork|shock|suspension|revalve|spring/i.test(data.message + " " + data.jobText);
    const handlingProblem = data.problems.length || data.customerDescription || includesAny(data.message.toLowerCase(), ["harsh", "kicking", "bottom", "soft", "stiff", "wallow", "deflect", "push", "traction"]);
    const jobRequested = data.requested.length || data.jobText || data.message;
    const budget = data.budgetAmount || data.budgetProvided === "No";
    const pickupLoad = data.status.some((s) => ["Forks off bike", "Shock off bike", "Complete bike coming in", "Customer needs pickup"].includes(s)) || data.jobText;

    const map = {
      customer_name: !!data.name,
      phone: !!data.phone,
      email: !!data.email,
      bike_make: !!data.make,
      bike_model: !!data.model,
      bike_year: !!data.year,
      job_requested: !!jobRequested,
      fork_or_shock: !!forkOrShock,
      on_off_status: data.status.length > 0,
      bike_type: !!data.bikeType,
      main_use: !!data.mainUse,
      rider_weight: !!data.riderWeight,
      pickup_requirement: hasPickup ? !!data.pickupLocation : data.status.length > 0 || !!data.dropoffOrPickup,
      preferred_booking_date: !!data.preferredDate,
      budget: !!budget,
      skill_level: !!data.skillLevel,
      racing_level: !!data.racingLevel || data.skillLevel === "Recreational only",
      gear_weight: !!data.gearWeight,
      luggage_weight: !!data.luggageWeight,
      pickup_location: !!data.pickupLocation,
      fork_status: hasForkStatus,
      shock_status: hasShockStatus,
      both_status: hasForkStatus && hasShockStatus,
      handling_problem: !!handlingProblem,
      rebuildable_check: !!data.shockType || data.partsStatus || data.parts.includes("Shock seal kit") || data.parts.includes("Aftermarket shock"),
      pickup_load: !!pickupLoad,
      shock_offer: data.requested.includes("Shock service") || data.requested.includes("Fork and shock service") || /shock/i.test(data.message + data.jobText),
      fork_offer: data.requested.includes("Fork service") || data.requested.includes("Fork and shock service") || /fork/i.test(data.message + data.jobText),
      bushes: data.parts.includes("Fork bushes") || data.parts.includes("Shock bushes") || /bush/i.test(data.message + data.jobText + data.specialInstructions),
      springs_revalve_check: data.requested.some((w) => /spring|revalve/i.test(w)) || /spring|revalve|weight/i.test(data.message + data.jobText),
      solo_two_up: /solo|two-up|two up|pillion/i.test(data.message + data.customerDescription + data.specialInstructions),
      road_surfaces: /road|gravel|dirt|sand|track|trail|highway|fire trail/i.test(data.message + data.customerDescription + data.specialInstructions),
      trip_distances: /trip|km|distance|tour|loaded|camp/i.test(data.message + data.customerDescription + data.specialInstructions),
      comfort_expectation: data.goals.includes("Improve comfort") || /comfort|plush|less harsh/i.test(data.message + data.customerDescription),
      handling_expectation: data.goals.includes("Better handling") || data.goals.includes("Better loaded touring control") || /handling|control|stable|confidence/i.test(data.message + data.customerDescription),
      upgrade_interest: data.requested.some((w) => /cartridge|aftermarket|kashima|dlc/i.test(w)) || /cartridge|aftermarket|kashima|dlc|upgrade/i.test(data.message + data.jobText),
      recent_service: /recent service|serviced recently|just serviced|fresh service/i.test(data.message + data.customerDescription + data.specialInstructions),
      spring_valving_corrected: /springs done|correct springs|revalved|valving corrected|springs and valving/i.test(data.message + data.customerDescription + data.specialInstructions),
    };
    return !!map[field];
  }

  function missingInfo(data, classification) {
    const required = new Set([
      "customer_name", "phone", "email", "bike_make", "bike_model", "bike_year", "job_requested", "fork_or_shock", "on_off_status", "bike_type", "main_use", "pickup_requirement", "preferred_booking_date",
      ...(classification.type.required || []),
    ]);
    if (needsPerformanceInfo(data, classification)) required.add("rider_weight");
    if (classification.key === "adventure") {
      required.add("gear_weight");
      required.add("luggage_weight");
    }

    return Array.from(required)
      .filter((field) => !fieldPresent(field, data))
      .map((field) => classification.type.questions?.[field] || LABELS[field] || field);
  }

  function quoteCriticalMissing(data) {
    return !data.make || !data.model || !data.year || data.status.length === 0;
  }

  function hasAirFork(data) {
    return /air/i.test(data.forkType + " " + data.message + " " + data.jobText);
  }

  function statusMode(data) {
    if (data.status.includes("Complete bike coming in") || data.status.some((s) => /still fitted/i.test(s))) return "on-bike";
    if (data.status.some((s) => /off bike/i.test(s))) return "off-bike";
    return "unknown";
  }

  function packageRecommendation(data, classification) {
    let packageName = data.overridePackage || classification.type.package || "Staged plan required";
    const text = textBlob();
    const includesCombinedService = data.requested.includes("Fork and shock service");
    if (!data.overridePackage) {
      if (classification.key === "fork") packageName = data.requested.includes("Shock service") || includesCombinedService ? "Fork and shock service package" : "Fork service only";
      if (classification.key === "shock") packageName = data.requested.includes("Fork service") || includesCombinedService ? "Fork and shock service package" : "Shock service only";
      if (classification.key === "both") packageName = "Fork and shock service package";
      if (classification.key === "mx") packageName = "Revalve plus springs plus service";
      if (classification.key === "adventure") packageName = data.budgetMatch === "No" ? "Staged plan required" : "Adventure touring upgrade";
      if (classification.key === "coating") packageName = "Staged plan required";
      if (/cartridge|aftermarket shock/i.test(text)) packageName = "Cartridges and shock upgrade";
    }

    const mode = statusMode(data);
    const guides = [];
    if (!quoteCriticalMissing(data)) {
      if (packageName === "Fork service only") guides.push(mode === "on-bike" ? `Forks on-bike guide: $${PRICE_GUIDE.forkOn}` : `Fork service off-bike guide: $${PRICE_GUIDE.forkOff}`);
      if (packageName === "Shock service only") guides.push(mode === "on-bike" ? `Shock on-bike guide: $${PRICE_GUIDE.shockOn}` : `Shock service off-bike guide: $${PRICE_GUIDE.shockOff}`);
      if (packageName === "Fork and shock service package") {
        guides.push(`Fork and shock service together off-bike guide: $${PRICE_GUIDE.bothOff}`);
        if (mode === "on-bike") guides.push(`If still fitted, fork and shock on-bike work uses extra labour; fork guide $${PRICE_GUIDE.forkOn}, shock guide $${PRICE_GUIDE.shockOn}`);
      }
      if (packageName === "Revalve plus springs plus service") {
        guides.push(mode === "on-bike" ? `Revalve + springs + service on-bike guide: $${PRICE_GUIDE.revalveSpringsOn}` : `Revalve + springs + service off-bike guide: $${PRICE_GUIDE.revalveSpringsOff}`);
        if (hasAirFork(data)) guides.push("Air fork note: air forks do not need fork springs, so pricing needs workshop confirmation.");
      }
      if (packageName === "Adventure touring upgrade" || packageName === "Cartridges and shock upgrade") {
        guides.push(`Upgrade examples: cartridges $${PRICE_GUIDE.cartridges}, aftermarket shock $${PRICE_GUIDE.aftermarketShock}, labour/seals/consumables from $${PRICE_GUIDE.upgradeLabour}`);
      }
      if (packageName === "Staged plan required" && classification.key === "coating") {
        guides.push(`Premium examples only: Kashima fork outers $${PRICE_GUIDE.kashima}, DLC fork lowers $${PRICE_GUIDE.dlc}. Service, springs and valving come first.`);
      }
    }

    const warnings = [
      "Guide only — do not treat this as a final quote until bike make/model/year, on/off-bike status and parts availability are confirmed.",
      "Final price can change if bushes are worn, extra wear parts are required, parts are not in stock, the bike is an older model, or suspension is still fitted to the bike.",
    ];
    if (isOlderModel(data)) warnings.push("Older model — confirm seals, bushes and shock parts availability before quoting.");
    if (data.status.includes("Customer needs pickup") || data.pickupLocation) warnings.push("Pickup space is limited. Do not confirm pickup until workshop capacity is checked.");
    if (classification.key === "adventure") warnings.push("Adventure setup must account for total load: rider, gear, luggage and two-up use if applicable.");
    if (classification.key === "coating") warnings.push("Coatings alone will not fix incorrect springs, poor valving or overdue service condition.");
    if (data.budgetMatch === "No") warnings.push("Budget does not match expectation — offer staged options rather than a full package immediately.");
    if (hasAirFork(data)) warnings.push("Air fork detected — do not include fork springs unless the bike has a spring conversion.");

    return { packageName, guides, warnings };
  }

  function nextStep(data, missing, packageInfo) {
    if (missing.length) return "Ask for missing details";
    if (data.partsStatus && data.partsStatus !== "In stock") return "Check parts availability";
    if (packageInfo.warnings.some((w) => /Pickup space/.test(w))) return "Confirm pickup availability";
    if (data.budgetMatch === "No") return "Give staged options";
    if (quoteCriticalMissing(data)) return "Ask for missing details";
    if (data.finalOutcome === "Booked in" && data.confirmedDate) return "Book job";
    return "Give price guide only";
  }

  function customerReply(data, classification, missing, packageInfo, step) {
    const job = data.jobText || data.requested.join(", ") || classification.label.toLowerCase();
    const bike = [data.year, data.make, data.model].filter(Boolean).join(" ") || "the bike";
    const lines = [];
    lines.push("Yep, we can help with that.");
    lines.push("");
    lines.push(`From what you have sent, it looks like ${job} for ${bike}.`);

    if (missing.length) {
      lines.push("");
      lines.push("To quote it properly, I need a couple of details first:");
      missing.slice(0, 7).forEach((item) => lines.push(`- ${item}`));
      if (missing.length > 7) lines.push("- Any other details already known about the bike, parts or pickup");
    }

    if (packageInfo.packageName && !missing.length) {
      lines.push("");
      lines.push(`Likely direction: ${packageInfo.packageName}.`);
    }
    if (packageInfo.guides.length && !missing.length) {
      lines.push("Price guide only at this stage:");
      packageInfo.guides.forEach((g) => lines.push(`- ${g}`));
    } else if (quoteCriticalMissing(data)) {
      lines.push("");
      lines.push("I do not want to give you the wrong price before I know the bike details and whether the suspension is off the bike or still fitted.");
    }

    if (classification.key === "coating") {
      lines.push("");
      lines.push("With coatings, the order matters. Service condition, correct springs, correct valving and setup come before Kashima or DLC. Coatings can help, but they will not fix the wrong springs or valving on their own.");
    }
    if (classification.key === "adventure") {
      lines.push("");
      lines.push("For adventure bikes I need to work off total load, not just rider weight. Luggage, camping gear and two-up use change the recommendation.");
      const loadDetails = [data.riderWeight && `rider ${data.riderWeight}`, data.gearWeight && `gear ${data.gearWeight}`, data.luggageWeight && `luggage ${data.luggageWeight}`].filter(Boolean);
      if (loadDetails.length) lines.push(`Current load notes: ${loadDetails.join(", ")}.`);
    }
    if (data.budgetMatch === "No") {
      lines.push("");
      lines.push("Rather than spend your money twice, we can stage the work properly and start with the part that gives the best result for the budget.");
    }

    lines.push("");
    lines.push("Bushes, wear parts, springs, coatings, cartridges, aftermarket shocks, pickup/delivery and extra labour can be extra if needed. For older bikes I need to check parts availability first.");
    if (missing.length) lines.push("Once I have the missing details, I can give you the right price guide and booking direction.");
    lines.push("");
    lines.push(`Next step: ${step}.`);
    return lines.join("\n");
  }

  function internalSummary(data, classification, missing, packageInfo, step) {
    const bike = [data.make, data.model].filter(Boolean).join(" ") || "—";
    const requested = data.requested.length ? data.requested.join(", ") : (data.jobText || data.message || "—");
    const problem = data.problems.length ? data.problems.join(", ") : (data.customerDescription || "—");
    const suspensionStatus = data.status.length ? data.status.join(", ") : "—";
    const pickup = data.status.includes("Customer needs pickup") || data.pickupLocation ? `Yes${data.pickupLocation ? ` — ${data.pickupLocation}` : ""}` : "No / not stated";
    const parts = data.parts.length ? data.parts.join(", ") : (data.partsStatus || "—");
    return [
      `Customer: ${data.name || "—"}`,
      `Phone: ${data.phone || "—"}`,
      `Email: ${data.email || "—"}`,
      `Bike: ${bike}`,
      `Year: ${data.year || "—"}`,
      `Work requested: ${requested}`,
      `Rider weight: ${data.riderWeight || "—"}`,
      `Riding gear weight: ${data.gearWeight || "—"}`,
      `Luggage/camping gear weight: ${data.luggageWeight || "—"}`,
      `Riding type: ${data.mainUse || data.bikeType || "—"}`,
      `Skill level: ${data.skillLevel || "—"}`,
      `Problem described: ${problem}`,
      `Suspension on/off bike: ${suspensionStatus}`,
      `Pickup required: ${pickup}`,
      `Budget: ${data.budgetAmount || data.budgetProvided || "—"}`,
      `Recommended package: ${packageInfo.packageName}`,
      `Parts to check: ${parts}`,
      `Booking status: ${data.finalOutcome || step}`,
      `Notes: ${[classification.label, data.specialInstructions, missing.length ? `Missing: ${missing.join("; ")}` : "No required fields missing for current classification", packageInfo.warnings.join(" ")].filter(Boolean).join(" | ")}`,
    ].join("\n");
  }

  function bookingChecklist(data, missing, packageInfo) {
    const items = [];
    items.push(missing.length ? "Not booking-ready: missing information remains." : "Core intake details collected for this enquiry type.");
    items.push(data.phone || data.email ? "Customer contact method available." : "Need at least phone or email before booking.");
    items.push(quoteCriticalMissing(data) ? "Do not give final quote yet." : "Bike identity and suspension status are known enough for a guide price.");
    items.push(data.partsStatus === "In stock" ? "Parts marked in stock." : "Parts availability still needs workshop confirmation unless known.");
    if (data.pickupLocation || data.status.includes("Customer needs pickup")) items.push("Pickup requested — confirm space before promising date.");
    if (packageInfo.packageName) items.push(`Likely package: ${packageInfo.packageName}.`);
    return items;
  }

  function renderList(el, items) {
    el.innerHTML = "";
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "None for current classification.";
      el.appendChild(li);
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      el.appendChild(li);
    });
  }

  function renderBadges(classification, data, missing) {
    const badges = [classification.confidence + " confidence"];
    if (quoteCriticalMissing(data)) badges.push("No final quote");
    if (missing.length) badges.push(`${missing.length} missing`);
    if (isOlderModel(data)) badges.push("Older model parts check");
    if (data.status.includes("Customer needs pickup") || data.pickupLocation) badges.push("Pickup check");
    $("classificationBadges").innerHTML = badges.map((b, i) => `<span class="result-badge ${i && /quote|missing|check/i.test(b) ? "warn" : ""}">${escapeHtml(b)}</span>`).join("");
  }

  function analyse() {
    const data = collectData();
    const classification = classify(data);
    const missing = missingInfo(data, classification);
    const packageInfo = packageRecommendation(data, classification);
    const step = nextStep(data, missing, packageInfo);
    const checklist = bookingChecklist(data, missing, packageInfo);

    $("classificationTitle").textContent = classification.label;
    $("classificationReason").textContent = classification.reason;
    renderBadges(classification, data, missing);
    renderList($("missingList"), missing);
    $("packageText").textContent = [packageInfo.packageName, ...packageInfo.guides].filter(Boolean).join(" — ") || "Staged plan required";
    renderList($("packageWarnings"), packageInfo.warnings);
    renderList($("bookingChecklist"), checklist);
    $("customerReply").value = customerReply(data, classification, missing, packageInfo, step);
    $("jobSummary").value = internalSummary(data, classification, missing, packageInfo, step);
    $("nextStep").textContent = step;

    window.__mrsLastEnquiry = { data, classification, missing, packageInfo, checklist, nextStep: step, customerReply: $("customerReply").value, jobSummary: $("jobSummary").value };
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      $("copyStatus").textContent = `${label} copied.`;
    } catch (err) {
      $("copyStatus").textContent = "Copy failed. Select the text and copy manually.";
    }
  }

  function exportJson() {
    analyse();
    const data = JSON.stringify(window.__mrsLastEnquiry, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mrs-enquiry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  $("analyseTop")?.addEventListener("click", analyse);
  $("analyseBottom")?.addEventListener("click", analyse);
  $("exportJson")?.addEventListener("click", exportJson);
  $("copyAll")?.addEventListener("click", () => {
    analyse();
    copyText(`CUSTOMER REPLY\n\n${$("customerReply").value}\n\nINTERNAL JOB SUMMARY\n\n${$("jobSummary").value}`, "All outputs");
  });
  document.querySelectorAll("[data-copy-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.copyTarget);
      if (target) copyText(target.value, btn.textContent.trim() || "Output");
    });
  });
  form.addEventListener("reset", () => setTimeout(analyse, 0));
  form.addEventListener("change", analyse);

  analyse();
})();
