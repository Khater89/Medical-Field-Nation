import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function normalizeJoPhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  d = d.replace(/^0+/, "");
  if (/^962[7-9]\d{8}$/.test(d)) return "+" + d;
  if (/^[7-9]\d{8}$/.test(d)) return "+962" + d;
  if (/^[1-9]\d{7,14}$/.test(d)) return "+" + d;
  return null;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    const normalized = normalizeJoPhone(phone || "");
    if (!normalized) {
      return new Response(JSON.stringify({ error: "invalid_phone", message: "رقم الهاتف غير صحيح. استخدم صيغة أردنية مثل 07XXXXXXXX أو +9627XXXXXXXX" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: max 1 send per 60s, max 5 per hour
    const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

    const { data: recent } = await admin
      .from("phone_otps")
      .select("id, created_at")
      .eq("phone", normalized)
      .gt("created_at", hourAgo)
      .order("created_at", { ascending: false });

    if (recent && recent.length > 0 && recent[0].created_at > sixtySecAgo) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "الرجاء الانتظار 60 ثانية قبل طلب رمز جديد" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (recent && recent.length >= 5) {
      return new Response(JSON.stringify({ error: "hourly_limit", message: "تجاوزت الحد المسموح. حاول لاحقاً بعد ساعة" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code + normalized);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    // Store hash
    await admin.from("phone_otps").insert({
      phone: normalized, code_hash: codeHash, expires_at: expiresAt,
    });

    // Send via Twilio gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_FROM_PHONE");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
      console.error("Missing Twilio env", { hasLovable: !!LOVABLE_API_KEY, hasTwilio: !!TWILIO_API_KEY, hasFrom: !!FROM });
      return new Response(JSON.stringify({ error: "server_config", message: "خدمة الرسائل غير مهيّأة" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = new URLSearchParams({
      To: normalized,
      From: FROM,
      Body: `رمز الدخول إلى السوق الطبي: ${code}\nصالح لمدة 5 دقائق.`,
    });

    const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Twilio send failed", resp.status, txt);
      return new Response(JSON.stringify({ error: "sms_failed", message: "تعذّر إرسال الرسالة. تأكد من الرقم أو حاول لاحقاً.", details: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, phone: normalized, expires_in: 300 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-phone-otp error", e);
    return new Response(JSON.stringify({ error: "internal", message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
