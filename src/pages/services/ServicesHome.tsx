import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/ui/back-button";
import {
  Stethoscope, HeartPulse, Activity, ClipboardList, MapPin, Truck,
  UserPlus, Sparkles, Star, ShieldCheck, Clock, Heart, CalendarDays, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import servicesHero from "@/assets/services-hero.jpg";

const CATEGORIES = [
  { key: "doctors", ar: "خدمات الأطباء", en: "Doctors", icon: Stethoscope, tint: "from-sky-100 to-sky-50 text-sky-700" },
  { key: "nursing", ar: "خدمات التمريض", en: "Nursing", icon: HeartPulse, tint: "from-rose-100 to-rose-50 text-rose-700" },
  { key: "physio", ar: "العلاج الطبيعي المنزلي", en: "Home Physiotherapy", icon: Activity, tint: "from-emerald-100 to-emerald-50 text-emerald-700" },
];

const STEPS = [
  { n: 1, ar: "اختر الخدمة", en: "Choose service", desc_ar: "حدد التخصص المناسب", desc_en: "Pick the right specialty" },
  { n: 2, ar: "احجز الموعد", en: "Book time", desc_ar: "اختر الوقت الأنسب لك", desc_en: "Select a convenient time" },
  { n: 3, ar: "استقبل مزوّدك", en: "Receive care", desc_ar: "زيارة في راحة منزلك", desc_en: "Visit in the comfort of home" },
];

const TESTIMONIALS = [
  { ar: "خدمة راقية ومتعاملين محترفين. جاء الممرض في الموعد تماماً.", en: "Premium service and professional staff. Nurse arrived on time.", name_ar: "أم محمد", name_en: "Um Mohammad", rating: 5 },
  { ar: "طبيبة لطيفة جداً واعتنت بوالدتي بشكل ممتاز.", en: "A very kind doctor who took excellent care of my mother.", name_ar: "سارة أحمد", name_en: "Sarah Ahmad", rating: 5 },
  { ar: "سهولة الحجز والمتابعة اللحظية أعطتني راحة كبيرة.", en: "Easy booking and live tracking gave me great peace of mind.", name_ar: "خالد يوسف", name_en: "Khaled Yousef", rating: 5 },
];

const BADGES = [
  { icon: ShieldCheck, ar: "مزوّدون موثقون", en: "Verified providers" },
  { icon: Clock, ar: "متاح 24/7", en: "Available 24/7" },
  { icon: Heart, ar: "رعاية بلمسة إنسانية", en: "Human-centered care" },
];

export default function ServicesHome() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(150,25%,98%)]">
      <AppHeader hideNav />
      <main className="flex-1">
        <div className="container max-w-6xl pt-4">
          <BackButton to="/" label={t("رجوع", "Back")} />
        </div>

        {/* Warm human-centric hero */}
        <section className="container max-w-6xl grid md:grid-cols-2 gap-10 items-center py-10 md:py-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/60 ring-1 ring-emerald-200 px-3 py-1 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              <span className="text-[11px] font-semibold text-emerald-800 tracking-wide">
                {t("رعاية طبية منزلية موثوقة", "Trusted home medical care")}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-800 leading-[1.05]">
              {t("الخدمات الطبية ", "Home Medical ")}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {t("المنزلية", "Services")}
              </span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-slate-600 max-w-lg leading-relaxed">
              {t(
                "احجز طبيباً أو ممرضاً أو أخصائي علاج طبيعي بخطوات بسيطة، واستقبله في منزلك بكل راحة وثقة.",
                "Book a doctor, nurse, or physiotherapist in a few gentle steps — and receive care at home with confidence.",
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-8 font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white shadow-[0_15px_35px_-10px_rgba(16,185,129,0.5)]">
                <Link to="/booking"><CalendarDays className="h-5 w-5 me-2" />{t("احجز الآن", "Book now")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 font-bold border-emerald-200 bg-white/70 backdrop-blur-md hover:bg-emerald-50">
                <Link to="/track">{t("تتبّع طلبك", "Track order")}</Link>
              </Button>
              {!user && (
                <Button asChild size="lg" variant="ghost" className="rounded-full px-6 font-semibold text-slate-700">
                  <Link to="/auth?tab=signup&redirect=/services"><UserPlus className="h-4 w-4 me-1.5" />{t("حساب جديد", "Sign up")}</Link>
                </Button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-5 text-xs text-slate-600">
              {BADGES.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.en} className="inline-flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{isAr ? b.ar : b.en}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
            className="relative order-1 md:order-2"
          >
            <div className="absolute -inset-8 bg-gradient-to-tr from-emerald-200/50 via-teal-100/40 to-sky-100/40 rounded-[3rem] blur-3xl" />
            <div className="relative rounded-[2.5rem] overflow-hidden ring-1 ring-emerald-100 shadow-[0_30px_60px_-20px_rgba(16,185,129,0.35)] aspect-[4/3]">
              <img src={servicesHero} alt={t("رعاية منزلية", "Home care")} className="w-full h-full object-cover" />
            </div>
            {/* Floating rating card */}
            <div className="absolute -bottom-5 end-6 bg-white/95 backdrop-blur-md rounded-2xl ring-1 ring-emerald-100 shadow-xl px-4 py-3">
              <div className="flex items-center gap-1 text-amber-500 mb-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {t("4.9 من 2,300+ عميل", "4.9 from 2,300+ clients")}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Steps — friendly booking flow */}
        <section className="container max-w-6xl py-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t("كيف يعمل الحجز؟", "How booking works")}</h2>
            <p className="text-sm text-slate-500 mt-2">{t("ثلاث خطوات بسيطة إلى راحتك", "Three simple steps to your comfort")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="relative p-6 rounded-3xl bg-white border-emerald-100/60 shadow-[0_10px_30px_-15px_rgba(16,185,129,0.25)] h-full">
                  <div className="absolute -top-4 start-6 h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center shadow-lg">
                    {s.n}
                  </div>
                  <h3 className="mt-3 font-bold text-slate-800 text-lg">{isAr ? s.ar : s.en}</h3>
                  <p className="text-sm text-slate-500 mt-2">{isAr ? s.desc_ar : s.desc_en}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Primary actions — soft rounded */}
        <section className="container max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
          {[
            { icon: ClipboardList, ar: "حجز خدمة", en: "Book a service", desc_ar: "اختر التخصص والوقت.", desc_en: "Pick a specialty and time.", to: "/booking", cta_ar: "ابدأ الحجز", cta_en: "Start", tint: "bg-emerald-500/10 text-emerald-700" },
            { icon: Truck, ar: "تتبّع طلبك", en: "Track your order", desc_ar: "متابعة لحظية للطلب.", desc_en: "Follow your order live.", to: "/track", cta_ar: "افتح التتبع", cta_en: "Open tracking", tint: "bg-teal-500/10 text-teal-700" },
            { icon: MapPin, ar: "التعيين الذاتي", en: "Self-assign", desc_ar: "اختر أقرب مزوّد متاح.", desc_en: "Pick the nearest provider.", to: "/booking?mode=self", cta_ar: "ابدأ الآن", cta_en: "Start", tint: "bg-sky-500/10 text-sky-700" },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Card key={a.en} className="p-6 rounded-3xl bg-white border-emerald-100/60 hover:shadow-[0_20px_40px_-20px_rgba(16,185,129,0.35)] transition-all">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${a.tint}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="font-bold text-slate-800 mb-1">{t(a.ar, a.en)}</h2>
                <p className="text-xs text-slate-500 mb-4">{t(a.desc_ar, a.desc_en)}</p>
                <Button asChild variant="ghost" className="w-full justify-between rounded-2xl bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 font-semibold">
                  <Link to={a.to}>
                    {t(a.cta_ar, a.cta_en)}
                    <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </section>

        {/* Categories — friendly rounded */}
        <section className="container max-w-6xl py-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-5">{t("فئات الخدمات", "Service categories")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <Link key={c.key} to={`/booking?category=${c.key}`}>
                  <Card className={`p-6 rounded-3xl bg-gradient-to-br ${c.tint} border-white/60 hover:shadow-lg transition-all h-full`}>
                    <div className="h-12 w-12 rounded-2xl bg-white/70 flex items-center justify-center mb-3 shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="font-bold text-base">{isAr ? c.ar : c.en}</div>
                    <div className="text-xs mt-1 opacity-70">{t("زيارات منزلية", "Home visits")}</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Testimonials */}
        <section className="container max-w-6xl py-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t("ماذا يقول عملاؤنا", "What our clients say")}</h2>
            <p className="text-sm text-slate-500 mt-2">{t("قصص حقيقية عن رعاية موثوقة", "Real stories of trusted care")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((tst, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6 rounded-3xl bg-white/80 backdrop-blur border-emerald-100/60 h-full">
                  <div className="flex items-center gap-1 text-amber-500 mb-3">
                    {Array.from({ length: tst.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">"{isAr ? tst.ar : tst.en}"</p>
                  <div className="mt-4 pt-4 border-t border-emerald-100/70 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold flex items-center justify-center text-sm">
                      {(isAr ? tst.name_ar : tst.name_en).charAt(0)}
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {isAr ? tst.name_ar : tst.name_en}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
