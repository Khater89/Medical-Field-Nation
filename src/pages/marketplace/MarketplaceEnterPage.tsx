import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import BackButton from "@/components/ui/back-button";
import { UserRound, UserPlus, LogIn, ShoppingBag, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LS_NAME = "mp_guest_name";
const LS_PHONE = "mp_guest_phone";
const LS_SESSION = "mp_guest_session_token";
const LS_PHONE_NORM = "mp_guest_phone_norm";

export default function MarketplaceEnterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [guestOpen, setGuestOpen] = useState(false);
  const [step, setStep] = useState<"identity" | "otp">("identity");
  const [name, setName] = useState(localStorage.getItem(LS_NAME) || "");
  const [phone, setPhone] = useState(localStorage.getItem(LS_PHONE) || "");
  const [code, setCode] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Authenticated users skip the gate.
  useEffect(() => {
    if (!loading && user) navigate("/marketplace", { replace: true });
  }, [loading, user, navigate]);

  const resetDialog = () => {
    setStep("identity");
    setCode("");
    setDevHint(null);
    setBusy(false);
  };

  const requestOtp = async () => {
    const trimmedName = name.trim();
    const digits = phone.replace(/\D+/g, "");
    if (trimmedName.length < 2) return toast.error("الاسم الكامل مطلوب");
    if (digits.length < 9) return toast.error("رقم هاتف غير صحيح");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-guest", {
        body: { action: "request_otp", phone: phone.trim() },
      });
      if (error || data?.error) {
        toast.error(data?.error === "rate_limited" ? "تم تجاوز عدد المحاولات، حاول لاحقًا" : (data?.error || error?.message || "تعذّر إرسال الرمز"));
        return;
      }
      localStorage.setItem(LS_NAME, trimmedName);
      localStorage.setItem(LS_PHONE, phone.trim());
      if (data?.dev_otp) {
        setDevHint(String(data.dev_otp));
        toast.info(`رمز التحقق (وضع التطوير): ${data.dev_otp}`);
      } else {
        toast.success("تم إرسال رمز التحقق برسالة نصية");
      }
      setStep("otp");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (code.trim().length < 4) return toast.error("أدخل الرمز المكوّن من 6 أرقام");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-guest", {
        body: { action: "verify_otp", phone: phone.trim(), code: code.trim(), name: name.trim() },
      });
      if (error || data?.error) {
        toast.error(data?.error === "invalid_code" ? "رمز غير صحيح" : (data?.error || error?.message || "فشل التحقق"));
        return;
      }
      localStorage.setItem(LS_SESSION, data.session_token);
      localStorage.setItem(LS_PHONE_NORM, data.phone_norm);
      toast.success("تم التحقق ✓ مرحبًا بك في السوق الطبي");
      setGuestOpen(false);
      resetDialog();
      navigate("/marketplace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="container max-w-3xl py-8">
        <BackButton to="/" />
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">السوق الطبي</h1>
          <p className="text-muted-foreground">اختر طريقة الدخول للمتابعة</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => { resetDialog(); setGuestOpen(true); }}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 items-center justify-center mb-3">
              <UserRound className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">دخول كزائر</h3>
            <p className="text-xs text-muted-foreground">بالاسم ورقم الهاتف مع تحقق OTP</p>
          </Card>

          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => navigate("/auth?mode=signup&redirect=/marketplace")}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 items-center justify-center mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">تسجيل حساب جديد</h3>
            <p className="text-xs text-muted-foreground">احفظ رسائلك وطلباتك</p>
          </Card>

          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => navigate("/auth?mode=login&redirect=/marketplace")}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 items-center justify-center mb-3">
              <LogIn className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">تسجيل الدخول</h3>
            <p className="text-xs text-muted-foreground">إلى حسابي الموجود</p>
          </Card>
        </div>
      </div>

      <Dialog open={guestOpen} onOpenChange={(o) => { setGuestOpen(o); if (!o) resetDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{step === "identity" ? "الدخول كزائر" : "تحقق من رقم الهاتف"}</DialogTitle>
          </DialogHeader>

          {step === "identity" ? (
            <div className="space-y-3">
              <div>
                <Label>الاسم الكامل</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك الكامل" />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  inputMode="tel"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  سيصلك رمز تحقق برسالة نصية لتفعيل الدخول وربط محادثاتك وطلباتك.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                أدخل الرمز المرسل إلى <span dir="ltr" className="font-medium">{phone}</span>
              </div>
              <div>
                <Label>رمز التحقق</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  className="text-center text-lg tracking-[0.5em]"
                />
              </div>
              {devHint && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5" />
                  رمز التطوير: <span dir="ltr" className="font-mono font-bold">{devHint}</span>
                </div>
              )}
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => { setStep("identity"); setCode(""); }}
              >
                تعديل رقم الهاتف
              </button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setGuestOpen(false); resetDialog(); }}>إلغاء</Button>
            {step === "identity" ? (
              <Button onClick={requestOtp} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال رمز التحقق"}
              </Button>
            ) : (
              <Button onClick={verifyOtp} disabled={busy || code.length < 4}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحقق ودخول"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
