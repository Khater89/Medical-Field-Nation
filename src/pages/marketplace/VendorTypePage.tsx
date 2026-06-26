import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import ProductCard, { ProductCardData } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";

const LABELS: Record<string, string> = {
  pharmacy: "الصيدليات",
  medical_devices: "الأجهزة الطبية",
  prosthetics: "الأطراف الصناعية",
  other: "أخرى",
};

const CTA_LABELS: Record<string, { title: string; sub: string }> = {
  pharmacy: {
    title: "أضف صيدليتك",
    sub: "أنشئ صيدليتك الإلكترونية وأدر منتجاتك وعروضك بنفسك",
  },
  medical_devices: {
    title: "أضف متجرك للأجهزة الطبية",
    sub: "اعرض أجهزتك الطبية ومواصفاتها وأسعارها لآلاف العملاء",
  },
  prosthetics: {
    title: "أضف مركز الأطراف الصناعية",
    sub: "اعرض خدماتك ومنتجاتك من الأطراف الصناعية وأجهزة التأهيل",
  },
  other: {
    title: "أضف متجرك إلى السوق الطبي",
    sub: "انضم إلى السوق الطبي وابدأ بعرض منتجاتك",
  },
};

export default function VendorTypePage() {
  const { type } = useParams<{ type: string }>();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: vendors } = await supabase
        .from("marketplace_vendors")
        .select("id")
        .eq("status", "approved")
        .eq("vendor_type", type as any);
      const vendorIds = (vendors || []).map((v: any) => v.id);
      if (vendorIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("marketplace_products")
        .select("id,vendor_id,name_ar,name_en,price,compare_at_price,currency,cover_image_url,unit,requires_prescription,stock_quantity,unlimited_stock")
        .eq("is_active", true)
        .in("vendor_id", vendorIds)
        .order("created_at", { ascending: false });
      setProducts((data as ProductCardData[]) || []);
      setLoading(false);
    })();
  }, [type]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />
      <main className="container max-w-6xl py-6 flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{LABELS[type || ""] || "السوق"}</h1>
          {type && CTA_LABELS[type] && (
            <Button asChild size="lg" className="gap-2">
              <Link to={`/vendor/register?type=${type}`}>
                <Plus className="h-4 w-4" />
                {CTA_LABELS[type].title}
              </Link>
            </Button>
          )}
        </div>

        {type && CTA_LABELS[type] && (
          <Card className="p-4 md:p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{CTA_LABELS[type].title}</div>
              <div className="text-sm text-muted-foreground">{CTA_LABELS[type].sub}</div>
            </div>
            <Button asChild variant="outline">
              <Link to={`/vendor/register?type=${type}`}>ابدأ التسجيل</Link>
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">لا توجد منتجات متاحة في هذا القسم بعد.</Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
