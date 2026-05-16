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
    const { booking_number, phone, payment_method } = await req.json();

    if (!booking_number || !phone || !payment_method) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["CASH", "INSURANCE", "CLIQ", "APPLE_PAY"].includes(payment_method)) {
      return new Response(JSON.stringify({ error: "invalid_payment_method" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedPhone = phone.replace(/[\s\-]/g, "").trim();

    // Find booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, booking_number, status, assigned_provider_id, payment_method, payment_status, agreed_price, provider_share, calculated_total")
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

    // Payment lock: once confirmed, cannot change
    if (booking.payment_status === "PAYMENT_METHOD_SET") {
      return new Response(JSON.stringify({ error: "already_set", payment_method: booking.payment_method }), {
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

    const storedPhone = contact?.customer_phone?.replace(/[\s\-]/g, "").trim() || "";
    if (!storedPhone || (!normalizedPhone.endsWith(storedPhone.slice(-7)) && !storedPhone.endsWith(normalizedPhone.slice(-7)))) {
      return new Response(JSON.stringify({ error: "phone_mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment method
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ payment_method, payment_status: "PAYMENT_METHOD_SET" })
      .eq("id", booking.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If CliQ, customer paid platform directly. Reverse provider's platform_fee debt
    // and credit provider's net share so wallet shows the full amount owed back to provider.
    if (payment_method === "CLIQ" && booking.assigned_provider_id) {
      // Idempotency: skip if we've already credited this booking
      const { data: existingCredit } = await supabase
        .from("provider_wallet_ledger")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("reason", "cliq_payment_credit")
        .maybeSingle();

      // Resolve platform fee percent from settings as fallback
      const { data: settingsRow } = await supabase
        .from("platform_settings")
        .select("platform_fee_percent")
        .eq("id", 1)
        .maybeSingle();
      const feePct = Number(settingsRow?.platform_fee_percent ?? 10);

      const clientTotal = Number(booking.calculated_total ?? booking.agreed_price ?? 0);
      const providerNet = booking.provider_share != null
        ? Number(booking.provider_share)
        : Math.round(clientTotal * (1 - feePct / 100) * 100) / 100;
      const platformAmount = Math.round((clientTotal - providerNet) * 100) / 100;

      let providerTotal = providerNet;

      if (!existingCredit) {
        // Sum existing debt for this booking and reverse it (platform was paid directly via CliQ)
        const { data: debtRows } = await supabase
          .from("provider_wallet_ledger")
          .select("amount")
          .eq("booking_id", booking.id)
          .eq("reason", "platform_fee");
        const existingDebt = (debtRows || []).reduce(
          (s: number, r: any) => s + Math.abs(Number(r.amount || 0)),
          0,
        );
        if (existingDebt > 0) {
          await supabase.from("provider_wallet_ledger").insert({
            provider_id: booking.assigned_provider_id,
            amount: existingDebt,
            reason: "platform_fee_reversal",
            booking_id: booking.id,
          });
        }

        // Credit provider's net share (platform owes provider this amount)
        await supabase.from("provider_wallet_ledger").insert({
          provider_id: booking.assigned_provider_id,
          amount: providerNet,
          reason: "cliq_payment_credit",
          booking_id: booking.id,
        });
      }

      // Notify provider about credit
      await supabase.from("staff_notifications").insert({
        title: "💳 تم استلام دفعة CliQ",
        body: `تم استلام دفعة CliQ للطلب ${booking.booking_number}. تمت إضافة حصتك (${providerTotal} د.أ) لمحفظتك وتسوية المديونية تلقائياً.`,
        target_role: "provider",
        provider_id: booking.assigned_provider_id,
        booking_id: booking.id,
      });

      // Notify admin
      await supabase.from("staff_notifications").insert({
        title: `💳 دفع CliQ — ${booking.booking_number}`,
        body: `اختار العميل الدفع عبر CliQ. تمت إضافة حصة المزود (${providerTotal} د.أ) لمحفظته تلقائياً.`,
        target_role: "admin",
        booking_id: booking.id,
      });
    }

    // If CASH or INSURANCE, send financial notification to provider
    if ((payment_method === "CASH" || payment_method === "INSURANCE") && booking.assigned_provider_id) {
      const methodLabel = payment_method === "CASH" ? "نقداً" : "تأمين طبي";
      await supabase.from("staff_notifications").insert({
        title: "💰 تنبيه مالي: مستحقات جديدة",
        body: `تم اختيار الدفع "${methodLabel}" للطلب ${booking.booking_number}. تم تسجيل حصة المنصة كمديونية في محفظتك. يرجى التسوية خلال 24 ساعة.`,
        target_role: "provider",
        provider_id: booking.assigned_provider_id,
        booking_id: booking.id,
      });

      // Also notify admin
      await supabase.from("staff_notifications").insert({
        title: `💰 دفع ${methodLabel} — ${booking.booking_number}`,
        body: `اختار العميل الدفع "${methodLabel}". تم تسجيل مستحقات المنصة في محفظة المزود.`,
        target_role: "admin",
        booking_id: booking.id,
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
