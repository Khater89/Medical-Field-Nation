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

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function smsFailureMessage(code: unknown): string {
  if (code === 21659) return "رقم الإرسال في Twilio غير صالح لهذا الحساب. استخدم رقم Twilio فعلي أو Messaging Service SID يبدأ بـ MG.";
  if (code === 21704) return "Messaging Service في Twilio لا يحتوي على Sender. أضف رقم Twilio أو Alphanumeric Sender ID إلى Sender Pool.";
  if (code === 21705) return "Messaging Service SID في Twilio غير صحيح أو غير تابع لهذا الحساب.";
  return "تعذّر إرسال الرسالة. تأكد من الرقم أو حاول لاحقاً.";
}

async function getFirstSmsSender(lovableKey: string, twilioKey: string): Promise<string | null> {
  const resp = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=20`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
    },
  });

  if (!resp.ok) {
    console.error("Twilio sender lookup failed", resp.status, await resp.text());
    return null;
  }

  const payload = await resp.json();
  const sender = payload?.incoming_phone_numbers?.find((n: { phone_number?: string; capabilities?: { sms?: boolean } }) =>
    n.capabilities?.sms && n.phone_number && /^\+[1-9]\d{6,14}$/.test(n.phone_number)
  );
  return sender?.phone_number || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    const normalized = normalizeJoPhone(phone || "");
    if (!normalized) {
      return jsonResponse({ error: "invalid_phone", message: "رقم الهاتف غير صحيح. استخدم صيغة أردنية مثل 07XXXXXXXX أو +9627XXXXXXXX" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: max 1 send per 60s, max 5 per hour
    const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

    const { data: recent, error: recentError } = await admin
      .from("phone_otps")
      .select("id, created_at")
      .eq("phone", normalized)
      .gt("created_at", hourAgo)
      .order("created_at", { ascending: false });

    if (recentError) {
      console.error("OTP rate-limit lookup failed", recentError);
      return jsonResponse({ error: "database_error", message: "تعذّر تجهيز رمز التحقق حالياً" }, 500);
    }

    if (recent && recent.length > 0 && recent[0].created_at > sixtySecAgo) {
      return jsonResponse({ error: "rate_limited", message: "الرجاء الانتظار 60 ثانية قبل طلب رمز جديد" }, 429);
    }
    if (recent && recent.length >= 5) {
      return jsonResponse({ error: "hourly_limit", message: "تجاوزت الحد المسموح. حاول لاحقاً بعد ساعة" }, 429);
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code + normalized);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    // Send via Twilio gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_FROM_PHONE")?.trim();
    const MSID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim();
    let effectiveFrom = FROM;
    let hasValidFrom = !!effectiveFrom && /^\+[1-9]\d{6,14}$/.test(effectiveFrom);
    const hasValidMsid = !!MSID && /^MG[0-9a-fA-F]{32}$/.test(MSID);

    if (MSID && !hasValidMsid) {
      console.error("Invalid TWILIO_MESSAGING_SERVICE_SID format");
      return jsonResponse({
        error: "server_config",
        message: "إعداد Messaging Service في Twilio غير صحيح. يجب أن يبدأ بـ MG وليس رقم هاتف.",
      }, 500);
    }

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      console.error("Missing Twilio env", { hasLovable: !!LOVABLE_API_KEY, hasTwilio: !!TWILIO_API_KEY, hasFrom: hasValidFrom, hasMsid: hasValidMsid });
      return jsonResponse({ error: "server_config", message: "خدمة الرسائل غير مهيّأة" }, 500);
    }

    // Prefer a concrete Twilio SMS number when available. A Messaging Service can exist
    // but still fail delivery immediately if its Sender Pool is empty (Twilio 21704).
    const accountSender = await getFirstSmsSender(LOVABLE_API_KEY, TWILIO_API_KEY);
    if (accountSender) {
      effectiveFrom = accountSender;
      hasValidFrom = true;
    }

    if (!hasValidFrom && !hasValidMsid) {
      console.error("Missing Twilio sender", { hasFrom: hasValidFrom, hasMsid: hasValidMsid });
      return jsonResponse({ error: "server_config", message: "خدمة الرسائل غير مهيّأة" }, 500);
    }

    // Store hash before sending so a delivered SMS always has a valid code.
    // If Twilio rejects the send, delete this row so failed sends do not trigger resend rate limits.
    const { data: otpRow, error: insertError } = await admin
      .from("phone_otps")
      .insert({ phone: normalized, code_hash: codeHash, expires_at: expiresAt })
      .select("id")
      .single();

    if (insertError || !otpRow) {
      console.error("OTP insert failed", insertError);
      return jsonResponse({ error: "database_error", message: "تعذّر تجهيز رمز التحقق حالياً" }, 500);
    }

    const params: Record<string, string> = {
      To: normalized,
      Body: `رمز الدخول إلى السوق الطبي: ${code}\nصالح لمدة 5 دقائق.`,
    };
    if (hasValidFrom) params.From = effectiveFrom!;
    else params.MessagingServiceSid = MSID!;
    const body = new URLSearchParams(params);

    const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const txt = await resp.text();

    if (!resp.ok) {
      console.error("Twilio send failed", resp.status, txt);
      await admin.from("phone_otps").delete().eq("id", otpRow.id);

      let message = smsFailureMessage(undefined);
      try {
        const parsed = JSON.parse(txt);
        message = smsFailureMessage(parsed?.code);
      } catch (_) {
        // Keep generic Arabic message.
      }

      return jsonResponse({ error: "sms_failed", message, details: txt }, 502);
    }

    let sentMessage: Record<string, unknown> | null = null;
    try {
      sentMessage = JSON.parse(txt);
    } catch (_) {
      console.error("Twilio returned non-JSON success body", txt);
    }

    // Twilio can accept the API request while marking the message failed immediately.
    // In that case do not show the user "OTP sent" and do not keep an unusable code.
    if (sentMessage?.status === "failed" || sentMessage?.status === "undelivered") {
      console.error("Twilio message delivery failed immediately", sentMessage);
      await admin.from("phone_otps").delete().eq("id", otpRow.id);
      return jsonResponse({
        error: "sms_failed",
        message: smsFailureMessage(sentMessage.error_code),
        details: JSON.stringify(sentMessage),
      }, 502);
    }

    return jsonResponse({ success: true, phone: normalized, expires_in: 300 }, 200);
  } catch (e) {
    console.error("send-phone-otp error", e);
    return jsonResponse({ error: "internal", message: (e as Error).message }, 500);
  }
});
