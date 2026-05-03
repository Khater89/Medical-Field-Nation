import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const normalizePhone = (p: string) => p.replace(/[\s\-]/g, "").trim();
const phoneMatches = (a: string, b: string) =>
  !!a && !!b && (a.endsWith(b.slice(-7)) || b.endsWith(a.slice(-7)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { booking_number, phone, body, target_provider_id } = await req.json();
    if (!booking_number || !phone || !body?.trim()) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking } = await supabase
      .from("bookings").select("id, customer_user_id, customer_display_name")
      .eq("booking_number", booking_number.trim().toUpperCase()).single();

    if (!booking) return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: contact } = await supabase
      .from("booking_contacts").select("customer_phone, customer_name").eq("booking_id", booking.id).single();
    const stored = normalizePhone(contact?.customer_phone || "");
    if (!phoneMatches(stored, normalizePhone(phone))) {
      return new Response(JSON.stringify({ error: "phone_mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use customer_user_id if exists, else NULL — for guests we use a deterministic UUID derived from booking
    // booking_messages.sender_id is uuid NOT NULL — so we use the booking.id as a stable guest sender id
    const senderId = booking.customer_user_id || booking.id;
    const displayName = contact?.customer_name || booking.customer_display_name || "العميل";

    const { error: insErr } = await supabase.from("booking_messages").insert({
      booking_id: booking.id,
      sender_id: senderId,
      sender_role: "customer",
      sender_display_name: displayName,
      body: body.trim(),
      target_provider_id: target_provider_id || null,
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
