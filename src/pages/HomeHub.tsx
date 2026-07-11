import { Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Stethoscope, ArrowLeft, Pill, HeartPulse, Truck, MessageCircle, ClipboardList, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HomeHub() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container max-w-5xl py-10 md:py-16 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
              {t("أمة الحقل الطبي", "Medical Field Nation")}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              {t(
                "منصة طبية موحّدة: سوق طبي للمنتجات والمتاجر، وخدمات طبية منزلية بحجز وتتبع مباشر.",
                "One medical platform: a marketplace for products and stores, and home-based medical services with live booking and tracking.",
              )}
            </p>
          </div>
        </section>

        {/* Two big tabs */}
        <section className="container max-w-5xl py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Marketplace */}
            <Card className="p-6 md:p-8 flex flex-col group hover:shadow-lg transition-shadow border-2 hover:border-primary/40">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
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
            <Card className="p-6 md:p-8 flex flex-col group hover:shadow-lg transition-shadow border-2 hover:border-primary/40">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
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
