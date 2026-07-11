import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string[],
  subject: string,
  html: string,
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!response.ok) {
    throw new Error(`Email provider returned ${response.status}: ${await response.text()}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("MRS_BOOKING_FROM_EMAIL");
    const workshopEmail = Deno.env.get("MRS_BOOKING_TO_EMAIL");

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !fromEmail || !workshopEmail) {
      throw new Error("Required booking-notification secrets are not configured.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { booking_id } = await request.json();
    if (!booking_id || typeof booking_id !== "string") {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: booking, error } = await adminClient
      .from("bookings")
      .select("*")
      .eq("booking_id", booking_id)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = booking.payload || {};
    const bike = [booking.bike_brand, booking.bike_model, booking.bike_year]
      .filter(Boolean)
      .join(" ");
    const pickup = booking.wants_pickup_dropoff
      ? `${booking.preferred_monday_date || "Date pending"} — ${booking.pickup_type || "pickup"} — ${booking.pickup_area || "area pending"}`
      : "No Canberra pickup requested";

    const workshopHtml = `
      <h1>New workshop booking request</h1>
      <p><strong>Reference:</strong> ${escapeHtml(booking.booking_id)}</p>
      <p><strong>Customer:</strong> ${escapeHtml(booking.customer_name)}<br>
      <strong>Phone:</strong> ${escapeHtml(booking.phone)}<br>
      <strong>Email:</strong> ${escapeHtml(booking.email)}<br>
      <strong>Suburb:</strong> ${escapeHtml(booking.suburb)}</p>
      <p><strong>Bike:</strong> ${escapeHtml(bike)}<br>
      <strong>Motorcycle type:</strong> ${escapeHtml(booking.motorcycle_type || payload.motorcycle_type)}<br>
      <strong>Suspension:</strong> ${escapeHtml(booking.selected_suspension_service || "None selected")}<br>
      <strong>Estimated fixed total:</strong> $${escapeHtml(booking.estimated_fixed_total || 0)}</p>
      <p><strong>Pickup:</strong> ${escapeHtml(pickup)}</p>
      <p><strong>Rider complaint/goal:</strong><br>${escapeHtml(payload.rider_complaint_or_goal || "—")}</p>
      <p><strong>Advertising source:</strong> ${escapeHtml(
        [booking.source, booking.medium, booking.campaign].filter(Boolean).join(" / ") || "Direct",
      )}</p>
      <p>Open the protected booking administration page to confirm the job, add notes or change its status.</p>`;

    const customerHtml = `
      <h1>Mountain Race Shop booking request received</h1>
      <p>Good day ${escapeHtml(booking.customer_name)},</p>
      <p>Your booking request has been received. This is a request rather than a confirmed workshop date.</p>
      <p><strong>Reference:</strong> ${escapeHtml(booking.booking_id)}<br>
      <strong>Bike:</strong> ${escapeHtml(bike)}<br>
      <strong>Requested work:</strong> ${escapeHtml(booking.selected_suspension_service || "Workshop enquiry")}<br>
      <strong>Estimated fixed-price items:</strong> $${escapeHtml(booking.estimated_fixed_total || 0)}</p>
      <p>Mountain Race Shop will confirm parts availability, final pricing and any Canberra pickup arrangements by your preferred contact method.</p>
      <p><strong>Please do not send payment until the booking has been confirmed.</strong></p>
      <p>Mountain Race Shop™<br>Diagnose. Engineer. Tune. Teach.</p>`;

    await Promise.all([
      sendResendEmail(
        resendApiKey,
        fromEmail,
        [workshopEmail],
        `New workshop booking — ${booking.booking_id}`,
        workshopHtml,
      ),
      sendResendEmail(
        resendApiKey,
        fromEmail,
        [booking.email],
        `Mountain Race Shop request received — ${booking.booking_id}`,
        customerHtml,
      ),
    ]);

    return new Response(JSON.stringify({ delivered: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
