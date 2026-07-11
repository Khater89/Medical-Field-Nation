import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppFooter from "@/components/AppFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/booking/LanguageToggle";
import {
  ShoppingBag,
  Stethoscope,
  ArrowLeft,
  Pill,
  HeartPulse,
  Truck,
  MessageCircle,
  ClipboardList,
  MapPin,
  LogIn,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import heroNursing from "@/assets/home-hero-nursing.jpg";
import heroPharmacy from "@/assets/home-hero-pharmacy.jpg";
import heroDoctor from "@/assets/home-hero-doctor.jpg";
import heroVideo from "@/assets/home-hero-video.mp4.asset.json";

export default function HomeHub() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Floating language toggle + login */}
      <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between">
        <LanguageToggle />
        <Link to="/auth">
          <Button size="sm" className="rounded-full gap-1.5 shadow-lg">
            <LogIn className="h-4 w-4" />
            {t("تسجيل الدخول", "Sign in")}
          </Button>
        </Link>
      </div>

      <main className="flex-1">
        {/* HERO with background video */}
        <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
          {/* Background video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={heroNursing}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={heroVideo.url} type="video/mp4" />
          </video>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-primary/10" />

          <div className="container max-w-5xl relative z-10 text-center px-4 py-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-4 py-1.5 mb-6 backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {t("منصة الرعاية الطبية الأولى", "The #1 Medical Care Platform")}
              </span>
            </motion.div>

            {/* Big animated brand */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="brand-text-animated font-black tracking-tight leading-[0.95] text-[13vw] md:text-[9vw] lg:text-[8rem] drop-shadow-[0_6px_30px_hsl(var(--primary)/0.35)]"
              style={{ WebkitTextStroke: "0px" }}
            >
              MEDICAL
              <br />
              FIELD NATION
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-6 text-base md:text-xl text-foreground/85 max-w-2xl mx-auto font-medium"
            >
              {t(
                "أمة الحقل الطبي — سوق طبي متكامل وخدمات رعاية منزلية بحجز وتتبّع مباشر.",
                "Medical Field Nation — a full medical marketplace and home care services with live booking and tracking.",
              )}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="mt-8 flex flex-wrap justify-center gap-3"
            >
              <Button asChild size="lg" className="rounded-full px-8 font-bold shadow-xl animate-pulse hover:animate-none">
                <Link to="/marketplace">
                  <ShoppingBag className="h-5 w-5" />
                  {t("السوق الطبي", "Marketplace")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 font-bold backdrop-blur-md bg-background/60">
                <Link to="/services">
                  <Stethoscope className="h-5 w-5" />
                  {t("الخدمات الطبية", "Medical Services")}
                </Link>
              </Button>
            </motion.div>

            {/* scroll hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
              className="mt-14 flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <PlayCircle className="h-4 w-4 text-primary" />
              {t("شاهد ما نقدّمه بالأسفل", "See what we offer below")}
            </motion.div>
          </div>
        </section>

        {/* AI-generated imagery gallery */}
        <section className="container max-w-6xl py-14 md:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-extrabold mb-2">
              {t("رعاية طبية بجودة عالمية", "World-class medical care")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              {t(
                "من الصيدلية إلى غرفة نومك — كل ما تحتاجه من الرعاية الطبية في مكان واحد.",
                "From the pharmacy to your bedside — everything you need in one place.",
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { img: heroNursing, ar: "تمريض منزلي", en: "Home nursing", desc_ar: "ممرضون معتمدون يزورون منزلك", desc_en: "Certified nurses visit your home", to: "/booking" },
              { img: heroPharmacy, ar: "صيدليات ومتاجر طبية", en: "Pharmacies & stores", desc_ar: "اطلب أدويتك ومستلزماتك بضغطة زر", desc_en: "Order meds & supplies in one tap", to: "/marketplace" },
              { img: heroDoctor, ar: "أطباء وعلاج طبيعي", en: "Doctors & physiotherapy", desc_ar: "زيارات منزلية وجلسات علاج طبيعي", desc_en: "Home visits & physio sessions", to: "/services" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Link to={item.to} className="block group">
                  <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-2xl">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={item.img}
                        alt={isAr ? item.ar : item.en}
                        loading="lazy"
                        width={1280}
                        height={800}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 inset-x-0 p-4 text-white">
                        <h3 className="text-lg font-bold">{isAr ? item.ar : item.en}</h3>
                        <p className="text-xs opacity-90">{isAr ? item.desc_ar : item.desc_en}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Two big tabs */}
        <section className="container max-w-5xl pb-14 md:pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Marketplace */}
            <Card className="p-6 md:p-8 flex flex-col group hover:shadow-xl transition-all border-2 hover:border-primary/50 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">{t("السوق الطبي", "Medical Marketplace")}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t(
                  "تصفّح الصيدليات والمتاجر الطبية، اطلب منتجات، وتحدّث مع البائع مباشرة.",
                  "Browse pharmacies and medical stores, order products, and chat directly with vendors.",
                )}
              </p>
              <ul className="space-y-2 text-sm mb-6 flex-1">
                <li className="flex items-center gap-2"><Pill className="h-4 w-4 text-emerald-600" /> {t("صيدليات وأدوية", "Pharmacies & medicine")}</li>
                <li className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-emerald-600" /> {t("أجهزة طبية", "Medical devices")}</li>
                <li className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-emerald-600" /> {t("أطراف صناعية ومستلزمات", "Prosthetics & supplies")}</li>
                <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" /> {t("دردشة مع المتجر مع إرسال صور", "Chat with store, send photos")}</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild size="lg" className="flex-1">
                  <Link to="/marketplace">
                    {t("دخول السوق الطبي", "Enter Marketplace")} <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/marketplace/login">{t("تسجيل الدخول", "Sign in")}</Link>
                </Button>
              </div>
            </Card>

            {/* Services */}
            <Card className="p-6 md:p-8 flex flex-col group hover:shadow-xl transition-all border-2 hover:border-primary/50 bg-gradient-to-br from-sky-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">{t("الخدمات الطبية", "Medical Services")}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t(
                  "احجز خدمة طبية منزلية، اختر مزوّدك، وتابع طلبك مباشرة حتى الوصول.",
                  "Book a home medical service, choose your provider, and track your request live.",
                )}
              </p>
              <ul className="space-y-2 text-sm mb-6 flex-1">
                <li className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-sky-600" /> {t("حجز خدمة (أطباء، تمريض، علاج طبيعي…)", "Book (doctors, nursing, physio…)")}</li>
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-600" /> {t("التعيين الذاتي واختيار الأقرب", "Self-assign nearest provider")}</li>
                <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-sky-600" /> {t("تتبع الطلب لحظة بلحظة", "Live order tracking")}</li>
                <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-sky-600" /> {t("دردشة مباشرة مع المزوّد", "Direct chat with provider")}</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild size="lg" className="flex-1">
                  <Link to="/services">
                    {t("دخول قسم الخدمات", "Enter Services")} <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth">{t("تسجيل الدخول", "Sign in")}</Link>
                </Button>
              </div>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link to="/landing" className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
              {t("تعرّف على المنصة", "About the platform")}
            </Link>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
