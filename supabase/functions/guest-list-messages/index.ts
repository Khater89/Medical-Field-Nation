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
    const { booking_number, phone } = await req.json();
    if (!booking_number || !phone) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedPhone = normalizePhone(phone);
    const { data: booking } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_number", booking_number.trim().toUpperCase())
      .single();

    if (!booking) return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: contact } = await supabase
      .from("booking_contacts").select("customer_phone").eq("booking_id", booking.id).single();
    const stored = normalizePhone(contact?.customer_phone || "");
    if (!phoneMatches(stored, normalizedPhone)) {
      return new Response(JSON.stringify({ error: "phone_mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: msgs }, { data: quotes }] = await Promise.all([
      supabase.from("booking_messages")
        .select("id, sender_id, sender_role, sender_display_name, body, quoted_price, target_provider_id, created_at")
        .eq("booking_id", booking.id).order("created_at", { ascending: true }),
      supabase.from("provider_quotes")
        .select("id, provider_id, quoted_price, note, created_at")
        .eq("booking_id", booking.id).order("created_at", { ascending: true }),
    ]);

    // Fetch sender avatars/names
    const senderIds = [...new Set((msgs || []).map((m) => m.sender_id).filter(Boolean))];
    const providerIds = [...new Set((quotes || []).map((q) => q.provider_id))];
    const allIds = [...new Set([...senderIds, ...providerIds])];
    const { data: profiles } = allIds.length
      ? await supabase.from("profiles").select("user_id, full_name, avatar_url, role_type").in("user_id", allIds)
      : { data: [] as any[] };
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    const messages = (msgs || []).map((m) => ({
      ...m,
      sender_display_name: m.sender_display_name || profileMap.get(m.sender_id)?.full_name || "مستخدم",
      sender_avatar: profileMap.get(m.sender_id)?.avatar_url || null,
    }));
    const formattedQuotes = (quotes || []).map((q) => {
      const p = profileMap.get(q.provider_id);
      return {
        id: q.id, provider_id: q.provider_id,
        provider_name: p?.full_name || "مزود الخدمة",
        provider_avatar: p?.avatar_url || null,
        provider_role: p?.role_type || null,
        quoted_price: q.quoted_price, note: q.note, created_at: q.created_at,
        is_mine: false,
      };
    });

    return new Response(JSON.stringify({ messages, quotes: formattedQuotes, booking_id: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
