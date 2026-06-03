/**
 * Mountain Race Shop™ — order-only tyre catalogue (A1 Accessory examples)
 * Not live stock; availability confirmed before ordering.
 */
(function (global) {
  "use strict";

  const TYRE_CATALOG = [
    {
      group: "MX-SM Sand-Mud",
      terrain: "Sand / mud",
      items: [
        { id: "T12-19-10090", size: "100/90-19", code: "T12-19-10090", tradeExGst: 99.95, rrp: 144.95 },
        { id: "T12-19-11090", size: "110/90-19", code: "T12-19-11090", tradeExGst: 99.95, rrp: 144.95 },
      ],
    },
    {
      group: "MX-SI Soft-Intermediate",
      terrain: "Soft-intermediate",
      items: [
        { id: "T16-14-90100", size: "90/100-14", code: "T16-14-90100", tradeExGst: 51.7, rrp: 74.95 },
        { id: "T16-17-70100", size: "70/100-17", code: "T16-17-70100", tradeExGst: 44.8, rrp: 64.95 },
        { id: "T16-18-110100", size: "110/100-18", code: "T16-18-110100", tradeExGst: 93.05, rrp: 134.95 },
        { id: "T16-19-11090", size: "110/90-19", code: "T16-19-11090", tradeExGst: 96.5, rrp: 139.95 },
        { id: "T16-19-12080", size: "120/80-19", code: "T16-19-12080", tradeExGst: 99.95, rrp: 144.95 },
        { id: "T16-21-80100", size: "80/100-21", code: "T16-21-80100", tradeExGst: 75.85, rrp: 109.95 },
      ],
    },
    {
      group: "MX-IH Intermediate-Hard",
      terrain: "Intermediate-hard",
      items: [
        { id: "T20-16-90100", size: "90/100-16", code: "T20-16-90100", tradeExGst: 68.95, rrp: 99.95 },
        { id: "T20-18-110100", size: "110/100-18", code: "T20-18-110100", tradeExGst: 93.05, rrp: 134.95 },
        { id: "T20-18-12090", size: "120/90-18", code: "T20-18-12090", tradeExGst: 96.5, rrp: 139.95 },
        { id: "T20-19-11090", size: "110/90-19", code: "T20-19-11090", tradeExGst: 96.5, rrp: 139.95 },
        { id: "T20-19-12080", size: "120/80-19", code: "T20-19-12080", tradeExGst: 99.95, rrp: 144.95 },
        { id: "T20-19-70100", size: "70/100-19", code: "T20-19-70100", tradeExGst: 55.15, rrp: 79.95 },
        { id: "T20-21-80100", size: "80/100-21", code: "T20-21-80100", tradeExGst: 75.85, rrp: 109.95 },
      ],
    },
  ];

  const TYRE_CATEGORIES = [
    { id: "mx_enduro_front", label: "Motocross / Enduro front tyre" },
    { id: "mx_enduro_rear", label: "Motocross / Enduro rear tyre" },
    { id: "tube", label: "Tube" },
    { id: "heavy_duty_tube", label: "Heavy-duty tube" },
    { id: "rim_lock", label: "Rim lock" },
    { id: "tyre_recommend", label: "Not sure — please recommend a tyre" },
  ];

  const ENGINE_SERVICES = [
    { id: "top_end_rebuild", label: "Top-end rebuild" },
    { id: "bottom_end_rebuild", label: "Bottom-end rebuild" },
    { id: "full_engine_rebuild", label: "Full engine rebuild" },
    { id: "clutch_inspection", label: "Clutch inspection / replacement" },
    { id: "valve_clearance", label: "Valve clearance check" },
    { id: "valve_inspection", label: "Valve inspection / cylinder head work" },
    { id: "timing_chain", label: "Timing chain replacement" },
    { id: "piston_rings", label: "Piston and rings" },
    { id: "crank_rod_inspection", label: "Crank / rod inspection" },
    { id: "engine_noise_diagnosis", label: "Engine noise diagnosis" },
    { id: "hard_starting_diagnosis", label: "Hard starting diagnosis" },
    { id: "engine_inspect_quote", label: "Not sure — please inspect and quote" },
  ];

  const BRAKE_PAD_OPTIONS = [
    { id: "check_front", label: "Check front brake pads" },
    { id: "check_rear", label: "Check rear brake pads" },
    { id: "check_oil_contamination", label: "Check for oil contamination from leaking fork/shock oil" },
    { id: "replace_front_quote", label: "Replace front brake pads if needed — quote first" },
    { id: "replace_rear_quote", label: "Replace rear brake pads if needed — quote first" },
    { id: "brake_no_thanks", label: "No thanks", exclusive: true },
  ];

  const TYRE_FITTING_RATE = 30;

  /** Fixed workshop suspension packages — prices in AUD */
  const SUSPENSION_SERVICES = [
    {
      id: "fork_off",
      label: "Fork service — off the bike",
      priceLabel: "$320",
      price: 320,
      location: "off_bike",
      pickupBikes: 0,
      pickupLoose: 1,
      requiresRider: false,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      includes: [
        "Forks supplied loose/off the bike",
        "Fluids",
        "Clean and inspect",
        "Oil seals included",
        "Dust seals included",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "shock_off",
      label: "Shock service — off the bike",
      priceLabel: "$340",
      price: 340,
      location: "off_bike",
      pickupBikes: 0,
      pickupLoose: 1,
      requiresRider: false,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      includes: [
        "Shock supplied loose/off the bike",
        "Fluids",
        "Oil seal included",
        "Dust seal included",
        "Guide bush included",
        "O-rings included",
        "Clean and inspect",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "fork_shock_off",
      label: "Fork and shock service — off the bike, delivered together",
      priceLabel: "$600",
      price: 600,
      location: "off_bike",
      pickupBikes: 0,
      pickupLoose: 2,
      requiresRider: false,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      includes: [
        "Forks and shock supplied loose/off the bike together",
        "Standard fork service",
        "Standard shock service",
        "Fluids",
        "Seals as listed above",
        "Clean and inspect",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "fork_on",
      label: "Fork service — on the bike",
      priceLabel: "$360",
      price: 360,
      location: "on_bike",
      pickupBikes: 1,
      pickupLoose: 0,
      requiresRider: false,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      onBikeNote: "Complete bike required — fork removal and refit included.",
      includes: [
        "Customer supplies complete bike",
        "Fork removal and refit",
        "Fork service",
        "Fluids",
        "Oil seals included",
        "Dust seals included",
        "Clean and inspect",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "shock_on",
      label: "Shock service — on the bike",
      priceLabel: "$460",
      price: 460,
      location: "on_bike",
      pickupBikes: 1,
      pickupLoose: 0,
      requiresRider: false,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      onBikeNote: "Complete bike required — shock removal and refit included.",
      includes: [
        "Customer supplies complete bike",
        "Shock removal and refit",
        "Shock service",
        "Fluids",
        "Oil seal included",
        "Dust seal included",
        "Guide bush included",
        "O-rings included",
        "Clean and inspect",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "revalve_off",
      label: "Revalve, springs and service — fork and shock, off the bike",
      priceLabel: "$1260",
      price: 1260,
      location: "off_bike",
      pickupBikes: 0,
      pickupLoose: 2,
      requiresRider: true,
      airFork: false,
      includesForkSprings: true,
      includesShockSpring: true,
      includes: [
        "Fork and shock supplied loose/off the bike",
        "Fork service",
        "Shock service",
        "Fork revalve",
        "Shock revalve",
        "Fork springs",
        "Shock spring",
        "Setup based on rider weight and riding type",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "revalve_on",
      label: "Revalve, springs and service — fork and shock, on the bike",
      priceLabel: "$1470",
      price: 1470,
      location: "on_bike",
      pickupBikes: 1,
      pickupLoose: 0,
      requiresRider: true,
      airFork: false,
      includesForkSprings: true,
      includesShockSpring: true,
      onBikeNote: "Complete bike required — fork and shock removal/refit included.",
      includes: [
        "Customer supplies complete bike",
        "Fork and shock removal/refit",
        "Fork service",
        "Shock service",
        "Fork revalve",
        "Shock revalve",
        "Fork springs",
        "Shock spring",
        "Setup based on rider weight and riding type",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "air_fork_off",
      label: "Air fork bike revalve and service — fork and shock, off the bike",
      priceLabel: "$1080",
      price: 1080,
      location: "off_bike",
      pickupBikes: 0,
      pickupLoose: 2,
      requiresRider: true,
      airFork: true,
      includesForkSprings: false,
      includesShockSpring: true,
      includes: [
        "Fork and shock supplied loose/off the bike",
        "Air fork service",
        "Shock service",
        "Fork revalve",
        "Shock revalve",
        "Setup based on rider weight and riding type",
        "No fork spring cost included (air forks do not require fork springs)",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "air_fork_on",
      label: "Air fork bike revalve and service — fork and shock, on the bike",
      priceLabel: "$1260",
      price: 1260,
      location: "on_bike",
      pickupBikes: 1,
      pickupLoose: 0,
      requiresRider: true,
      airFork: true,
      includesForkSprings: false,
      includesShockSpring: true,
      onBikeNote: "Complete bike required — air fork and shock removal/refit included.",
      includes: [
        "Customer supplies complete bike",
        "Fork and shock removal/refit",
        "Air fork service",
        "Shock service",
        "Fork revalve",
        "Shock revalve",
        "Setup based on rider weight and riding type",
        "No fork spring cost included (air forks do not require fork springs)",
        "Wear parts extra if needed",
      ],
    },
    {
      id: "suspension_other",
      label: "Other / not sure — contact me before booking",
      priceLabel: "Contact us",
      price: null,
      location: "unknown",
      pickupBikes: 0,
      pickupLoose: 0,
      requiresRider: true,
      airFork: false,
      includesForkSprings: false,
      includesShockSpring: false,
      includes: [],
    },
  ];

  function getSuspensionServiceById(id) {
    return SUSPENSION_SERVICES.find((s) => s.id === id) || null;
  }

  function getRecommendedPickupType(service) {
    if (!service) return null;
    if (service.location === "on_bike") return "complete_bike";
    if (service.pickupLoose >= 2) return "loose_forks_and_shock";
    if (service.pickupLoose === 1) {
      if (service.id === "shock_off") return "loose_shock";
      return "loose_forks";
    }
    return null;
  }

  global.BookingCatalog = {
    TYRE_CATALOG,
    TYRE_CATEGORIES,
    ENGINE_SERVICES,
    BRAKE_PAD_OPTIONS,
    TYRE_FITTING_RATE,
    SUSPENSION_SERVICES,
    getSuspensionServiceById,
    getRecommendedPickupType,
  };
})(typeof window !== "undefined" ? window : global);
