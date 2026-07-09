import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import ProductCard, { ProductCardData } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import { useLanguage } from "@/contexts/LanguageContext";

const TYPE_LABEL_KEYS: Record<string, string> = {
  pharmacy: "mp.vendor_type.pharmacy",
  medical_devices: "mp.vendor_type.medical_devices",
  prosthetics: "mp.vendor_type.prosthetics",
  other: "mp.vendor_type.other",
};

const CTA_KEYS: Record<string, { title: string; sub: string }> = {
  pharmacy: { title: "mp.type.add_pharmacy_title", sub: "mp.type.add_pharmacy_sub" },
  medical_devices: { title: "mp.type.add_devices_title", sub: "mp.type.add_devices_sub" },
  prosthetics: { title: "mp.type.add_prosthetics_title", sub: "mp.type.add_prosthetics_sub" },
  other: { title: "mp.type.add_other_title", sub: "mp.type.add_other_sub" },
};

export default function VendorTypePage() {
  const { type } = useParams<{ type: string }>();
  const { t } = useLanguage();
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: vs } = await supabase
        .from("marketplace_vendors_public" as any)
        .select("id,store_name,logo_url,city,area_text,is_open")
        .eq("vendor_type", type as any)
        .order("created_at", { ascending: false })
        .limit(12);
      setVendors((vs as any[]) || []);
      const vendorIds = ((vs as any[]) || []).map((v: any) => v.id);
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

  const typeLabel = type && TYPE_LABEL_KEYS[type] ? t(TYPE_LABEL_KEYS[type]) : t("mp.type.market_default");
  const cta = type ? CTA_KEYS[type] : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />
      <main className="container max-w-6xl py-6 flex-1 space-y-6">
        <BackButton to="/marketplace" label={t("mp.back_to_market")} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{typeLabel}</h1>
          {cta && (
            <Button asChild size="lg" className="gap-2">
              <Link to={`/vendor/register?type=${type}`}>
                <Plus className="h-4 w-4" />
                {t(cta.title)}
              </Link>
            </Button>
          )}
        </div>

        {cta && (
          <Card className="p-4 md:p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{t(cta.title)}</div>
              <div className="text-sm text-muted-foreground">{t(cta.sub)}</div>
            </div>
            <Button asChild variant="outline">
              <Link to={`/vendor/register?type=${type}`}>{t("mp.type.start_registration")}</Link>
            </Button>
          </Card>
        )}

        {vendors.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">{t("mp.type.available_stores")}</h2>
              <Link to={`/marketplace/pharmacies?type=${type}`} className="text-sm text-primary underline">{t("mp.type.view_all")}</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {vendors.map((v) => (
                <Link key={v.id} to={`/marketplace/vendor/${v.id}`}>
                  <Card className="p-3 hover:shadow-md transition-shadow h-full">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 overflow-hidden flex items-center justify-center mb-2">
                      {v.logo_url ? <img src={v.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-primary text-lg">🏪</span>}
                    </div>
                    <div className="font-semibold text-sm truncate">{v.store_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{v.city || "-"}</div>
                    <div className={`text-xs mt-1 ${v.is_open ? "text-green-700" : "text-red-700"}`}>{v.is_open ? t("mp.open") : t("mp.closed")}</div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold mb-3">{t("mp.type.products_in_section")}</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{t("mp.type.no_products_in_section")}</Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.map((p) => (
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
