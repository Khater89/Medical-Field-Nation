import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import ProductCard, { ProductCardData } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import BackButton from "@/components/ui/back-button";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [title, setTitle] = useState("الفئة");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("marketplace_categories")
        .select("id,name_ar")
        .eq("slug", slug!)
        .maybeSingle();
      if (cat) setTitle(cat.name_ar);
      if (cat?.id) {
        const { data } = await supabase
          .from("marketplace_products")
          .select("id,vendor_id,name_ar,name_en,price,compare_at_price,currency,cover_image_url,unit,requires_prescription,stock_quantity,unlimited_stock")
          .eq("is_active", true)
          .eq("category_id", cat.id)
          .order("created_at", { ascending: false });
        setProducts((data as ProductCardData[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />
      <main className="container max-w-6xl py-6 flex-1">
        <BackButton to="/marketplace" label="رجوع للسوق" className="mb-3" />
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">لا توجد منتجات في هذه الفئة.</Card>
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
