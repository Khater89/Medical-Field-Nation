import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find bookings within 24h window that aren't completed/cancelled
    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("id, booking_number, assigned_provider_id, scheduled_at, city, service_id, status, last_hourly_reminder_at, customer_display_name")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", in24h.toISOString())
      .not("status", "in", '("COMPLETED","CANCELLED")');

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return new Response(JSON.stringify({ checked: 0, reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reminded = 0;
    for (const booking of upcomingBookings) {
      // Skip if last reminder was less than 55 minutes ago
      if (booking.last_hourly_reminder_at) {
        const lastReminder = new Date(booking.last_hourly_reminder_at);
        if (now.getTime() - lastReminder.getTime() < 55 * 60 * 1000) continue;
      }

      const hoursLeft = Math.max(1, Math.ceil(
        (new Date(booking.scheduled_at).getTime() - now.getTime()) / (60 * 60 * 1000)
      ));
      const ref = booking.booking_number || booking.id.slice(0, 8);

      // Staff notification for admin/owner
      await supabase.from("staff_notifications").insert({
        title: `تذكير ⏰ ${ref} خلال ${hoursLeft} ساعة`,
        body: `الطلب ${ref} - ${booking.city} - الحالة: ${booking.status}`,
        target_role: "admin",
        booking_id: booking.id,
        provider_id: booking.assigned_provider_id,
      });

      // Provider outbox reminder (for WhatsApp via n8n)
      if (booking.assigned_provider_id) {
        await supabase.from("booking_outbox").insert({
          booking_id: booking.id,
          destination: "webhook",
          payload: {
            event: "provider_reminder_hourly",
            booking_number: ref,
            scheduled_at: booking.scheduled_at,
            city: booking.city,
            hours_left: hoursLeft,
            provider_id: booking.assigned_provider_id,
          },
          status: "pending",
        });
      }

      // Update last_hourly_reminder_at
      const updateData: Record<string, any> = {
        last_hourly_reminder_at: now.toISOString(),
      };
      if (!booking.last_hourly_reminder_at) {
        updateData.reminder_window_started_at = now.toISOString();
      }
      await supabase.from("bookings").update(updateData).eq("id", booking.id);

      reminded++;
    }

    return new Response(JSON.stringify({ checked: upcomingBookings.length, reminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
