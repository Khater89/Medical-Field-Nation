import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_OVERDUE_REMINDERS = 12;
const TERMINAL = ["COMPLETED", "CANCELLED", "REJECTED"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const nowIso = now.toISOString();
    const in60 = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const in55 = new Date(now.getTime() + 55 * 60 * 1000).toISOString();
    const minus5 = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const farPast = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Active bookings with assigned provider
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, booking_number, scheduled_at, assigned_provider_id, status")
      .not("assigned_provider_id", "is", null)
      .not("scheduled_at", "is", null)
      .not("status", "in", `(${TERMINAL.join(",")})`)
      .gte("scheduled_at", farPast);

    if (error) throw error;

    let created = { one_hour: 0, due: 0, overdue: 0 };

    for (const b of bookings || []) {
      const provider = b.assigned_provider_id as string;
      const bnum = b.booking_number || b.id.slice(0, 8);
      const scheduled = new Date(b.scheduled_at).getTime();
      const nowMs = now.getTime();

      // A) ONE_HOUR_BEFORE — window [now+55min .. now+60min]
      if (scheduled > nowMs && scheduled - nowMs <= 60 * 60 * 1000 && scheduled - nowMs > 55 * 60 * 1000) {
        const { error: insErr } = await supabase.from("provider_notifications").insert({
          provider_id: provider,
          booking_id: b.id,
          type: "ONE_HOUR_BEFORE",
          title: "اقترب موعد الطلب",
          message: `موعد الطلب رقم ${bnum} بعد ساعة. يرجى الاستعداد.`,
        });
        if (!insErr) created.one_hour++;
      }

      // B) DUE_NOW — window [scheduled .. scheduled+5min]
      if (nowMs >= scheduled && nowMs < scheduled + 5 * 60 * 1000) {
        const { error: insErr } = await supabase.from("provider_notifications").insert({
          provider_id: provider,
          booking_id: b.id,
          type: "DUE_NOW",
          title: "حان موعد الطلب",
          message: `حان الآن موعد الطلب رقم ${bnum}.`,
        });
        if (!insErr) created.due++;
      }

      // C) OVERDUE_REMINDER — every 5 min after scheduled+5min, max 12
      if (nowMs > scheduled + 5 * 60 * 1000) {
        const { data: existing } = await supabase
          .from("provider_notifications")
          .select("id, created_at, metadata")
          .eq("booking_id", b.id)
          .eq("provider_id", provider)
          .eq("type", "OVERDUE_REMINDER")
          .order("created_at", { ascending: false });

        const count = existing?.length || 0;
        if (count >= MAX_OVERDUE_REMINDERS) continue;

        const last = existing?.[0];
        if (last) {
          const lastMs = new Date(last.created_at).getTime();
          if (nowMs - lastMs < 5 * 60 * 1000) continue;
        }

        const overdueMin = Math.floor((nowMs - scheduled) / 60000);
        const { error: insErr } = await supabase.from("provider_notifications").insert({
          provider_id: provider,
          booking_id: b.id,
          type: "OVERDUE_REMINDER",
          title: "تذكير بتأخر الطلب",
          message: `الطلب رقم ${bnum} متأخر عن موعده. يرجى المتابعة أو إغلاق الطلب عند الانتهاء.`,
          metadata: { overdue_minutes: overdueMin, sequence: count + 1 },
        });
        if (!insErr) created.overdue++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, checked: bookings?.length || 0, created, at: nowIso }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("booking-reminder-dispatcher error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
