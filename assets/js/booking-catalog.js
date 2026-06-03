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

  global.BookingCatalog = {
    TYRE_CATALOG,
    TYRE_CATEGORIES,
    ENGINE_SERVICES,
    BRAKE_PAD_OPTIONS,
    TYRE_FITTING_RATE,
  };
})(typeof window !== "undefined" ? window : global);
