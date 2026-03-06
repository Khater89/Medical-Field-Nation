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
    // Verify admin via JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create user-context client to check role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for deletion (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse body for action
    const body = await req.json().catch(() => ({}));
    const action = body.action || "delete";

    if (action === "count") {
      // Just return counts
      const { count: bookingsCount } = await adminClient
        .from("bookings")
        .select("*", { count: "exact", head: true });
      const { count: historyCount } = await adminClient
        .from("booking_history")
        .select("*", { count: "exact", head: true });
      const { count: contactsCount } = await adminClient
        .from("booking_contacts")
        .select("*", { count: "exact", head: true });
      const { count: outboxCount } = await adminClient
        .from("booking_outbox")
        .select("*", { count: "exact", head: true });
      const { count: notificationsCount } = await adminClient
        .from("notifications_log")
        .select("*", { count: "exact", head: true });
      const { count: walletCount } = await adminClient
        .from("provider_wallet_ledger")
        .select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          ok: true,
          counts: {
            bookings: bookingsCount || 0,
            booking_history: historyCount || 0,
            booking_contacts: contactsCount || 0,
            booking_outbox: outboxCount || 0,
            notifications_log: notificationsCount || 0,
            provider_wallet_ledger: walletCount || 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete in correct order (FK dependencies)
    const results: Record<string, number> = {};

    // 1. booking_history
    const { data: d1 } = await adminClient.from("booking_history").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
    results.booking_history = d1?.length || 0;

    // 2. booking_contacts
    const { data: d2 } = await adminClient.from("booking_contacts").delete().neq("booking_id", "00000000-0000-0000-0000-000000000000").select("booking_id");
    results.booking_contacts = d2?.length || 0;

    // 3. booking_outbox
    const { data: d3 } = await adminClient.from("booking_outbox").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
    results.booking_outbox = d3?.length || 0;

    // 4. data_access_log (booking-related)
    const { data: d4 } = await adminClient.from("data_access_log").delete().not("booking_id", "is", null).select("id");
    results.data_access_log = d4?.length || 0;

    // 5. notifications_log
    const { data: d5 } = await adminClient.from("notifications_log").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
    results.notifications_log = d5?.length || 0;

    // 6. provider_wallet_ledger
    const { data: d6 } = await adminClient.from("provider_wallet_ledger").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
    results.provider_wallet_ledger = d6?.length || 0;

    // 7. bookings (last - parent table)
    const { data: d7 } = await adminClient.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
    results.bookings = d7?.length || 0;

    return new Response(
      JSON.stringify({ ok: true, deleted: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
