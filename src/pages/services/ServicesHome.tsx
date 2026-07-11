import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/ui/back-button";
import {
  Stethoscope, HeartPulse, Activity, ClipboardList, MapPin, Truck, ArrowLeft, UserPlus, Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import servicesHero from "@/assets/services-hero.jpg";
import heroVideo from "@/assets/home-hero-video.mp4.asset.json";

const CATEGORIES = [
  { key: "doctors", ar: "خدمات الأطباء", en: "Doctors", icon: Stethoscope, color: "text-sky-600 bg-sky-500/10" },
  { key: "nursing", ar: "خدمات التمريض", en: "Nursing", icon: HeartPulse, color: "text-rose-600 bg-rose-500/10" },
  { key: "physio", ar: "العلاج الطبيعي", en: "Physiotherapy", icon: Activity, color: "text-emerald-600 bg-emerald-500/10" },
];

export default function ServicesHome() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container max-w-5xl py-6 space-y-8">
        <BackButton to="/" label={t("الرئيسية", "Home")} />

        {/* Hero */}
        <section className="rounded-2xl bg-gradient-to-br from-sky-500/10 via-primary/5 to-transparent p-6 md:p-10 border">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{t("الخدمات الطبية المنزلية", "Home Medical Services")}</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            {t(
              "احجز خدمة، اختر مزوّدك، وتابع الطلب لحظة بلحظة — كل ذلك ضمن هذا القسم.",
              "Book a service, pick your provider, and track it live — all in this section.",
            )}
          </p>
          {!user && (
            <div className="mt-4 flex gap-2">
              <Button asChild>
                <Link to="/auth?redirect=/services">{t("تسجيل الدخول", "Sign in")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth?tab=signup&redirect=/services"><UserPlus className="h-4 w-4 me-2" />{t("حساب جديد", "Sign up")}</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Primary actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 hover:shadow-md transition-shadow border-2 hover:border-primary/40">
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h2 className="font-bold mb-1">{t("حجز خدمة", "Book a service")}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {t("اختر التخصص والوقت وأنشئ طلبك.", "Pick a specialty, time, and create your request.")}
            </p>
            <Button asChild className="w-full">
              <Link to="/booking">{t("ابدأ الحجز", "Start booking")} <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} /></Link>
            </Button>
          </Card>

          <Card className="p-5 hover:shadow-md transition-shadow border-2 hover:border-primary/40">
            <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Truck className="h-5 w-5" />
            </div>
            <h2 className="font-bold mb-1">{t("تتبّع طلبك", "Track your order")}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {t("تابع حالة طلبك من الحجز حتى الوصول.", "Follow your order live from booking to arrival.")}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/track">{t("فتح التتبع", "Open tracking")}</Link>
            </Button>
          </Card>

          <Card className="p-5 hover:shadow-md transition-shadow border-2 hover:border-primary/40">
            <div className="h-11 w-11 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center mb-3">
              <MapPin className="h-5 w-5" />
            </div>
            <h2 className="font-bold mb-1">{t("التعيين الذاتي", "Self-assign")}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {t("اختر أقرب مزوّد متاح مباشرة لطلبك.", "Pick the nearest available provider yourself.")}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/booking?mode=self">{t("ابدأ الآن", "Start")}</Link>
            </Button>
          </Card>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-lg font-bold mb-3">{t("فئات الخدمات", "Service categories")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <Link key={c.key} to={`/booking?category=${c.key}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow h-full">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${c.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-sm">{isAr ? c.ar : c.en}</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
