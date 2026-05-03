import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import ImageGallery from "@/components/landing/ImageGallery";
import heroMedicalImg from "@/assets/hero-medical.jpg";
import MFNLogo from "@/components/MFNLogo";
import { Smartphone, ScanLine } from "lucide-react";
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
  UserPlus,
  Briefcase,
  Siren,
  Loader2,
  MessageCircle,
  Navigation,
} from "lucide-react";

const EMERGENCY_SERVICE_ID = "bb83aac4-e7da-41ee-83bd-b54da4e23569";
const COORDINATOR_PHONE = "+962781343144";
const COORDINATOR_WA = "962781343144";

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
  const { toast } = useToast();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Emergency quick-booking state
  const [emName, setEmName] = useState("");
  const [emAddress, setEmAddress] = useState("");
  const [emPhone, setEmPhone] = useState("");
  const [emLat, setEmLat] = useState<number | null>(null);
  const [emLng, setEmLng] = useState<number | null>(null);
  const [emLocating, setEmLocating] = useState(false);
  const [emSubmitting, setEmSubmitting] = useState(false);
  const [emBookingNumber, setEmBookingNumber] = useState<string | null>(null);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: t("landing.emergency.location_unsupported"), variant: "destructive" });
      return;
    }
    setEmLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEmLat(pos.coords.latitude);
        setEmLng(pos.coords.longitude);
        setEmLocating(false);
      },
      () => setEmLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emName.trim() || !emAddress.trim() || !emPhone.trim()) {
      toast({ title: t("landing.emergency.required_fields"), variant: "destructive" });
      return;
    }
    setEmSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-guest-booking", {
        body: {
          customer_name: emName.trim(),
          customer_phone: emPhone.trim(),
          city: "طوارئ",
          client_address_text: emAddress.trim(),
          client_lat: emLat,
          client_lng: emLng,
          service_id: EMERGENCY_SERVICE_ID,
          scheduled_at: new Date().toISOString(),
          hours: 1,
          time_slot: "morning",
          notes: `🚨 طلب طوارئ — العنوان: ${emAddress.trim()}${emLat && emLng ? ` — موقع: ${emLat.toFixed(5)}, ${emLng.toFixed(5)}` : ""}`,
          payment_method: "CASH",
          is_emergency: true,
        },
      });
      if (error || !data?.success) {
        toast({ title: t("landing.emergency.toast_failed"), description: data?.error || error?.message, variant: "destructive" });
      } else {
        setEmBookingNumber(data.booking_number || "—");
        toast({ title: t("landing.emergency.toast_received"), description: t("landing.emergency.toast_call_now") });
      }
    } catch (err: any) {
      toast({ title: t("landing.emergency.toast_failed"), description: err?.message, variant: "destructive" });
    }
    setEmSubmitting(false);
  };

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
              {/* pill badge - 24/7 availability (no contact icons) */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold"
              >
                <Clock className="h-4 w-4" />
                {t("landing.feature4")}
              </motion.div>

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
                {/* Static "Join as Provider" CTA */}
                <Link to="/provider/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 text-base px-8 h-14 rounded-full shadow-md hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] border-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 font-bold"
                  >
                    <Briefcase className="h-5 w-5" />
                    انضم كمزوّد خدمة
                    <ArrowIcon className="h-4 w-4" />
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
      {/* EMERGENCY QUICK BOOKING */}
      <section id="emergency" className="py-16 relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-background to-destructive/10" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="container max-w-3xl relative"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-1.5 rounded-full text-sm font-bold">
              <Siren className="h-4 w-4 animate-pulse" />
              {t("landing.emergency.badge")}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              {t("landing.emergency.title_part1")} <span className="text-destructive">{t("landing.emergency.title_part2")}</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {t("landing.emergency.desc")}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Card className="border-2 border-destructive/30 shadow-xl">
              <CardContent className="py-6">
                <AnimatePresence mode="wait">
                  {!emBookingNumber ? (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleEmergencySubmit}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-sm font-semibold mb-1 block">{t("landing.emergency.name")} *</label>
                        <Input
                          value={emName}
                          onChange={(e) => setEmName(e.target.value.slice(0, 100))}
                          placeholder={t("landing.emergency.name_ph")}
                          required
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1 block">{t("landing.emergency.address")} *</label>
                        <Input
                          value={emAddress}
                          onChange={(e) => setEmAddress(e.target.value.slice(0, 300))}
                          placeholder={t("landing.emergency.address_ph")}
                          required
                          maxLength={300}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1 block">{t("landing.emergency.phone")} *</label>
                        <Input
                          value={emPhone}
                          onChange={(e) => setEmPhone(e.target.value.slice(0, 20))}
                          placeholder={t("landing.emergency.phone_ph")}
                          required
                          dir="ltr"
                          type="tel"
                          maxLength={20}
                        />
                      </div>
                      {/* Geolocation capture */}
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={captureLocation}
                          disabled={emLocating}
                          className="w-full gap-2 h-11"
                        >
                          <Navigation className={emLocating ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
                          {emLocating
                            ? t("landing.emergency.location_locating")
                            : emLat != null && emLng != null
                            ? `${t("landing.emergency.location_detected")} (${emLat.toFixed(4)}, ${emLng.toFixed(4)})`
                            : t("landing.emergency.location")}
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        disabled={emSubmitting}
                        size="lg"
                        className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-12"
                      >
                        {emSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Siren className="h-5 w-5" />}
                        {emSubmitting ? t("landing.emergency.submitting") : t("landing.emergency.submit")}
                      </Button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-5 text-center"
                    >
                      <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-green-500/15 flex items-center justify-center">
                          <CheckCircle className="h-9 w-9 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-foreground">{t("landing.emergency.success_title")}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("landing.emergency.booking_no")} <span className="font-mono font-bold text-primary" dir="ltr">{emBookingNumber}</span>
                        </p>
                      </div>
                      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
                        <p className="text-sm font-bold text-foreground">{t("landing.emergency.contact_now")}</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <a
                            href={`tel:${COORDINATOR_PHONE}`}
                            className="flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transition-shadow"
                          >
                            <Phone className="h-5 w-5" />
                            {t("landing.emergency.call_coord")}
                          </a>
                          <a
                            href={`https://wa.me/${COORDINATOR_WA}?text=${encodeURIComponent(`Emergency #${emBookingNumber} — ${emName}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-[#25D366] text-white font-bold shadow-md hover:shadow-lg transition-shadow"
                          >
                            <MessageCircle className="h-5 w-5" />
                            {t("landing.emergency.wa_coord")}
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEmBookingNumber(null);
                          setEmName(""); setEmAddress(""); setEmPhone("");
                          setEmLat(null); setEmLng(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-primary underline"
                      >
                        {t("landing.emergency.send_another")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </section>

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

      {/* ═══════ QR CODE SECTION ═══════ */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary-glow/5" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-primary-glow/10 rounded-full blur-3xl -translate-y-1/2" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="container max-w-5xl relative"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Text side */}
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="space-y-6 text-center lg:text-start">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  امسح وابدأ
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
                احجز خدمتك الطبية{" "}
                <span className="brand-text-animated">بمسحة واحدة</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                امسح رمز QR بكاميرا هاتفك للوصول الفوري إلى منصة <strong className="text-foreground">أمة الحقل الطبي</strong> وحجز خدماتك الطبية المنزلية بكل سهولة وأمان.
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-3 text-sm text-muted-foreground">
                <ScanLine className="h-5 w-5 text-primary animate-pulse" />
                <span>افتح كاميرا الهاتف ووجّهها نحو الرمز</span>
              </div>
            </motion.div>

            {/* QR Card */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.7 }}
              whileHover={{ scale: 1.02, rotate: -1 }}
              className="flex justify-center"
            >
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-primary-glow/30 rounded-[2.5rem] blur-2xl opacity-60 group-hover:opacity-90 transition-opacity" />

                {/* Card */}
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-primary/10 backdrop-blur-sm">
                  {/* Brand header */}
                  <div className="flex items-center justify-center gap-2 mb-5 pb-5 border-b border-gray-100">
                    <MFNLogo size={32} />
                    <div className="text-start">
                      <div className="text-sm font-black text-gray-900">MFN</div>
                      <div className="text-[10px] text-gray-500 font-medium">أمة الحقل الطبي</div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="relative bg-white p-3 rounded-2xl">
                    <QRCodeSVG
                      value="https://www.getmfn.com"
                      size={220}
                      bgColor="#ffffff"
                      fgColor="#0a4d3c"
                      level="H"
                      includeMargin={false}
                    />
                    {/* Center logo overlay */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-md">
                      <MFNLogo size={32} />
                    </div>
                  </div>

                  {/* URL */}
                  <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">
                      Scan to Visit
                    </p>
                    <p className="text-sm font-bold text-gray-900" dir="ltr">
                      www.getmfn.com
                    </p>
                  </div>

                  {/* Corner accents */}
                  <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
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

      {/* Floating call/whatsapp icons hidden on landing — they appear after booking only */}

      {/* ═══════ FLOATING "EMERGENCY" CTA ═══════ */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.4, type: "spring", stiffness: 180, damping: 18 }}
        className="fixed bottom-6 end-6 z-50"
      >
        <a href="#emergency" aria-label={t("landing.emergency.fab")}>
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              boxShadow: [
                "0 8px 24px -6px hsl(var(--destructive) / 0.5)",
                "0 14px 40px -4px hsl(var(--destructive) / 0.8)",
                "0 8px 24px -6px hsl(var(--destructive) / 0.5)",
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 h-14 ps-4 pe-5 rounded-full bg-gradient-to-r from-destructive via-destructive to-destructive/85 text-destructive-foreground font-bold text-sm shadow-xl overflow-hidden"
          >
            <motion.span
              aria-hidden
              className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
              animate={{ x: ["-120%", "220%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
            />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Siren className="h-5 w-5 animate-pulse" />
            </span>
            <span className="relative whitespace-nowrap">{t("landing.emergency.fab")}</span>
          </motion.div>
        </a>
      </motion.div>


      {/* ═══════ FLOATING "JOIN AS PROVIDER" CTA ═══════ */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.6, type: "spring", stiffness: 180, damping: 18 }}
        className="fixed bottom-6 start-6 z-50"
      >
        <Link to="/provider/register" aria-label="انضم كمزوّد خدمة">
          <motion.div
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                "0 8px 24px -6px hsl(var(--primary) / 0.45)",
                "0 12px 36px -4px hsl(var(--primary) / 0.7)",
                "0 8px 24px -6px hsl(var(--primary) / 0.45)",
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 h-14 ps-4 pe-5 rounded-full bg-gradient-to-r from-primary via-primary to-primary/85 text-primary-foreground font-bold text-sm shadow-xl overflow-hidden"
          >
            {/* Shine sweep */}
            <motion.span
              aria-hidden
              className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
              animate={{ x: ["-120%", "220%"] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
            />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="relative whitespace-nowrap">انضم كمزوّد خدمة</span>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
};

export default LandingPage;
