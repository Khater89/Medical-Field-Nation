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
    const { booking_number, phone, provider_id } = await req.json();
    if (!booking_number || !phone || !provider_id) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking } = await supabase
      .from("bookings").select("id, customer_user_id, status, assigned_provider_id, booking_number, customer_display_name")
      .eq("booking_number", booking_number.trim().toUpperCase()).single();
    if (!booking) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contact } = await supabase
      .from("booking_contacts").select("customer_phone, customer_name")
      .eq("booking_id", booking.id).single();
    if (!phoneMatches(normalizePhone(contact?.customer_phone || ""), normalizePhone(phone))) {
      return new Response(JSON.stringify({ error: "phone_mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (booking.status !== "NEW" || booking.assigned_provider_id) {
      return new Response(JSON.stringify({ error: "already_assigned" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify provider eligibility
    const { data: prov } = await supabase
      .from("profiles").select("user_id, full_name, provider_status")
      .eq("user_id", provider_id).single();
    if (!prov || prov.provider_status !== "approved") {
      return new Response(JSON.stringify({ error: "provider_not_eligible" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use latest pending quote price if exists
    const { data: q } = await supabase.from("provider_quotes")
      .select("id, quoted_price").eq("booking_id", booking.id)
      .eq("provider_id", provider_id).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const { data: updated, error: upErr } = await supabase
      .from("bookings")
      .update({
        status: "ASSIGNED",
        assigned_provider_id: provider_id,
        assigned_at: new Date().toISOString(),
        assigned_by: "customer",
        ...(q?.quoted_price ? { agreed_price: q.quoted_price } : {}),
      })
      .eq("id", booking.id).eq("status", "NEW").is("assigned_provider_id", null)
      .select("id").maybeSingle();
    if (upErr || !updated) {
      return new Response(JSON.stringify({ error: "race_lost" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (q?.id) {
      await supabase.from("provider_quotes").update({ status: "accepted" }).eq("id", q.id);
      await supabase.from("provider_quotes").update({ status: "rejected" })
        .eq("booking_id", booking.id).neq("id", q.id).eq("status", "pending");
    }

    const custName = contact?.customer_name || booking.customer_display_name || "العميل";

    await supabase.from("booking_history").insert({
      booking_id: booking.id, action: "customer_assigned",
      performed_by: booking.customer_user_id || provider_id, // best-effort
      performer_role: "customer",
      note: `Customer assigned provider ${prov.full_name || provider_id}`,
    });

    await supabase.from("staff_notifications").insert([
      {
        title: "🎯 تم إسناد طلب جديد لك",
        body: `قام العميل ${custName} بإسناد طلب رقم ${booking.booking_number || ""} إليك. يرجى مراجعة التفاصيل وقبول الطلب للمتابعة.`,
        target_role: "provider", provider_id, booking_id: booking.id,
      },
      {
        title: "👤 العميل أسند طلباً لمزود",
        body: `${custName} أسند الطلب ${booking.booking_number || ""} للمزود ${prov.full_name || ""}`,
        target_role: "admin", provider_id, booking_id: booking.id,
      },
    ]);

    return new Response(JSON.stringify({ success: true, booking_id: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
