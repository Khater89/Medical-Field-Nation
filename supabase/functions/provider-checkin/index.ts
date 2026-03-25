import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate provider
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify booking belongs to this provider and is ACCEPTED
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, assigned_provider_id, status, booking_number")
      .eq("id", booking_id)
      .maybeSingle();

    if (!booking || booking.assigned_provider_id !== user.id) {
      return new Response(JSON.stringify({ error: "هذا الطلب غير مسند إليك" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (booking.status !== "ACCEPTED") {
      return new Response(JSON.stringify({ error: "الطلب ليس في حالة مقبول" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate OTP and update booking
    const otp = generateOTP();
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ check_in_at: now, status: "IN_PROGRESS", otp_code: otp })
      .eq("id", booking_id);

    if (updateError) throw updateError;

    // Get client contact info
    const { data: contact } = await supabaseAdmin
      .from("booking_contacts")
      .select("customer_name, customer_phone")
      .eq("booking_id", booking_id)
      .maybeSingle();

    // Get provider name
    const { data: providerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const customerName = contact?.customer_name || "العميل";
    const customerPhone = contact?.customer_phone || "";
    const providerName = providerProfile?.full_name || "المزود";
    const bookingNum = booking.booking_number || booking_id.slice(0, 8);

    // Send OTP notification to ADMIN and CS (not to client)
    await supabaseAdmin.from("staff_notifications").insert([
      {
        title: `🔑 كود إنهاء الخدمة — ${bookingNum}`,
        body: `المزود "${providerName}" بدأ العمل. كود التأكيد: ${otp}\nالعميل: ${customerName} — ${customerPhone}\nيرجى التواصل مع العميل للتأكيد ثم تزويده بالكود.`,
        target_role: "admin",
        booking_id,
      },
      {
        title: `🔑 كود إنهاء الخدمة — ${bookingNum}`,
        body: `المزود "${providerName}" بدأ العمل. كود التأكيد: ${otp}\nالعميل: ${customerName} — ${customerPhone}\nيرجى التواصل مع العميل للتأكيد ثم تزويده بالكود.`,
        target_role: "cs",
        booking_id,
      },
    ]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("provider-checkin error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
