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

    // ====== PART 1: Late providers (15+ min past appointment, no check-in) ======
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: lateBookings } = await supabase
      .from("bookings")
      .select("id, booking_number, assigned_provider_id, scheduled_at, city")
      .in("status", ["ACCEPTED", "ASSIGNED"])
      .is("check_in_at", null)
      .lte("scheduled_at", fifteenMinAgo);

    let lateNotified = 0;
    if (lateBookings && lateBookings.length > 0) {
      const providerIds = [...new Set(lateBookings.map((b: any) => b.assigned_provider_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", providerIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || "—"; });

      const bookingIds = lateBookings.map((b: any) => b.id);
      const { data: existing } = await supabase
        .from("staff_notifications")
        .select("booking_id, target_role")
        .in("booking_id", bookingIds)
        .like("title", "%تأخر%");
      const alreadyAdmin = new Set((existing || []).filter((n: any) => n.target_role === "admin").map((n: any) => n.booking_id));
      const alreadyProv = new Set((existing || []).filter((n: any) => n.target_role === "provider").map((n: any) => n.booking_id));

      const newNotifs: any[] = [];
      for (const b of lateBookings) {
        if (!alreadyAdmin.has(b.id)) {
          newNotifs.push({
            target_role: "admin",
            title: `⏰ تأخر: ${b.booking_number || b.id.slice(0, 8)}`,
            body: `المزود ${nameMap[b.assigned_provider_id] || "—"} لم يبدأ الخدمة بعد مرور 15 دقيقة من الموعد (${b.city}).`,
            booking_id: b.id,
            provider_id: b.assigned_provider_id,
          });
        }
        if (!alreadyProv.has(b.id) && b.assigned_provider_id) {
          newNotifs.push({
            target_role: "provider",
            title: "⏰ أنت متأخر عن موعد الطلب",
            body: `لديك طلب متأخر في ${b.city}. يرجى التحرك أو إبلاغ الإدارة فوراً.`,
            booking_id: b.id,
            provider_id: b.assigned_provider_id,
          });
        }
      }
      if (newNotifs.length > 0) {
        await supabase.from("staff_notifications").insert(newNotifs);
      }
      lateNotified = newNotifs.length;
    }

    // ====== PART 2: 1-hour-before reminders (assigned/accepted, ~55-65 min away) ======
    const now = Date.now();
    const windowStart = new Date(now + 55 * 60 * 1000).toISOString();
    const windowEnd = new Date(now + 65 * 60 * 1000).toISOString();
    const { data: upcoming } = await supabase
      .from("bookings")
      .select("id, booking_number, assigned_provider_id, scheduled_at, city")
      .in("status", ["ASSIGNED", "ACCEPTED"])
      .not("assigned_provider_id", "is", null)
      .gte("scheduled_at", windowStart)
      .lte("scheduled_at", windowEnd);

    let reminderNotified = 0;
    if (upcoming && upcoming.length > 0) {
      const upIds = upcoming.map((b: any) => b.id);
      const { data: existingRem } = await supabase
        .from("staff_notifications")
        .select("booking_id")
        .in("booking_id", upIds)
        .like("title", "%تذكير%");
      const alreadyReminded = new Set((existingRem || []).map((n: any) => n.booking_id));

      const reminders = upcoming
        .filter((b: any) => !alreadyReminded.has(b.id))
        .map((b: any) => ({
          target_role: "provider",
          title: "📅 تذكير: لديك طلب خلال ساعة",
          body: `لديك طلب قادم خلال ساعة في ${b.city}. يرجى مراجعة تفاصيل الطلب والاستعداد للموعد.`,
          booking_id: b.id,
          provider_id: b.assigned_provider_id,
        }));
      if (reminders.length > 0) {
        await supabase.from("staff_notifications").insert(reminders);
      }
      reminderNotified = reminders.length;
    }

    return new Response(JSON.stringify({
      late_checked: lateBookings?.length || 0,
      late_notified: lateNotified,
      upcoming_checked: upcoming?.length || 0,
      reminder_notified: reminderNotified,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
