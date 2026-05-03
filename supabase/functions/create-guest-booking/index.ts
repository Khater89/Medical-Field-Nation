import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Simple in-memory IP rate limiter (best-effort, per-instance) ──
// 8 requests per IP per 10 minutes
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by source IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      customer_name,
      customer_phone,
      city,
      client_address_text,
      client_lat,
      client_lng,
      service_id,
      scheduled_at,
      hours,
      time_slot,
      notes,
      payment_method,
      is_emergency,
    } = body;

    // ── Validate required fields ──
    if (
      !customer_name?.trim() ||
      !customer_phone?.trim() ||
      !city?.trim() ||
      !service_id ||
      !scheduled_at
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Input length validation ──
    if (customer_name.trim().length > 200) {
      return new Response(
        JSON.stringify({ error: "Name too long (max 200)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (customer_phone.trim().length > 20) {
      return new Response(
        JSON.stringify({ error: "Phone too long (max 20)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Service-role client (bypasses RLS) ──
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Validate service exists and is active ──
    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, base_price")
      .eq("id", service_id)
      .eq("active", true)
      .maybeSingle();

    if (!service) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive service" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Calculate subtotal server-side ──
    const hourCount = Math.max(1, Math.min(12, parseInt(String(hours)) || 1));
    const isNight = time_slot === "evening";
    const firstHour = isNight ? 70 : 50;
    const additionalHour = 20;
    const basePrice = firstHour + Math.max(0, hourCount - 1) * additionalHour;
    const commission = Math.round(basePrice * 0.1);
    const subtotal = basePrice + commission;

    // ── Check for authenticated user (optional — supports both guest & logged-in) ──
    let customer_user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) customer_user_id = user.id;
    }

    // ── Validate payment method ──
    const validMethods = ["CASH", "CLIQ", "CARD"];
    const finalPaymentMethod = validMethods.includes(payment_method) ? payment_method : "CASH";

    // ── Insert booking ──
    const booking = {
      customer_display_name: customer_name.trim().substring(0, 200),
      city: city.trim().substring(0, 100),
      client_lat: client_lat != null ? parseFloat(String(client_lat)) : null,
      client_lng: client_lng != null ? parseFloat(String(client_lng)) : null,
      service_id,
      scheduled_at: new Date(scheduled_at).toISOString(),
      notes: notes?.trim()?.substring(0, 1000) || null,
      subtotal,
      payment_method: finalPaymentMethod,
      customer_user_id,
      is_emergency: is_emergency === true,
    };

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert(booking)
      .select("booking_number, id")
      .single();

    if (error) {
      console.error("Booking insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Insert sensitive contact info into booking_contacts ──
    const { error: contactError } = await supabaseAdmin
      .from("booking_contacts")
      .insert({
        booking_id: data.id,
        customer_name: customer_name.trim().substring(0, 200),
        customer_phone: customer_phone.trim().substring(0, 20),
        client_address_text: client_address_text?.trim()?.substring(0, 500) || null,
      });

    if (contactError) {
      console.error("Contact insert error:", contactError);
    }

    // ── Write to booking_outbox for Google Sheets sync ──
    const outboxPayload = {
      booking_id: data.id,
      booking_number: data.booking_number,
      service_id,
      city: city.trim(),
      scheduled_at: new Date(scheduled_at).toISOString(),
      notes: notes?.trim() || null,
      status: "NEW",
      client_lat: client_lat != null ? parseFloat(String(client_lat)) : null,
      client_lng: client_lng != null ? parseFloat(String(client_lng)) : null,
      created_at: new Date().toISOString(),
      source: "web",
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      client_address_text: client_address_text?.trim() || null,
      hours: hourCount,
      time_slot: time_slot || null,
      payment_method: finalPaymentMethod,
    };

    const { error: outboxError } = await supabaseAdmin
      .from("booking_outbox")
      .insert({
        booking_id: data.id,
        destination: "google_sheets",
        payload: outboxPayload,
        status: "pending",
      });

    if (outboxError) {
      console.error("Outbox insert error (non-blocking):", outboxError);
    }

    // ── Webhook outbox: order_created event for n8n ──
    const webhookPayload = {
      event: "order_created",
      booking_id: data.id,
      booking_number: data.booking_number,
      service_id,
      city: city.trim(),
      scheduled_at: new Date(scheduled_at).toISOString(),
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      created_at: new Date().toISOString(),
    };

    await supabaseAdmin.from("booking_outbox").insert({
      booking_id: data.id,
      destination: "webhook",
      payload: webhookPayload,
      status: "pending",
    }).then(({ error: whErr }) => {
      if (whErr) console.error("Webhook outbox error (non-blocking):", whErr);
    });

    // ── Admin notification for new booking ──
    await supabaseAdmin.from("staff_notifications").insert({
      title: `📥 طلب جديد: ${data.booking_number}`,
      body: `${service_id} — ${city.trim()} — ${customer_phone.trim()}`,
      target_role: "admin",
      booking_id: data.id,
    }).then(({ error: nErr }) => {
      if (nErr) console.error("Notification insert error (non-blocking):", nErr);
    });

    return new Response(
      JSON.stringify({
        success: true,
        booking_number: data.booking_number,
        booking_id: data.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
