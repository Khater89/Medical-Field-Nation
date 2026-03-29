import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { booking_number, phone, rating, comment } = await req.json();

    if (!booking_number || !phone || !rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, assigned_provider_id")
      .eq("booking_number", booking_number.trim().toUpperCase())
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "not_completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!booking.assigned_provider_id) {
      return new Response(JSON.stringify({ error: "no_provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify phone
    const { data: contact } = await supabase
      .from("booking_contacts")
      .select("customer_phone")
      .eq("booking_id", booking.id)
      .single();

    const normalizedPhone = phone.replace(/[\s\-]/g, "").trim();
    const storedPhone = contact?.customer_phone?.replace(/[\s\-]/g, "").trim() || "";

    if (!storedPhone || (!normalizedPhone.endsWith(storedPhone.slice(-7)) && !storedPhone.endsWith(normalizedPhone.slice(-7)))) {
      return new Response(JSON.stringify({ error: "phone_mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already rated
    const { data: existingRating } = await supabase
      .from("provider_ratings")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (existingRating) {
      return new Response(JSON.stringify({ error: "already_rated" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert rating
    const { error: insertError } = await supabase
      .from("provider_ratings")
      .insert({
        booking_id: booking.id,
        provider_id: booking.assigned_provider_id,
        rating: Math.round(rating),
        comment: comment?.trim() || null,
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: "insert_failed", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
