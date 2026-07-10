import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function syntheticEmail(phone: string): string {
  // phone starts with '+'; strip it
  return `p${phone.slice(1)}@mfn.phone.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone, code, full_name, address } = await req.json();
    const normalized = normalizeJoPhone(phone || "");
    if (!normalized) {
      return new Response(JSON.stringify({ error: "invalid_phone", message: "رقم غير صحيح" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!code || !/^\d{6}$/.test(String(code))) {
      return new Response(JSON.stringify({ error: "invalid_code", message: "الرمز يجب أن يكون 6 أرقام" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch latest unverified OTP for phone
    const { data: otps } = await admin
      .from("phone_otps")
      .select("id, code_hash, expires_at, attempts, verified_at")
      .eq("phone", normalized)
      .order("created_at", { ascending: false })
      .limit(1);

    const otp = otps?.[0];
    if (!otp) {
      return new Response(JSON.stringify({ error: "no_otp", message: "لم يتم إرسال رمز لهذا الرقم" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (otp.verified_at) {
      return new Response(JSON.stringify({ error: "already_used", message: "الرمز مستخدم مسبقاً" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(otp.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired", message: "انتهت صلاحية الرمز. اطلب رمزاً جديداً." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (otp.attempts >= 5) {
      return new Response(JSON.stringify({ error: "too_many_attempts", message: "تجاوزت عدد المحاولات. اطلب رمزاً جديداً." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providedHash = await sha256(String(code) + normalized);
    if (providedHash !== otp.code_hash) {
      await admin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "wrong_code", message: "الرمز غير صحيح" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark verified
    await admin.from("phone_otps").update({ verified_at: new Date().toISOString() }).eq("id", otp.id);

    // Find or create user by phone (via profiles table lookup)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .eq("phone", normalized)
      .maybeSingle();

    // Random strong password (never returned to user)
    const password = crypto.randomUUID() + "-" + crypto.randomUUID();
    let userId: string;
    let email: string;
    let isNewAccount = false;

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id;
      // Fetch existing user's email so we can sign them in
      const { data: userRes, error: getErr } = await admin.auth.admin.getUserById(userId);
      if (getErr || !userRes?.user) {
        return new Response(JSON.stringify({ error: "user_missing", message: "تعذر العثور على الحساب" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      email = userRes.user.email || syntheticEmail(normalized);
      // Reset password so we can sign in
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      // Optional: update name if provided and missing
      if (full_name && !existingProfile.full_name) {
        await admin.from("profiles").update({ full_name: full_name.trim() }).eq("user_id", userId);
      }
    } else {
      email = syntheticEmail(normalized);
      isNewAccount = true;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: normalized,
        phone_confirm: true,
        user_metadata: {
          full_name: (full_name || "").trim(),
          phone: normalized,
          phone_only: true,
          address: (address || "").trim(),
        },
      });
      if (createErr || !created?.user) {
        console.error("createUser error", createErr);
        return new Response(JSON.stringify({ error: "create_failed", message: createErr?.message || "تعذر إنشاء الحساب" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = created.user.id;
      // Update the profile row created by handle_new_user trigger
      await admin.from("profiles").update({
        phone: normalized,
        full_name: (full_name || "").trim() || null,
        address_text: (address || "").trim() || null,
      }).eq("user_id", userId);
    }

    // Sign in using anon client to obtain session tokens
    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });
    if (signErr || !signed?.session) {
      console.error("signIn error", signErr);
      return new Response(JSON.stringify({ error: "signin_failed", message: signErr?.message || "تعذر تسجيل الدخول" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      is_new_account: isNewAccount,
      needs_profile: isNewAccount && !full_name,
      user_id: userId,
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-phone-otp error", e);
    return new Response(JSON.stringify({ error: "internal", message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
