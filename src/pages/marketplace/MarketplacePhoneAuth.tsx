import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/ui/back-button";
import { Phone, ShieldCheck, Loader2, ShoppingBag, User as UserIcon, Lock, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SignupStep = "phone" | "otp" | "profile";

function normalizeJoPhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (/^962[7-9]\d{8}$/.test(d)) return "+" + d;
  if (/^[7-9]\d{8}$/.test(d)) return "+962" + d;
  if (/^[1-9]\d{7,14}$/.test(d)) return "+" + d;
  return null;
}

async function readFnError(error: unknown): Promise<{ error?: string; message?: string } | null> {
  const ctx = (error as { context?: Response })?.context;
  if (!ctx) return null;
  try { return await ctx.clone().json(); } catch {
    try { const t = await ctx.clone().text(); return t ? { message: t } : null; } catch { return null; }
  }
}

const pwRules = (p: string) => ({
  len: p.length >= 6,
  upper: /[A-Z]/.test(p),
  num: /\d/.test(p),
  sym: /[^A-Za-z0-9]/.test(p),
});
const pwValid = (p: string) => Object.values(pwRules(p)).every(Boolean);
const usernameValid = (u: string) => /^[a-zA-Z0-9_]{3,20}$/.test(u);

export default function MarketplacePhoneAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/marketplace";
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign in
  const [siId, setSiId] = useState("");
  const [siPw, setSiPw] = useState("");
  const [siBusy, setSiBusy] = useState(false);

  // Sign up
  const [step, setStep] = useState<SignupStep>("phone");
  const [phone, setPhone] = useState("");
  const [normPhone, setNormPhone] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Route users to the right dashboard based on their role.
  const roleAwareRedirect = async (): Promise<string> => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return redirect;
    const { data: rows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.id);
    const roles = (rows || []).map((r: any) => r.role);
    if (roles.includes("admin")) return "/admin";
    if (roles.includes("cs")) return "/cs";
    if (roles.includes("vendor")) return "/vendor";
    if (roles.includes("provider")) return "/provider";
    return redirect;
  };

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const to = await roleAwareRedirect();
      navigate(to, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const to = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(to);
  }, [resendIn]);

  // Debounced username availability
  useEffect(() => {
    if (!username) { setUsernameStatus("idle"); return; }
    if (!usernameValid(username)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const to = setTimeout(async () => {
      const { data, error } = await supabase.rpc("username_available", { _u: username });
      if (error) { setUsernameStatus("idle"); return; }
      setUsernameStatus(data ? "ok" : "taken");
    }, 400);
    return () => clearTimeout(to);
  }, [username]);

  const applySession = async (access_token: string, refresh_token: string) => {
    await supabase.auth.setSession({ access_token, refresh_token });
    const to = await roleAwareRedirect();
    window.location.href = to;
  };

  const doSignIn = async () => {
    if (!siId.trim() || !siPw) {
      toast.error(t("أدخل رقم الهاتف/اسم المستخدم وكلمة المرور", "Enter phone/username and password"));
      return;
    }
    setSiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-password-login", {
        body: { phone_or_username: siId.trim(), password: siPw },
      });
      if (error || data?.error) {
        const p = data?.error ? data : await readFnError(error);
        toast.error(p?.message || t("فشل تسجيل الدخول", "Sign in failed"));
        return;
      }
      toast.success(t("تم تسجيل الدخول", "Signed in"));
      await applySession(data.access_token, data.refresh_token);
    } finally { setSiBusy(false); }
  };

  const sendCode = async () => {
    const n = normalizeJoPhone(phone);
    if (!n) { toast.error(t("رقم غير صحيح. مثال: 07XXXXXXXX", "Invalid number")); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-phone-otp", { body: { phone: n } });
      if (error || data?.error) {
        const p = data?.error ? data : await readFnError(error);
        toast.error(p?.message || t("تعذّر إرسال الرمز", "Failed to send code"));
        return;
      }
      setNormPhone(data.phone || n);
      setStep("otp");
      setResendIn(60);
      toast.success(t("تم إرسال رمز التحقق", "OTP sent"));
    } finally { setBusy(false); }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) { toast.error(t("الرمز 6 أرقام", "Code must be 6 digits")); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: { mode: "verify_only", phone: normPhone, code },
      });
      if (error || data?.error) {
        const p = data?.error ? data : await readFnError(error);
        toast.error(p?.message || t("فشل التحقق", "Verification failed"));
        return;
      }
      if (data.has_account) {
        toast.info(t("هذا الرقم مسجّل. سجّل الدخول بكلمة المرور.", "Account exists. Sign in with your password."));
        setTab("signin");
        setSiId(normPhone);
        return;
      }
      setStep("profile");
    } finally { setBusy(false); }
  };

  const submitSignup = async () => {
    if (fullName.trim().length < 2) { toast.error(t("الاسم مطلوب", "Name required")); return; }
    if (!usernameValid(username)) { toast.error(t("اسم المستخدم: 3-20 حرف/رقم/_", "Username 3-20 chars")); return; }
    if (usernameStatus === "taken") { toast.error(t("اسم المستخدم محجوز", "Username taken")); return; }
    if (!pwValid(password)) { toast.error(t("كلمة المرور لا تحقق الشروط", "Password does not meet requirements")); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: {
          mode: "signup",
          phone: normPhone,
          full_name: fullName.trim(),
          username: username.trim(),
          password,
        },
      });
      if (error || data?.error) {
        const p = data?.error ? data : await readFnError(error);
        toast.error(p?.message || t("فشل إنشاء الحساب", "Signup failed"));
        return;
      }
      toast.success(t("تم إنشاء الحساب", "Account created"));
      await applySession(data.access_token, data.refresh_token);
    } finally { setBusy(false); }
  };

  const rules = pwRules(password);
  const RuleRow = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1 text-xs ${ok ? "text-green-600" : "text-muted-foreground"}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="container max-w-md py-8">
        <BackButton to="/" />
        <div className="text-center mb-6 mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{t("الدخول إلى السوق الطبي", "Medical Marketplace")}</h1>
          <p className="text-sm text-muted-foreground">{t("سجّل الدخول أو أنشئ حسابك", "Sign in or create your account")}</p>
        </div>

        <Card className="p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="signin">{t("تسجيل الدخول", "Sign in")}</TabsTrigger>
              <TabsTrigger value="signup">{t("حساب جديد", "Sign up")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <div>
                <Label>{t("رقم الهاتف أو اسم المستخدم", "Phone or username")}</Label>
                <div className="relative">
                  <UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={siId} onChange={(e) => setSiId(e.target.value)} className="ps-9" dir="ltr" autoFocus />
                </div>
              </div>
              <div>
                <Label>{t("كلمة المرور", "Password")}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" value={siPw} onChange={(e) => setSiPw(e.target.value)} className="ps-9" dir="ltr" />
                </div>
              </div>
              <Button className="w-full" onClick={doSignIn} disabled={siBusy}>
                {siBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("دخول", "Sign in")}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {step === "phone" && (
                <>
                  <div className="flex items-center gap-2 text-primary">
                    <Phone className="w-5 h-5" />
                    <h2 className="font-semibold">{t("رقم الهاتف", "Phone number")}</h2>
                  </div>
                  <div>
                    <Label>{t("أدخل رقمك المحمول", "Enter your mobile number")}</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" inputMode="tel" dir="ltr" autoFocus />
                    <p className="text-xs text-muted-foreground mt-1">{t("مثال: 07XXXXXXXX", "Example: +9627XXXXXXXX")}</p>
                  </div>
                  <Button className="w-full" onClick={sendCode} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("إرسال رمز التحقق", "Send OTP")}
                  </Button>
                </>
              )}

              {step === "otp" && (
                <>
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="w-5 h-5" />
                    <h2 className="font-semibold">{t("تحقق من رقمك", "Verify your number")}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("أُرسل رمز إلى", "Code sent to")} <span dir="ltr" className="font-mono">{normPhone}</span>
                  </p>
                  <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456" inputMode="numeric" dir="ltr" maxLength={6} autoFocus
                    className="text-center text-2xl tracking-widest font-mono" />
                  <Button className="w-full" onClick={verifyCode} disabled={busy || code.length !== 6}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("تحقق", "Verify")}
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <button type="button" className="text-primary hover:underline disabled:opacity-40"
                      disabled={resendIn > 0 || busy} onClick={sendCode}>
                      {resendIn > 0 ? t(`إعادة بعد ${resendIn}ث`, `Resend in ${resendIn}s`) : t("إعادة إرسال", "Resend")}
                    </button>
                    <button type="button" className="text-muted-foreground hover:underline"
                      onClick={() => { setStep("phone"); setCode(""); }}>
                      {t("تغيير الرقم", "Change number")}
                    </button>
                  </div>
                </>
              )}

              {step === "profile" && (
                <>
                  <div className="flex items-center gap-2 text-primary">
                    <UserIcon className="w-5 h-5" />
                    <h2 className="font-semibold">{t("أكمل بياناتك", "Complete your profile")}</h2>
                  </div>
                  <div>
                    <Label>{t("الاسم الكامل", "Full name")}</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <Label>{t("اسم المستخدم", "Username")}</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" placeholder="e.g. ahmad_92" />
                    <div className="text-xs mt-1">
                      {usernameStatus === "checking" && <span className="text-muted-foreground">{t("جارٍ التحقق...", "Checking...")}</span>}
                      {usernameStatus === "ok" && <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3" />{t("متاح", "Available")}</span>}
                      {usernameStatus === "taken" && <span className="text-destructive flex items-center gap-1"><X className="h-3 w-3" />{t("محجوز", "Taken")}</span>}
                      {usernameStatus === "invalid" && <span className="text-destructive">{t("3-20 حرف/رقم/شرطة سفلية", "3-20 letters/numbers/_")}</span>}
                    </div>
                  </div>
                  <div>
                    <Label>{t("كلمة المرور", "Password")}</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <RuleRow ok={rules.len} label={t("6 أحرف على الأقل", "At least 6 chars")} />
                      <RuleRow ok={rules.upper} label={t("حرف كبير", "Uppercase letter")} />
                      <RuleRow ok={rules.num} label={t("رقم", "A number")} />
                      <RuleRow ok={rules.sym} label={t("رمز خاص", "A symbol")} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={submitSignup}
                    disabled={busy || usernameStatus === "checking" || usernameStatus === "taken"}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("إنشاء الحساب", "Create account")}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {t("رقمك موثّق برمز SMS، وتُحفظ جميع محادثاتك في حسابك.", "Your phone is verified by SMS. All your chats are saved to your account.")}
        </p>
      </div>
    </div>
  );
}
