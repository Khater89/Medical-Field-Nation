import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppFooter from "@/components/AppFooter";
import LanguageToggle from "@/components/booking/LanguageToggle";
import LoginTypeDialog from "@/components/LoginTypeDialog";
import {
  ShoppingBag,
  Stethoscope,
  ArrowLeft,
  LogIn,
  Pill,
  Activity,
  HeartPulse,
  Cog,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HomeHub() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [loginOpen, setLoginOpen] = useState(false);
  const Arrow = () => (
    <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} />
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen flex flex-col bg-[hsl(28,100%,97%)] text-[hsl(17,74%,27%)]">
      <LoginTypeDialog open={loginOpen} onOpenChange={setLoginOpen} />

      <main className="flex-1 px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between bg-white/60 backdrop-blur-md border border-[hsl(28,96%,83%)] rounded-2xl p-3 md:p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(25,95%,53%)] to-[hsl(17,74%,27%)] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/30">
                M
              </div>
              <div className="hidden md:flex items-center gap-3 min-w-0">
                <span className="font-black text-lg lg:text-2xl tracking-tight truncate">
                  MEDICAL FIELD NATION
                </span>
                <span className="font-bold text-base lg:text-xl border-r-2 border-[hsl(28,96%,83%)] pr-3 truncate">
                  أمة الحقل الطبي
                </span>
              </div>
              <span className="md:hidden font-bold text-base truncate">
                {t("أمة الحقل الطبي", "MFN")}
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <LanguageToggle />
              <button
                onClick={() => setLoginOpen(true)}
                className="bg-[hsl(17,74%,27%)] text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold hover:bg-[hsl(25,95%,53%)] transition-all shadow-lg shadow-orange-900/10 flex items-center gap-2 text-sm md:text-base"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t("تسجيل الدخول", "Sign in")}</span>
              </button>
            </div>
          </motion.nav>

          {/* Brand banner */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-center py-4"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(25,95%,53%)]/10 border border-[hsl(28,96%,83%)] px-4 py-1.5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(25,95%,53%)]" />
              <span className="text-xs font-bold text-[hsl(25,95%,53%)]">
                {t("منصة الرعاية الطبية الأولى", "The #1 Medical Care Platform")}
              </span>
            </div>
            <h1 className="brand-text-animated font-black tracking-tight leading-[0.95] text-5xl md:text-7xl lg:text-8xl">
              MEDICAL FIELD NATION
            </h1>
            <p className="mt-4 text-sm md:text-base max-w-2xl mx-auto text-[hsl(17,74%,27%)]/70">
              {t(
                "سوق طبي متكامل وخدمات رعاية منزلية بحجز وتتبّع مباشر.",
                "A full medical marketplace and home care services with live booking and tracking.",
              )}
            </p>
          </motion.div>

          {/* Main Entry Points */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link
                to="/marketplace"
                className="group relative overflow-hidden bg-gradient-to-br from-[hsl(25,95%,53%)] to-[hsl(17,74%,27%)] rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-orange-500/20 transition-all hover:-translate-y-1 cursor-pointer block h-full"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-5">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black mb-3">
                    {t("السوق الطبي", "Medical Marketplace")}
                  </h2>
                  <p className="text-orange-100 max-w-xs mb-8 leading-relaxed">
                    {t(
                      "اكتشف أحدث الأجهزة والمعدات الطبية من كبار الموردين في منصة واحدة متكاملة.",
                      "Discover the latest medical devices and equipment from top suppliers in one platform.",
                    )}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-white text-[hsl(17,74%,27%)] px-6 py-3 rounded-full font-bold group-hover:bg-[hsl(28,96%,83%)] transition-colors">
                    <span>{t("تسوق الآن", "Shop now")}</span>
                    <Arrow />
                  </div>
                </div>
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute top-10 right-10 w-32 h-32 border-4 border-white/5 rounded-full animate-pulse" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                to="/landing"
                className="group relative overflow-hidden bg-white border-2 border-[hsl(28,96%,83%)] rounded-[2.5rem] p-8 md:p-10 shadow-xl transition-all hover:-translate-y-1 hover:border-[hsl(25,95%,53%)] cursor-pointer block h-full"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[hsl(28,100%,97%)] flex items-center justify-center mb-5 text-[hsl(25,95%,53%)]">
                    <Stethoscope className="h-7 w-7" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black mb-3">
                    {t("الخدمات الطبية المنزلية", "Home Medical Services")}
                  </h2>
                  <p className="opacity-70 max-w-xs mb-8 leading-relaxed">
                    {t(
                      "رعاية طبية محترفة تصلك إلى باب منزلك، من التمريض إلى العلاج الطبيعي المتقدم.",
                      "Professional medical care at your door, from nursing to advanced physiotherapy.",
                    )}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-[hsl(25,95%,53%)] text-white px-6 py-3 rounded-full font-bold group-hover:bg-[hsl(17,74%,27%)] transition-colors">
                    <span>{t("احجز خدمة", "Book a service")}</span>
                    <Arrow />
                  </div>
                </div>
                <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-[hsl(28,100%,97%)] rounded-full" />
              </Link>
            </motion.div>
          </section>

          {/* Category Bento Grid */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          >
            <Link
              to="/marketplace"
              className="col-span-2 md:col-span-2 bg-[hsl(28,96%,83%)]/30 border border-[hsl(28,96%,83%)] rounded-3xl p-6 flex flex-col justify-between hover:bg-[hsl(28,96%,83%)]/50 transition-colors cursor-pointer group min-h-[140px]"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[hsl(25,95%,53%)] mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Pill className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">{t("الصيدليات", "Pharmacies")}</h3>
            </Link>

            <Link
              to="/marketplace"
              className="col-span-1 md:row-span-2 bg-white border border-[hsl(28,96%,83%)] rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-4 hover:shadow-lg transition-all cursor-pointer group min-h-[140px]"
            >
              <div className="w-16 h-16 bg-[hsl(28,100%,97%)] rounded-full flex items-center justify-center text-[hsl(25,95%,53%)] group-hover:bg-[hsl(25,95%,53%)] group-hover:text-white transition-all">
                <Cog className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">{t("الأجهزة الطبية", "Medical Devices")}</h3>
            </Link>

            <Link
              to="/marketplace"
              className="col-span-1 bg-[hsl(17,74%,27%)] text-white rounded-3xl p-6 flex flex-col justify-end gap-2 hover:bg-[hsl(17,74%,20%)] transition-colors cursor-pointer min-h-[140px]"
            >
              <h3 className="text-lg font-bold">{t("الأطراف الصناعية", "Prosthetics")}</h3>
              <div className="w-2 h-2 bg-[hsl(25,95%,53%)] rounded-full animate-pulse" />
            </Link>

            <Link
              to="/landing"
              className="col-span-1 bg-white border border-[hsl(28,96%,83%)] rounded-3xl p-6 flex flex-col justify-between hover:bg-[hsl(28,100%,97%)] transition-colors cursor-pointer min-h-[140px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[hsl(25,95%,53%)] font-black">04</span>
                <HeartPulse className="h-5 w-5 text-[hsl(25,95%,53%)]" />
              </div>
              <h3 className="text-lg font-bold">{t("التمريض", "Nursing")}</h3>
            </Link>

            <Link
              to="/landing"
              className="col-span-2 md:col-span-2 bg-[hsl(25,95%,53%)] text-white rounded-3xl p-6 flex items-center justify-between hover:bg-[hsl(21,90%,48%)] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6" />
                <h3 className="text-xl font-bold">{t("العلاج الطبيعي", "Physiotherapy")}</h3>
              </div>
              <div className="w-10 h-10 border border-white/30 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-[hsl(25,95%,53%)] transition-all">
                <Arrow />
              </div>
            </Link>
          </motion.section>

          {/* About link */}
          <div className="text-center pt-2">
            <Link
              to="/services"
              className="text-sm text-[hsl(17,74%,27%)]/60 hover:text-[hsl(25,95%,53%)] underline underline-offset-4 font-medium"
            >
              {t("تعرّف على المنصة", "About the platform")}
            </Link>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
