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

        {/* Cinematic hero with video background + big animated brand */}
        <section className="relative rounded-3xl overflow-hidden border min-h-[60vh] flex items-center justify-center">
          <video
            autoPlay muted loop playsInline
            poster={servicesHero}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={heroVideo.url} type="video/mp4" />
          </video>
          <img src={servicesHero} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/85" />
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 via-transparent to-primary/20" />

          <div className="relative z-10 text-center px-6 py-16 md:py-24 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-4 py-1.5 mb-5 backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {t("رعاية طبية منزلية موثوقة", "Trusted home medical care")}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15 }}
              className="brand-text-animated font-black tracking-tight leading-[0.95] text-[11vw] md:text-[7vw] lg:text-[6rem] drop-shadow-[0_6px_30px_hsl(var(--primary)/0.35)]"
            >
              MEDICAL<br />SERVICES
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-5 text-sm md:text-lg text-foreground/85 max-w-2xl mx-auto font-medium"
            >
              {t(
                "احجز خدمة، اختر مزوّدك، وتابع الطلب لحظة بلحظة — كل ذلك ضمن هذا القسم.",
                "Book a service, pick your provider, and track it live — all in this section.",
              )}
            </motion.p>
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }}
                className="mt-7 flex flex-wrap justify-center gap-3"
              >
                <Button asChild size="lg" className="rounded-full px-8 font-bold shadow-xl">
                  <Link to="/auth?redirect=/services">{t("تسجيل الدخول", "Sign in")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-8 font-bold backdrop-blur-md bg-background/60">
                  <Link to="/auth?tab=signup&redirect=/services"><UserPlus className="h-4 w-4 me-2" />{t("حساب جديد", "Sign up")}</Link>
                </Button>
              </motion.div>
            )}
          </div>
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
