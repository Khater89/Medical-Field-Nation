import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    // Find bookings scheduled within next 24 hours that are ACCEPTED or ASSIGNED
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_number, scheduled_at, assigned_provider_id, last_provider_reminder_at, city")
      .in("status", ["ACCEPTED", "ASSIGNED"])
      .not("assigned_provider_id", "is", null)
      .lte("scheduled_at", in24h)
      .gte("scheduled_at", now.toISOString());

    if (error) throw error;

    let sentCount = 0;

    for (const booking of bookings || []) {
      // Skip if reminder was sent less than 6 hours ago
      if (
        booking.last_provider_reminder_at &&
        new Date(booking.last_provider_reminder_at).getTime() > new Date(sixHoursAgo).getTime()
      ) {
        continue;
      }

      // Get provider info
      const { data: provider } = await supabaseAdmin
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", booking.assigned_provider_id)
        .maybeSingle();

      if (!provider?.phone) continue;

      const scheduledDate = new Date(booking.scheduled_at);
      const hoursLeft = Math.round((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      // Send WhatsApp reminder via outbox
      await supabaseAdmin.from("booking_outbox").insert({
        booking_id: booking.id,
        destination: "webhook",
        payload: {
          event: "provider_reminder",
          booking_id: booking.id,
          booking_number: booking.booking_number,
          provider_phone: provider.phone,
          provider_name: provider.full_name || "",
          city: booking.city,
          scheduled_at: booking.scheduled_at,
          hours_left: hoursLeft,
          message: `تذكير: لديك طلب ${booking.booking_number || ""} في ${booking.city} بعد حوالي ${hoursLeft} ساعة (${scheduledDate.toLocaleString("ar-JO")}). يرجى التحضير والتوجه في الوقت المحدد.`,
          created_at: now.toISOString(),
        },
        status: "pending",
      });

      // Also send in-app notification
      await supabaseAdmin.from("staff_notifications").insert({
        title: `⏰ تذكير للمزود: ${booking.booking_number || booking.id.slice(0, 8)}`,
        body: `تبقى حوالي ${hoursLeft} ساعة على الموعد — المزود: ${provider.full_name || ""}`,
        target_role: "admin",
        booking_id: booking.id,
        provider_id: booking.assigned_provider_id,
      });

      // Update last reminder timestamp
      await supabaseAdmin
        .from("bookings")
        .update({ last_provider_reminder_at: now.toISOString() })
        .eq("id", booking.id);

      sentCount++;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("provider-reminders error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
