// Public automation endpoint protected by a custom API key (x-api-key or Authorization: Bearer ...).
// No Supabase JWT involved. Read-only by default.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractApiKey(req: Request): string | null {
  const x = req.headers.get("x-api-key");
  if (x && x.trim()) return x.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const v = auth.slice(7).trim();
    if (v.startsWith("mfn_")) return v;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const apiKey = extractApiKey(req);
  if (!apiKey) return json({ error: "Missing API key (x-api-key or Authorization: Bearer ...)" }, 401);

  const url = new URL(req.url);
  // path looks like /automation-api/<resource>
  const parts = url.pathname.split("/").filter(Boolean);
  const resource = parts[parts.length - 1] || "ping";

  const { data: verifyData, error: verifyErr } = await admin.rpc("verify_api_key", {
    _plain_key: apiKey,
    _endpoint: resource,
  });
  if (verifyErr) return json({ error: "Verification failed" }, 500);
  const keyRow = Array.isArray(verifyData) ? verifyData[0] : verifyData;
  if (!keyRow?.id) return json({ error: "Invalid or revoked API key" }, 401);
  const scopes: string[] = keyRow.scopes || [];
  const has = (s: string) => scopes.includes(s) || scopes.includes("*");

  try {
    if (resource === "ping") {
      return json({ ok: true, label: keyRow.label, scopes });
    }

    if (resource === "bookings") {
      if (!has("bookings:read")) return json({ error: "Scope bookings:read required" }, 403);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const status = url.searchParams.get("status");
      let q = admin.from("bookings").select(
        "id, booking_number, status, service_id, city, scheduled_at, created_at, assigned_provider_id, agreed_price, calculated_total, payment_method, payment_status, is_emergency, customer_display_name"
      ).order("created_at", { ascending: false }).limit(limit);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    if (resource === "status") {
      if (!has("status:read")) return json({ error: "Scope status:read required" }, 403);
      const bn = url.searchParams.get("booking_number");
      if (!bn) return json({ error: "booking_number required" }, 400);
      const { data, error } = await admin
        .from("bookings")
        .select("booking_number, status, scheduled_at, assigned_provider_id, payment_status, payment_method")
        .eq("booking_number", bn)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "not_found" }, 404);
      return json({ data });
    }

    if (resource === "finance") {
      if (!has("finance:read")) return json({ error: "Scope finance:read required" }, 403);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const { data, error } = await admin
        .from("provider_wallet_ledger")
        .select("id, provider_id, booking_id, amount, reason, settled_at, created_at, cliq_reference")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    return json({ error: `Unknown resource: ${resource}` }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
