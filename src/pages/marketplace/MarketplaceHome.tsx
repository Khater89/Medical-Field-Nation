import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import ProductCard, { ProductCardData } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Pill, Stethoscope, HeartPulse, Package, Sparkles, ShoppingBag } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import { useLanguage } from "@/contexts/LanguageContext";
import marketplaceHero from "@/assets/marketplace-hero.jpg";
import heroVideo from "@/assets/home-hero-video.mp4.asset.json";

interface Category {
  id: string;
  slug: string;
  name_ar: string;
  name_en?: string | null;
  vendor_type: string;
  icon?: string | null;
  image_url?: string | null;
}

const VENDOR_TYPES = [
  { key: "pharmacy", labelKey: "mp.vendor_type.pharmacy", icon: Pill, color: "from-emerald-500/20 to-emerald-500/5" },
  { key: "medical_devices", labelKey: "mp.vendor_type.medical_devices", icon: Stethoscope, color: "from-sky-500/20 to-sky-500/5" },
  { key: "prosthetics", labelKey: "mp.vendor_type.prosthetics", icon: HeartPulse, color: "from-rose-500/20 to-rose-500/5" },
  { key: "other", labelKey: "mp.vendor_type.other", icon: Package, color: "from-amber-500/20 to-amber-500/5" },
];

export default function MarketplaceHome() {
  const { t, lang } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase
          .from("marketplace_categories")
          .select("id,slug,name_ar,name_en,vendor_type,icon,image_url")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("marketplace_products")
          .select("id,vendor_id,name_ar,name_en,price,compare_at_price,currency,cover_image_url,unit,requires_prescription,stock_quantity,unlimited_stock,is_featured,created_at")
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      setCategories((cats as Category[]) || []);
      setFeatured((prods as ProductCardData[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />

      <main className="container max-w-6xl py-6 space-y-10 flex-1">
        <BackButton to="/" label={t("nav.home")} />

        {/* Cinematic hero with video background + big animated brand */}
        <section className="relative rounded-3xl overflow-hidden border border-border min-h-[60vh] flex items-center justify-center">
          <video
            autoPlay muted loop playsInline
            poster={marketplaceHero}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={heroVideo.url} type="video/mp4" />
          </video>
          <img src={marketplaceHero} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/85" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-emerald-500/15" />

          <div className="relative z-10 text-center px-6 py-16 md:py-24 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-4 py-1.5 mb-5 backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{t("mp.home.hero_title")}</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15 }}
              className="brand-text-animated font-black tracking-tight leading-[0.95] text-[11vw] md:text-[7vw] lg:text-[6rem] drop-shadow-[0_6px_30px_hsl(var(--primary)/0.35)]"
            >
              MEDICAL<br />MARKETPLACE
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-5 text-sm md:text-lg text-foreground/85 max-w-2xl mx-auto font-medium"
            >
              {t("mp.home.hero_subtitle")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-7 flex flex-wrap justify-center gap-3"
            >
              <Button asChild size="lg" className="rounded-full px-8 font-bold shadow-xl">
                <a href="#shop"><ShoppingBag className="h-5 w-5" />{t("mp.home.shop_by_section")}</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 font-bold backdrop-blur-md bg-background/60">
                <a href="/vendor/register">{t("mp.home.vendor_cta")}</a>
              </Button>
            </motion.div>
          </div>
        </section>

        <section id="shop">
          <h2 className="text-lg font-bold mb-3">{t("mp.home.shop_by_section")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {VENDOR_TYPES.map((v) => {
              const Icon = v.icon;
              return (
                <Link key={v.key} to={`/marketplace/type/${v.key}`}>
                  <Card className={`p-4 hover:shadow-md transition-shadow bg-gradient-to-br ${v.color} border-border/60 h-full`}>
                    <Icon className="h-7 w-7 text-primary mb-2" />
                    <div className="font-semibold text-sm">{t(v.labelKey)}</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {categories.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">{t("mp.home.categories")}</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/marketplace/category/${c.slug}`}
                  className="snap-start shrink-0 px-4 py-2 rounded-full border border-border bg-card hover:border-primary/50 text-sm font-medium transition-colors"
                >
                  {lang === "en" && c.name_en ? c.name_en : c.name_ar}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold mb-3">{t("mp.home.featured")}</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {t("mp.home.no_products")}
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
