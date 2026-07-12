import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/ui/back-button";
import {
  Stethoscope,
  HeartPulse,
  Activity,
  ClipboardList,
  MapPin,
  Truck,
  ShoppingBag,
  Pill,
  Wind,
  Smile,
  Eye,
  Package,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/* ============ SERVICES: standalone links ============ */
const SERVICE_LINKS = [
  { ar: "الخدمات الطبية المنزلية", en: "Home Medical Services", to: "/services", icon: Stethoscope },
  { ar: "الخدمات التمريضية", en: "Nursing services", to: "/booking?category=nursing", icon: HeartPulse },
  { ar: "العلاج الطبيعي المنزلي", en: "Home physiotherapy", to: "/booking?category=physio", icon: Activity },
  { ar: "الحجز", en: "Book a service", to: "/booking", icon: ClipboardList },
  { ar: "تتبع الطلب", en: "Track order", to: "/track", icon: Truck },
  { ar: "التعيين الذاتي", en: "Self-assign", to: "/booking?mode=self", icon: MapPin },
];

/* ============ MARKETPLACE: standalone links ============ */
const MARKET_LINKS = [
  { ar: "الصيدليات", en: "Pharmacies", to: "/marketplace/type/pharmacy", icon: Pill },
  { ar: "الأجهزة الطبية", en: "Medical devices", to: "/marketplace/type/medical_devices", icon: Activity },
  { ar: "الأطراف الصناعية", en: "Prosthetics", to: "/marketplace/type/prosthetics", icon: HeartPulse },
  { ar: "أجهزة التنفس", en: "Respiratory devices", to: "/marketplace/type/medical_devices", icon: Wind },
  { ar: "أجهزة الأسنان", en: "Dental devices", to: "/marketplace/type/medical_devices", icon: Smile },
  { ar: "أجهزة العيون", en: "Eye devices", to: "/marketplace/type/medical_devices", icon: Eye },
  { ar: "مستلزمات العلاج الطبيعي", en: "Physio supplies", to: "/marketplace/type/other", icon: Package },
];

export default function LandingPage() {
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";
  const tr = (ar: string, en: string) => (isAr ? ar : en);
  const Arrow = isRTL ? ArrowRight : ArrowRight;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader hideNav />

      <main className="flex-1">
        <div className="container max-w-6xl pt-4">
          <BackButton to="/" label={tr("الرئيسية", "Home")} />
        </div>

        {/* HERO */}
        <section className="container max-w-5xl text-center py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {tr("تعرّف على المنصة", "About the platform")}
            </span>
          </motion.div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            {tr("منصّة طبية شاملة في مكان واحد", "A complete medical platform in one place")}
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            {tr(
              "منصة أمة الحقل الطبي تجمع لك قسمين أساسيين: الخدمات الطبية المنزلية والسوق الطبي. اختر القسم الذي تحتاجه واستكشف أقسامه بسهولة.",
              "Medical Field Nation brings together two core sections: Home Medical Services and the Medical Marketplace. Choose what you need and explore.",
            )}
          </p>
        </section>

        {/* Two sections gateway */}
        <section className="container max-w-6xl grid md:grid-cols-2 gap-6 pb-8">
          {/* Services */}
          <Card className="p-6 md:p-8 border-2 hover:border-sky-300 hover:shadow-xl transition-all bg-gradient-to-br from-sky-500/5 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/15 text-sky-600 flex items-center justify-center">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">
                {tr("الخدمات", "Services")}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {tr(
                "احجز خدمة طبية منزلية، اختر مزوّدك، وتتبّع طلبك مباشرة.",
                "Book a home medical service, pick your provider, and track live.",
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {SERVICE_LINKS.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.en}
                    to={s.to}
                    className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-white/50 hover:bg-sky-50 hover:border-sky-300 px-3 py-2.5 text-sm font-medium transition-all"
                  >
                    <Icon className="h-4 w-4 text-sky-600 shrink-0" />
                    <span className="flex-1 truncate">{isAr ? s.ar : s.en}</span>
                    <Arrow className={`h-3.5 w-3.5 text-muted-foreground group-hover:text-sky-600 transition ${isRTL ? "rotate-180" : ""}`} />
                  </Link>
                );
              })}
            </div>
            <Button asChild size="lg" className="w-full">
              <Link to="/services">{tr("دخول قسم الخدمات", "Enter Services")}</Link>
            </Button>
          </Card>

          {/* Marketplace */}
          <Card className="p-6 md:p-8 border-2 hover:border-emerald-300 hover:shadow-xl transition-all bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">
                {tr("السوق الطبي", "Medical Marketplace")}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {tr(
                "تصفّح الصيدليات، الأجهزة الطبية، الأطراف الصناعية والمزيد.",
                "Browse pharmacies, medical devices, prosthetics and more.",
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {MARKET_LINKS.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.en}
                    to={s.to}
                    className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-white/50 hover:bg-emerald-50 hover:border-emerald-300 px-3 py-2.5 text-sm font-medium transition-all"
                  >
                    <Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="flex-1 truncate">{isAr ? s.ar : s.en}</span>
                    <Arrow className={`h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 transition ${isRTL ? "rotate-180" : ""}`} />
                  </Link>
                );
              })}
            </div>
            <Button asChild size="lg" className="w-full">
              <Link to="/marketplace">{tr("دخول السوق الطبي", "Enter Marketplace")}</Link>
            </Button>
          </Card>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
