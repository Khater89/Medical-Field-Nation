import { createClient } from "npm:@supabase/supabase-js@2";
import type { User } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeJoPhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (/^962[7-9]\d{8}$/.test(d)) return "+" + d;
  if (/^[7-9]\d{8}$/.test(d)) return "+962" + d;
  if (/^[1-9]\d{7,14}$/.test(d)) return "+" + d;
  return null;
}

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function legacyPhoneEmail(phone: string): string {
  return `p${phone.replace(/\D/g, "")}@mfn.phone.local`;
}

async function findAuthUserByPhone(admin: ReturnType<typeof createClient>, phone: string): Promise<User | null> {
  const legacyEmail = legacyPhoneEmail(phone).toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("listUsers phone lookup failed", error);
      return null;
    }
    const found = data.users.find((u) =>
      u.email?.toLowerCase() === legacyEmail || u.user_metadata?.phone === phone
    );
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone_or_username, password } = await req.json();
    const identifier = String(phone_or_username || "").trim();
    const pw = String(password || "");
    if (!identifier || !pw) {
      return json({ error: "missing_fields", message: "الرقم/اسم المستخدم وكلمة المرور مطلوبان" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve identifier to a profile
    const normalized = normalizeJoPhone(identifier);
    let profile: { user_id: string } | null = null;

    if (normalized) {
      const { data } = await admin
        .from("profiles").select("user_id").eq("phone", normalized).maybeSingle();
      profile = data;
    }
    if (!profile) {
      const { data } = await admin
        .from("profiles").select("user_id").ilike("username", identifier).maybeSingle();
      profile = data;
    }
    if (!profile?.user_id) {
      if (normalized) {
        const legacyUser = await findAuthUserByPhone(admin, normalized);
        if (legacyUser?.id) {
          return json({
            error: "setup_required",
            message: "أكمل إنشاء الحساب من تبويب حساب جديد لتعيين اسم المستخدم وكلمة المرور.",
          }, 200);
        }
      }
      return json({ error: "not_found", message: "الحساب غير موجود. أنشئ حساباً جديداً أولاً." }, 200);
    }

    // Get auth email for this user
    const { data: userRes, error: getErr } = await admin.auth.admin.getUserById(profile.user_id);
    if (getErr || !userRes?.user?.email) {
      return json({ error: "not_found", message: "الحساب غير موجود. أنشئ حساباً جديداً أولاً." }, 200);
    }

    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({
      email: userRes.user.email,
      password: pw,
    });
    if (signErr || !signed?.session) {
      return json({ error: "bad_credentials", message: "كلمة المرور غير صحيحة" }, 200);
    }

    return json({
      success: true,
      user_id: profile.user_id,
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
    }, 200);
  } catch (e) {
    console.error("phone-password-login error", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});
