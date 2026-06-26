import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import ProductCard, { ProductCardData } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const LABELS: Record<string, string> = {
  pharmacy: "الصيدليات",
  medical_devices: "الأجهزة الطبية",
  prosthetics: "الأطراف الصناعية",
  other: "أخرى",
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
      <main className="container max-w-6xl py-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">{LABELS[type || ""] || "السوق"}</h1>
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
