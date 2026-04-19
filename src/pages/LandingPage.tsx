import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ImageGallery from "@/components/landing/ImageGallery";
import heroMedicalImg from "@/assets/hero-medical.jpg";
import {
  ShieldCheck,
  Zap,
  DollarSign,
  Clock,
  Stethoscope,
  HeartPulse,
  Syringe,
  Activity,
  Bone,
  Ambulance,
  ArrowLeft,
  ArrowRight,
  Phone,
  CheckCircle,
  ClipboardList,
  CalendarDays,
  Home,
} from "lucide-react";

/* ── animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const LandingPage = () => {
  const { t, isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  /* ── data ── */
  const features = [
    { icon: ShieldCheck, titleKey: "landing.feature1", descKey: "landing.feature1.desc" },
    { icon: Zap, titleKey: "landing.feature2", descKey: "landing.feature2.desc" },
    { icon: DollarSign, titleKey: "landing.feature3", descKey: "landing.feature3.desc" },
    { icon: Clock, titleKey: "landing.feature4", descKey: "landing.feature4.desc" },
  ];

  const highlightedServices = [
    { icon: Stethoscope, key: "service.general_medicine" },
    { icon: HeartPulse, key: "service.home_nursing" },
    { icon: Syringe, key: "service.injections" },
    { icon: Activity, key: "service.vital_signs" },
    { icon: Bone, key: "service.fracture_treatment" },
    { icon: Ambulance, key: "service.patient_transport" },
  ];

  const steps = [
    { icon: ClipboardList, titleKey: "landing.step1.title", descKey: "landing.step1.desc", num: "01" },
    { icon: CalendarDays, titleKey: "landing.step2.title", descKey: "landing.step2.desc", num: "02" },
    { icon: Home, titleKey: "landing.step3.title", descKey: "landing.step3.desc", num: "03" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AppHeader />

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden">
        {/* gradient orbs */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-32 start-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          className="absolute -bottom-20 end-1/4 w-[400px] h-[400px] bg-primary-glow/10 rounded-full blur-[100px] pointer-events-none"
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="container max-w-7xl relative py-16 sm:py-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Text content */}
            <div className="text-center lg:text-start space-y-6 order-2 lg:order-1">
              {/* pill badge - clickable phone */}
              <motion.a
                href="tel:+962790619770"
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Phone className="h-4 w-4 animate-pulse" />
                {t("landing.feature4")}
              </motion.a>

              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.15] brand-text-animated"
              >
                {t("app.brand_name")}
              </motion.h1>

              <motion.h2
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-black leading-[1.15]"
              >
                <span className="text-foreground">{t("landing.hero").split(" ").slice(0, 2).join(" ")} </span>
                <span className="brand-text-animated">{t("landing.hero").split(" ").slice(2).join(" ")}</span>
              </motion.h2>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0"
              >
                {t("landing.hero.sub")}
              </motion.p>

              {/* CTA */}
              <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="flex flex-wrap justify-center lg:justify-start gap-3">
                <Link to="/booking">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      className="gap-2 text-base px-10 h-14 rounded-full shadow-lg hover:shadow-2xl transition-all bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg"
                    >
                      <CalendarDays className="h-5 w-5" />
                      {t("landing.cta")}
                      <ArrowIcon className="h-4 w-4 animate-bounce" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/track">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-base px-8 h-14 rounded-full shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ClipboardList className="h-4 w-4" />
                    تتبع طلبك
                  </Button>
                </Link>
              </motion.div>

              {/* stats */}
              <motion.div
                variants={staggerFast}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap justify-center lg:justify-start gap-10 pt-4"
              >
                {[
                  { value: "22+", label: t("landing.stats.services") },
                  { value: "24/7", label: t("landing.stats.available") },
                  { value: "5+", label: t("landing.stats.cities") },
                ].map((stat, i) => (
                  <motion.div key={i} variants={scaleIn} transition={{ duration: 0.5 }} className="text-center">
                    <p className="text-3xl sm:text-4xl font-black text-primary">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="order-1 lg:order-2 flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-3xl blur-2xl scale-105" />
                <img
                  src={heroMedicalImg}
                  alt="خدمات طبية منزلية - ممرضة تزور مريضاً في المنزل"
                  width={500}
                  height={500}
                  className="relative rounded-3xl shadow-2xl object-cover w-full max-w-[500px] border-2 border-primary/10"
                />
                {/* floating badge */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-4 -start-4 bg-card rounded-2xl shadow-lg p-3 border border-border flex items-center gap-2"
                >
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">أطباء معتمدون</p>
                    <p className="text-[10px] text-muted-foreground">مرخّصون رسمياً</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ═══════ PROMO VIDEO ═══════ */}
      <section className="py-16 bg-card/40">
        <div className="container max-w-5xl space-y-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">{isRTL ? "تعرّف علينا" : "About Us"}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{isRTL ? "شاهد كيف نقدّم خدماتنا الطبية المنزلية" : "See how we deliver home medical services"}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="rounded-2xl overflow-hidden shadow-2xl border border-border"
          >
            <video
              className="w-full aspect-video"
              autoPlay
              muted
              loop
              playsInline
              poster={heroMedicalImg}
            >
              <source src="/mfn-promo.mp4" type="video/mp4" />
            </video>
          </motion.div>
        </div>
      </section>

      {/* ═══════ WHY US ═══════ */}
      <section className="py-20 bg-card/40">
        <div className="container max-w-6xl space-y-14">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">{t("landing.whyus")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("landing.whyus.sub")}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-all hover:shadow-lg"
              >
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                  className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors"
                >
                  <f.icon className="h-6 w-6 text-primary" />
                </motion.div>
                <h3 className="font-bold text-foreground mb-2">{t(f.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ SERVICES ═══════ */}
      <section id="services" className="py-20 scroll-mt-20">
        <div className="container max-w-6xl space-y-14">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">{t("landing.services_title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("landing.services_sub")}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerFast}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {highlightedServices.map((s, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                transition={{ duration: 0.4 }}
                whileHover={{ y: -5, scale: 1.04, transition: { duration: 0.2 } }}
              >
                <Link
                  to="/booking"
                  className="group flex flex-col items-center text-center gap-3 bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all h-full"
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <s.icon className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-snug">{t(s.key)}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Link to="/booking">
              <Button variant="outline" size="lg" className="gap-2 rounded-full px-8">
                {t("landing.cta")}
                <ArrowIcon className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════ IMAGE GALLERY ═══════ */}
      <ImageGallery />

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="py-20 bg-card/40">
        <div className="container max-w-4xl space-y-14">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">{t("landing.howItWorks")}</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative"
          >
            {/* connecting line (desktop only) */}
            <div className="hidden sm:block absolute top-16 inset-x-0 mx-auto h-0.5 bg-border" style={{ width: "60%", left: "20%" }} />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="relative flex flex-col items-center text-center gap-4"
              >
                <div className="relative z-10 h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-md">
                  {step.num}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-foreground">{t(step.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{t(step.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ PRICING NOTE ═══════ */}
      <section id="pricing" className="py-20 scroll-mt-20">
        <div className="container max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center space-y-4 bg-card border border-border rounded-2xl p-10"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">{t("landing.pricing_title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("landing.pricing_subtitle")}</p>
            <Link to="/booking">
              <Button size="lg" className="gap-2 rounded-full px-8 mt-4">
                {t("landing.cta")}
                <ArrowIcon className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary-glow/8" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="container max-w-3xl relative text-center space-y-6"
        >
          <motion.h2 variants={fadeUp} transition={{ duration: 0.6 }} className="text-2xl sm:text-4xl font-black text-foreground">
            {t("landing.hero")}
          </motion.h2>
          <motion.p variants={fadeUp} transition={{ duration: 0.6 }} className="text-lg text-muted-foreground">
            {t("landing.hero.sub")}
          </motion.p>
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Link to="/booking">
              <Button
                size="lg"
                className="gap-2 text-base px-10 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {t("landing.cta")}
                <ArrowIcon className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <AppFooter />

      {/* ═══════ FLOATING CONTACT BUTTONS ═══════ */}
      <div className="fixed bottom-6 end-6 z-50 flex flex-col gap-3 items-center">
        {/* Call button - main coordinator */}
        <motion.a
          href="tel:+962790619770"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          aria-label="اتصل بنا"
        >
          <Phone className="h-6 w-6 text-primary-foreground" />
        </motion.a>
        {/* WhatsApp button - coordinator 1 (عبد الرحمن) */}
        <motion.a
          href="https://wa.me/962790619770"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="h-14 w-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          aria-label="واتساب المنسق عبد الرحمن"
        >
          <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white">
            <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.924 15.924 0 0016.004 32C24.826 32 32 24.826 32 16.004 32 7.176 24.826 0 16.004 0zm9.338 22.618c-.394 1.11-1.946 2.032-3.192 2.3-.854.182-1.968.326-5.72-1.23-4.802-1.99-7.892-6.862-8.132-7.18-.23-.318-1.936-2.578-1.936-4.916s1.226-3.49 1.662-3.968c.436-.478.952-.598 1.27-.598.316 0 .632.002.908.016.292.014.684-.11 1.07.816.394.952 1.338 3.27 1.456 3.508.118.238.198.516.04.834-.158.318-.238.516-.476.794-.238.278-.5.62-.714.832-.238.238-.486.496-.208.972.278.476 1.236 2.038 2.654 3.302 1.822 1.624 3.358 2.126 3.834 2.364.476.238.754.198 1.032-.118.278-.318 1.19-1.388 1.508-1.866.318-.476.634-.396 1.07-.238.436.158 2.754 1.298 3.23 1.536.476.238.794.356.912.554.118.198.118 1.15-.276 2.26z" />
          </svg>
        </motion.a>
      </div>
    </div>
  );
};

export default LandingPage;
