import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppFooter from "@/components/AppFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/booking/LanguageToggle";
import LoginTypeDialog from "@/components/LoginTypeDialog";
import {
  ShoppingBag,
  Stethoscope,
  ArrowLeft,
  LogIn,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import heroNursing from "@/assets/home-hero-nursing.jpg";
import heroVideo from "@/assets/home-hero-video.mp4.asset.json";

export default function HomeHub() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LoginTypeDialog open={loginOpen} onOpenChange={setLoginOpen} />

      {/* Floating language toggle + login */}
      <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between">
        <LanguageToggle />
        <Button
          size="sm"
          className="rounded-full gap-1.5 shadow-lg"
          onClick={() => setLoginOpen(true)}
        >
          <LogIn className="h-4 w-4" />
          {t("تسجيل الدخول", "Sign in")}
        </Button>
      </div>

      <main className="flex-1">
        {/* HERO with background video */}
        <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
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

            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="brand-text-animated font-black tracking-tight leading-[0.95] text-[13vw] md:text-[9vw] lg:text-[8rem] drop-shadow-[0_6px_30px_hsl(var(--primary)/0.35)]"
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
                <Link to="/landing">
                  <Stethoscope className="h-5 w-5" />
                  {t("الخدمات الطبية المنزلية", "Home Medical Services")}
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
              className="mt-14 flex items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <PlayCircle className="h-4 w-4 text-primary" />
              {t("اختر القسم الذي يناسبك بالأسفل", "Pick the section you need below")}
            </motion.div>
          </div>
        </section>

        {/* Two clean sections */}
        <section className="container max-w-5xl py-14 md:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-extrabold mb-2">
              {t("قسمان يخدمانك", "Two sections at your service")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              {t(
                "اختر السوق الطبي للتسوق، أو الخدمات الطبية المنزلية للحجز والرعاية.",
                "Choose the Marketplace to shop, or Home Medical Services to book and receive care.",
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Marketplace */}
            <Card className="p-6 md:p-8 flex flex-col items-center text-center group hover:shadow-xl transition-all border-2 hover:border-primary/50 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-6">
                {t("السوق الطبي", "Medical Marketplace")}
              </h2>
              <Button asChild size="lg" className="w-full">
                <Link to="/marketplace">
                  {t("دخول السوق الطبي", "Enter Marketplace")}{" "}
                  <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} />
                </Link>
              </Button>
            </Card>

            {/* Services */}
            <Card className="p-6 md:p-8 flex flex-col items-center text-center group hover:shadow-xl transition-all border-2 hover:border-primary/50 bg-gradient-to-br from-sky-500/5 to-transparent">
              <div className="h-16 w-16 rounded-2xl bg-sky-500/15 text-sky-600 flex items-center justify-center mb-4">
                <Stethoscope className="h-8 w-8" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-6">
                {t("الخدمات الطبية المنزلية", "Home Medical Services")}
              </h2>
              <Button asChild size="lg" className="w-full">
                <Link to="/landing">
                  {t("دخول الخدمات", "Enter Services")}{" "}
                  <ArrowLeft className={`h-4 w-4 ${isAr ? "" : "rotate-180"}`} />
                </Link>
              </Button>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/services"
              className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              {t("تعرّف على المنصة", "About the platform")}
            </Link>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
