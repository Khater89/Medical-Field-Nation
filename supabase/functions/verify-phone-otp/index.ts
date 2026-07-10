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

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validUsername(u: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(u);
}
function validPassword(p: string): boolean {
  return typeof p === "string" && p.length >= 6 &&
    /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
}
function usernameEmail(username: string): string {
  return `u_${username.toLowerCase()}@mfn.user.local`;
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

async function ensureCustomerRole(admin: ReturnType<typeof createClient>, userId: string) {
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "customer" }, { onConflict: "user_id,role" });
  if (error) console.error("customer role upsert failed", error);
}

async function signInWithEmail(SUPABASE_URL: string, email: string, password: string) {
  const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  return await anon.auth.signInWithPassword({ email, password });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode: string = body.mode || "verify_only";
    const normalized = normalizeJoPhone(body.phone || "");
    if (!normalized) return json({ error: "invalid_phone", message: "رقم غير صحيح" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (mode === "verify_only") {
      const code = String(body.code || "");
      if (!/^\d{6}$/.test(code)) {
        return json({ error: "invalid_code", message: "الرمز يجب أن يكون 6 أرقام" }, 400);
      }

      const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data: otps } = await admin
        .from("phone_otps")
        .select("id, code_hash, expires_at, attempts, verified_at, consumed_at, created_at")
        .eq("phone", normalized)
        .is("consumed_at", null)
        .gt("created_at", tenMinAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!otps || otps.length === 0) {
        return json({ error: "no_otp", message: "لم يتم إرسال رمز لهذا الرقم" }, 400);
      }

      const providedHash = await sha256(code + normalized);
      const now = new Date();
      const match = otps.find(
        (o) => o.code_hash === providedHash && new Date(o.expires_at) >= now && o.attempts < 5,
      );

      if (!match) {
        const latest = otps[0];
        await admin.from("phone_otps").update({ attempts: latest.attempts + 1 }).eq("id", latest.id);
        const anyValid = otps.some((o) => new Date(o.expires_at) >= now);
        return json(
          anyValid
            ? { error: "wrong_code", message: "الرمز غير صحيح" }
            : { error: "expired", message: "انتهت صلاحية الرمز. اطلب رمزاً جديداً." },
          400,
        );
      }

      // Mark verified but do NOT consume yet — signup step will consume.
      await admin.from("phone_otps").update({ verified_at: new Date().toISOString() }).eq("id", match.id);

      // Check if this phone already has an account (so client can show "sign in" instead)
      const { data: existing } = await admin
        .from("profiles").select("user_id").eq("phone", normalized).maybeSingle();
      return json({ success: true, verified: true, has_account: !!existing?.user_id }, 200);
    }

    if (mode === "signup") {
      const full_name = String(body.full_name || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const address = String(body.address || "").trim();

      if (full_name.length < 2) return json({ error: "invalid_name", message: "الاسم مطلوب" }, 400);
      if (!validUsername(username)) {
        return json({ error: "invalid_username", message: "اسم المستخدم: 3-20 حرف/رقم/شرطة سفلية" }, 400);
      }
      if (!validPassword(password)) {
        return json({ error: "invalid_password", message: "كلمة المرور: 6 أحرف على الأقل، حرف كبير ورقم ورمز" }, 400);
      }

      // Require a recent verified (not yet consumed) OTP for this phone
      const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data: otpRow } = await admin
        .from("phone_otps")
        .select("id, verified_at, consumed_at")
        .eq("phone", normalized)
        .is("consumed_at", null)
        .not("verified_at", "is", null)
        .gt("created_at", tenMinAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRow) {
        return json({ error: "not_verified", message: "يرجى التحقق من رقم الهاتف أولاً" }, 400);
      }

      // Phone must not already own a completed account
      const { data: existing } = await admin
        .from("profiles").select("user_id").eq("phone", normalized).maybeSingle();
      if (existing?.user_id) {
        return json({ error: "phone_taken", message: "هذا الرقم مسجّل مسبقاً. سجّل الدخول." }, 409);
      }

      // Recover legacy/partial phone accounts that were created before the
      // username+password profile step existed. We reuse the verified phone
      // account, set the chosen password, then create the missing profile.
      const legacyUser = await findAuthUserByPhone(admin, normalized);

      // Username must be free
      const { data: uTaken } = await admin
        .from("profiles").select("user_id").ilike("username", username).maybeSingle();
      if (uTaken && uTaken.user_id !== legacyUser?.id) {
        return json({ error: "username_taken", message: "اسم المستخدم محجوز" }, 409);
      }

      if (legacyUser?.id && legacyUser.email) {
        const { error: updateErr } = await admin.auth.admin.updateUserById(legacyUser.id, {
          password,
          user_metadata: {
            ...(legacyUser.user_metadata || {}),
            full_name,
            phone: normalized,
            username,
            phone_only: true,
            address,
          },
        });
        if (updateErr) {
          console.error("legacy user update failed", updateErr);
          return json({ error: "update_failed", message: updateErr.message || "تعذر تحديث الحساب" }, 500);
        }

        const { error: profileErr } = await admin.from("profiles").upsert({
          user_id: legacyUser.id,
          phone: normalized,
          full_name,
          username,
          address_text: address || null,
        }, { onConflict: "user_id" });
        if (profileErr) {
          console.error("legacy profile upsert failed", profileErr);
          return json({ error: "profile_failed", message: profileErr.message || "تعذر حفظ بيانات الحساب" }, 500);
        }
        await ensureCustomerRole(admin, legacyUser.id);

        const { data: signed, error: signErr } = await signInWithEmail(SUPABASE_URL, legacyUser.email, password);
        if (signErr || !signed?.session) {
          console.error("legacy signIn error", signErr);
          return json({ error: "signin_failed", message: signErr?.message || "تعذر تسجيل الدخول" }, 500);
        }

        await admin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
        return json({
          success: true,
          user_id: legacyUser.id,
          access_token: signed.session.access_token,
          refresh_token: signed.session.refresh_token,
        }, 200);
      }

      const email = usernameEmail(username);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, phone: normalized, username, phone_only: true, address },
      });
      if (createErr || !created?.user) {
        console.error("createUser error", createErr);
        return json({ error: "create_failed", message: createErr?.message || "تعذر إنشاء الحساب" }, 500);
      }
      const userId = created.user.id;

      const { error: profileErr } = await admin.from("profiles").upsert({
        user_id: userId,
        phone: normalized,
        full_name,
        username,
        address_text: address || null,
      }, { onConflict: "user_id" });
      if (profileErr) {
        console.error("profile upsert failed", profileErr);
        await admin.auth.admin.deleteUser(userId);
        return json({ error: "profile_failed", message: profileErr.message || "تعذر حفظ بيانات الحساب" }, 500);
      }
      await ensureCustomerRole(admin, userId);

      // Sign in immediately
      const { data: signed, error: signErr } = await signInWithEmail(SUPABASE_URL, email, password);
      if (signErr || !signed?.session) {
        console.error("signIn error", signErr);
        return json({ error: "signin_failed", message: signErr?.message || "تعذر تسجيل الدخول" }, 500);
      }

      await admin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

      return json({
        success: true,
        user_id: userId,
        access_token: signed.session.access_token,
        refresh_token: signed.session.refresh_token,
      }, 200);
    }

    return json({ error: "bad_mode", message: "وضع غير معروف" }, 400);
  } catch (e) {
    console.error("verify-phone-otp error", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});
