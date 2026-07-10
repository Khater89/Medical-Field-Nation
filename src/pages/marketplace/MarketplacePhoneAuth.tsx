import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BackButton from "@/components/ui/back-button";
import { Phone, ShieldCheck, Loader2, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "phone" | "otp" | "profile";

function normalizeJoPhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (/^962[7-9]\d{8}$/.test(d)) return "+" + d;
  if (/^[7-9]\d{8}$/.test(d)) return "+962" + d;
  if (/^[1-9]\d{7,14}$/.test(d)) return "+" + d;
  return null;
}

export default function MarketplacePhoneAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/marketplace";
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [normPhone, setNormPhone] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!loading && user) navigate(redirect, { replace: true });
  }, [loading, user, navigate, redirect]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const t = (ar: string, en: string) => (isAr ? ar : en);

  const sendCode = async () => {
    const n = normalizeJoPhone(phone);
    if (!n) {
      toast.error(t("رقم غير صحيح. مثال: 07XXXXXXXX", "Invalid number. Example: +9627XXXXXXXX"));
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-phone-otp", { body: { phone: n } });
      if (error || data?.error) {
        toast.error(data?.message || error?.message || t("تعذّر إرسال الرمز", "Failed to send code"));
        return;
      }
      setNormPhone(data.phone || n);
      setStep("otp");
      setResendIn(60);
      toast.success(t("تم إرسال رمز التحقق إلى هاتفك", "OTP sent to your phone"));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (nameOverride?: string, addrOverride?: string) => {
    if (!/^\d{6}$/.test(code)) {
      toast.error(t("الرمز يجب أن يكون 6 أرقام", "Code must be 6 digits"));
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: {
          phone: normPhone,
          code,
          full_name: (nameOverride ?? fullName).trim() || undefined,
          address: (addrOverride ?? address).trim() || undefined,
        },
      });
      if (error || data?.error) {
        toast.error(data?.message || error?.message || t("فشل التحقق", "Verification failed"));
        return;
      }

      // If new account and no name given yet, ask for name/address first
      if (data.needs_profile && !nameOverride) {
        setStep("profile");
        return;
      }

      // Establish session on client
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      toast.success(t("تم تسجيل الدخول بنجاح", "Signed in successfully"));
      // Reload to redirect (AuthContext will pick up session)
      window.location.href = redirect;
    } finally {
      setBusy(false);
    }
  };

  const submitProfile = async () => {
    if (fullName.trim().length < 2) {
      toast.error(t("الاسم مطلوب", "Name required"));
      return;
    }
    await verifyCode(fullName, address);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="container max-w-md py-8">
        <BackButton to="/" />
        <div className="text-center mb-6 mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{t("الدخول إلى السوق الطبي", "Enter the Medical Marketplace")}</h1>
          <p className="text-sm text-muted-foreground">{t("الدخول برقم الهاتف فقط", "Phone-only sign in")}</p>
        </div>

        <Card className="p-6 space-y-4">
          {step === "phone" && (
            <>
              <div className="flex items-center gap-2 text-primary">
                <Phone className="w-5 h-5" />
                <h2 className="font-semibold">{t("رقم الهاتف", "Phone number")}</h2>
              </div>
              <div>
                <Label>{t("أدخل رقمك المحمول", "Enter your mobile number")}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  inputMode="tel"
                  dir="ltr"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("مثال: 07XXXXXXXX أو +9627XXXXXXXX", "Example: +9627XXXXXXXX")}
                </p>
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
                {t("تم إرسال رمز مكوّن من 6 أرقام إلى", "A 6-digit code was sent to")}{" "}
                <span dir="ltr" className="font-mono">{normPhone}</span>
              </p>
              <div>
                <Label>{t("الرمز", "Code")}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={6}
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>
              <Button className="w-full" onClick={() => verifyCode()} disabled={busy || code.length !== 6}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("تأكيد ودخول", "Verify & sign in")}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline disabled:opacity-40"
                  disabled={resendIn > 0 || busy}
                  onClick={sendCode}
                >
                  {resendIn > 0
                    ? t(`إعادة الإرسال بعد ${resendIn} ث`, `Resend in ${resendIn}s`)
                    : t("إعادة إرسال الرمز", "Resend code")}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline"
                  onClick={() => { setStep("phone"); setCode(""); }}
                >
                  {t("تغيير الرقم", "Change number")}
                </button>
              </div>
            </>
          )}

          {step === "profile" && (
            <>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-semibold">{t("أكمل بياناتك", "Complete your profile")}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("رقمك موثّق. أدخل اسمك لإكمال إنشاء الحساب.", "Your phone is verified. Enter your name to finish.")}
              </p>
              <div>
                <Label>{t("الاسم الكامل", "Full name")}</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
              </div>
              <div>
                <Label>{t("العنوان (اختياري)", "Address (optional)")}</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Button className="w-full" onClick={submitProfile} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("إنشاء الحساب والدخول", "Create account & sign in")}
              </Button>
            </>
          )}
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {t("لا نستخدم البريد الإلكتروني أو كلمة المرور — رقمك هو معرّفك.", "No email or password — your phone is your identifier.")}
        </p>
      </div>
    </div>
  );
}
