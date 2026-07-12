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
import { Input } from "@/components/ui/input";
import {
  Pill, Stethoscope, HeartPulse, Package, Search, ShoppingBag,
  Truck, ShieldCheck, BadgePercent, Sparkles, ArrowRight,
} from "lucide-react";
import BackButton from "@/components/ui/back-button";
import { useLanguage } from "@/contexts/LanguageContext";
import marketplaceHero from "@/assets/marketplace-hero.jpg";

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
  { key: "pharmacy", labelKey: "mp.vendor_type.pharmacy", icon: Pill, tint: "bg-teal-50 text-teal-700 ring-teal-100" },
  { key: "medical_devices", labelKey: "mp.vendor_type.medical_devices", icon: Stethoscope, tint: "bg-sky-50 text-sky-700 ring-sky-100" },
  { key: "prosthetics", labelKey: "mp.vendor_type.prosthetics", icon: HeartPulse, tint: "bg-cyan-50 text-cyan-700 ring-cyan-100" },
  { key: "other", labelKey: "mp.vendor_type.other", icon: Package, tint: "bg-slate-50 text-slate-700 ring-slate-100" },
];

const TRUST = [
  { icon: Truck, ar: "توصيل سريع", en: "Fast delivery" },
  { icon: ShieldCheck, ar: "منتجات موثوقة", en: "Verified products" },
  { icon: BadgePercent, ar: "أسعار تنافسية", en: "Competitive prices" },
];

export default function MarketplaceHome() {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filtered = featured.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.name_ar || "").toLowerCase().includes(q) || (p.name_en || "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader hideNav />
      <MarketplaceSubNav />

      <main className="flex-1">
        {/* Hero: crisp e-commerce, split layout, prominent search */}
        <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-white via-sky-50/40 to-white">
          <div className="container max-w-6xl py-4">
            <BackButton to="/" label={t("nav.home")} />
          </div>
          <div className="container max-w-6xl grid md:grid-cols-2 gap-10 items-center pb-14 pt-2">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 ring-1 ring-teal-100 px-3 py-1 mb-5">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-[11px] font-semibold text-teal-700 tracking-wide uppercase">
                  {t("mp.home.hero_title")}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.05]">
                {isAr ? "السوق " : "Medical "}
                <span className="bg-gradient-to-r from-teal-500 to-sky-600 bg-clip-text text-transparent">
                  {isAr ? "الطبي" : "Marketplace"}
                </span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-slate-600 max-w-lg leading-relaxed">
                {t("mp.home.hero_subtitle")}
              </p>

              {/* Search bar */}
              <div className="mt-7 flex items-center gap-2 bg-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(2,132,199,0.25)] ring-1 ring-slate-200 p-2 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isAr ? "ابحث عن أدوية، أجهزة، مستلزمات..." : "Search medicines, devices, supplies..."}
                    className="ps-9 border-0 focus-visible:ring-0 shadow-none bg-transparent h-11"
                  />
                </div>
                <Button className="h-11 px-5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 hover:opacity-90 text-white font-semibold shadow-md">
                  <ShoppingBag className="h-4 w-4 me-1.5" />
                  {isAr ? "تسوّق" : "Shop"}
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-600">
                {TRUST.map((tr) => {
                  const Icon = tr.icon;
                  return (
                    <div key={tr.en} className="inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-teal-600" />
                      <span className="font-medium">{isAr ? tr.ar : tr.en}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-gradient-to-tr from-teal-200/40 via-sky-200/30 to-transparent rounded-[2rem] blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden ring-1 ring-slate-200 shadow-[0_30px_60px_-20px_rgba(2,132,199,0.35)] aspect-[4/3] bg-white">
                <img
                  src={marketplaceHero}
                  alt={isAr ? "منتجات طبية" : "Medical products"}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 start-6 bg-white/90 backdrop-blur-md rounded-2xl ring-1 ring-slate-200 shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <BadgePercent className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">{isAr ? "خصومات حتى" : "Save up to"}</div>
                  <div className="text-sm font-bold text-slate-900">30%</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container max-w-6xl py-12 space-y-14">
          {/* Vendor types — sleek cards */}
          <section id="shop">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-2xl font-bold text-slate-900">{t("mp.home.shop_by_section")}</h2>
              <span className="text-xs text-slate-500 hidden md:block">
                {isAr ? "اختر القسم للتصفح" : "Pick a section to browse"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {VENDOR_TYPES.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div
                    key={v.key}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/marketplace/type/${v.key}`}>
                      <Card className="group relative p-5 h-full bg-white border-slate-200 hover:border-teal-300 hover:shadow-[0_20px_40px_-20px_rgba(13,148,136,0.35)] transition-all rounded-2xl overflow-hidden">
                        <div className={`h-11 w-11 rounded-xl ring-1 flex items-center justify-center mb-3 ${v.tint}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="font-semibold text-sm text-slate-900">{t(v.labelKey)}</div>
                        <ArrowRight className={`h-4 w-4 mt-3 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all ${isAr ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {categories.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{t("mp.home.categories")}</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/marketplace/category/${c.slug}`}
                    className="snap-start shrink-0 px-4 py-2 rounded-full ring-1 ring-slate-200 bg-white hover:ring-teal-400 hover:bg-teal-50 hover:text-teal-700 text-sm font-medium text-slate-700 transition-all"
                  >
                    {lang === "en" && c.name_en ? c.name_en : c.name_ar}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-end justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t("mp.home.featured")}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr ? "منتجات مختارة بعناية" : "Handpicked products for you"}
                </p>
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-10 text-center text-slate-500 rounded-2xl border-dashed">
                {t("mp.home.no_products")}
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
