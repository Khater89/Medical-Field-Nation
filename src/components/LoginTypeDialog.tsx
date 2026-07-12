import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  User,
  Stethoscope,
  Store,
  ArrowLeft,
  ArrowRight,
  LogIn,
  UserPlus,
  Pill,
  Activity,
  HeartPulse,
  Wind,
  Smile,
  Eye,
  Package,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LoginTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "root" | "vendor";

const VENDOR_TYPES = [
  { key: "pharmacy", ar: "صيدلية", en: "Pharmacy", icon: Pill },
  { key: "medical_devices", ar: "أجهزة طبية", en: "Medical devices", icon: Activity },
  { key: "prosthetics", ar: "أطراف صناعية", en: "Prosthetics", icon: HeartPulse },
  { key: "medical_devices", ar: "أجهزة تنفس", en: "Respiratory devices", icon: Wind },
  { key: "medical_devices", ar: "أجهزة أسنان", en: "Dental devices", icon: Smile },
  { key: "medical_devices", ar: "أجهزة عيون", en: "Eye devices", icon: Eye },
  { key: "medical_devices", ar: "مستلزمات علاج طبيعي", en: "Physio supplies", icon: Package },
];

export default function LoginTypeDialog({ open, onOpenChange }: LoginTypeDialogProps) {
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [step, setStep] = useState<Step>("root");
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const handleOpenChange = (v: boolean) => {
    if (!v) setStep("root");
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {step === "root"
              ? t("اختر نوع الحساب", "Choose account type")
              : t("اختر نوع المتجر", "Choose store type")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "root"
              ? t(
                  "اختر الطريقة المناسبة للدخول أو إنشاء حساب جديد",
                  "Pick the right way to sign in or create a new account",
                )
              : t(
                  "حدد نوع متجرك للمتابعة",
                  "Select your store type to continue",
                )}
          </DialogDescription>
        </DialogHeader>

        {step === "root" && (
          <div className="grid gap-3">
            {/* Customer */}
            <Card className="p-4 border-2 hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm mb-0.5">
                    {t("عميل", "Customer")}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {t("لحجز الخدمات الطبية المنزلية والتسوق", "Book services and shop")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" onClick={() => onOpenChange(false)}>
                      <Link to="/auth">
                        <LogIn className="h-3.5 w-3.5 me-1" />
                        {t("تسجيل الدخول", "Sign in")}
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                      <Link to="/auth?tab=signup">
                        <UserPlus className="h-3.5 w-3.5 me-1" />
                        {t("حساب جديد", "New account")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Provider */}
            <Card className="p-4 border-2 hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm mb-0.5">
                    {t("مزود خدمة طبية", "Medical provider")}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {t("طبيب، ممرض، أخصائي علاج طبيعي", "Doctor, nurse, physiotherapist")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" onClick={() => onOpenChange(false)}>
                      <Link to="/auth">
                        <LogIn className="h-3.5 w-3.5 me-1" />
                        {t("تسجيل الدخول", "Sign in")}
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                      <Link to="/provider/register">
                        <UserPlus className="h-3.5 w-3.5 me-1" />
                        {t("حساب مزود جديد", "New provider account")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Vendor / Marketplace */}
            <Card className="p-4 border-2 hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm mb-0.5">
                    {t("متجر / السوق الطبي", "Store / Marketplace")}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {t("صيدلية، متجر أجهزة طبية، أطراف صناعية…", "Pharmacy, medical devices, prosthetics…")}
                  </div>
                  <Button size="sm" onClick={() => setStep("vendor")}>
                    {t("اختر نوع المتجر", "Choose store type")}
                    <Arrow className="h-3.5 w-3.5 ms-1" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {step === "vendor" && (
          <div className="space-y-3">
            <div className="grid gap-2">
              {VENDOR_TYPES.map((v, idx) => {
                const Icon = v.icon;
                return (
                  <Card key={idx} className="p-3 border hover:border-teal-400 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{isAr ? v.ar : v.en}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => onOpenChange(false)}
                        >
                          <Link to="/auth">{t("دخول", "Sign in")}</Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => onOpenChange(false)}
                        >
                          <Link to={`/vendor/register?type=${v.key}`}>
                            {t("تسجيل جديد", "New")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setStep("root")}
            >
              {t("← رجوع", "← Back")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
