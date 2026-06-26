import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import ProductCard, { ProductCardData } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, Stethoscope, HeartPulse, Package } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name_ar: string;
  vendor_type: string;
  icon?: string | null;
  image_url?: string | null;
}

const VENDOR_TYPES = [
  { key: "pharmacy", label: "الصيدليات", icon: Pill, color: "from-emerald-500/20 to-emerald-500/5" },
  { key: "medical_devices", label: "الأجهزة الطبية", icon: Stethoscope, color: "from-sky-500/20 to-sky-500/5" },
  { key: "prosthetics", label: "الأطراف الصناعية", icon: HeartPulse, color: "from-rose-500/20 to-rose-500/5" },
  { key: "other", label: "أخرى", icon: Package, color: "from-amber-500/20 to-amber-500/5" },
];

export default function MarketplaceHome() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase
          .from("marketplace_categories")
          .select("id,slug,name_ar,vendor_type,icon,image_url")
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
        {/* Hero */}
        <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-10 border border-border">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">سوق MFN الطبي</h1>
          <p className="text-muted-foreground max-w-2xl">
            صيدليات وأجهزة طبية وأطراف صناعية من بائعين موثوقين، توصيل أو استلام من المتجر.
          </p>
          <a href="/vendor/register" className="inline-block mt-4 text-sm font-semibold text-primary underline underline-offset-4">
            هل أنت صيدلية أو مورّد؟ سجّل متجرك الآن →
          </a>
        </section>

        {/* Vendor Types */}
        <section>
          <h2 className="text-lg font-bold mb-3">تسوق حسب القسم</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {VENDOR_TYPES.map((v) => {
              const Icon = v.icon;
              return (
                <Link key={v.key} to={`/marketplace/type/${v.key}`}>
                  <Card className={`p-4 hover:shadow-md transition-shadow bg-gradient-to-br ${v.color} border-border/60 h-full`}>
                    <Icon className="h-7 w-7 text-primary mb-2" />
                    <div className="font-semibold text-sm">{v.label}</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3">الفئات</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/marketplace/category/${c.slug}`}
                  className="snap-start shrink-0 px-4 py-2 rounded-full border border-border bg-card hover:border-primary/50 text-sm font-medium transition-colors"
                >
                  {c.name_ar}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section>
          <h2 className="text-lg font-bold mb-3">منتجات مميزة</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              لا توجد منتجات متاحة بعد. سيتم إضافة منتجات من بائعين معتمدين قريبًا.
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
