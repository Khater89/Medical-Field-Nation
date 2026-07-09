import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import ProductCard, { ProductCardData } from "@/components/marketplace/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Store, MessageCircle, Clock } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import MarketplaceChatDialog from "@/components/marketplace/MarketplaceChatDialog";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VendorPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [vendor, setVendor] = useState<any>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: v } = await supabase
        .from("marketplace_vendors_public" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setVendor(v);
      if (v) {
        const { data: prods } = await supabase
          .from("marketplace_products")
          .select("id,vendor_id,name_ar,name_en,price,compare_at_price,currency,cover_image_url,unit,requires_prescription,stock_quantity,unlimited_stock")
          .eq("vendor_id", (v as any).id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        setProducts((prods as ProductCardData[]) || []);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader /><MarketplaceSubNav />
        <main className="container max-w-6xl py-6 flex-1"><Skeleton className="h-40 w-full mb-4" /></main>
      </div>
    );
  }
  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader /><MarketplaceSubNav />
        <main className="container max-w-6xl py-12 flex-1 text-center text-muted-foreground">{t("mp.vendor.not_found")}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader /><MarketplaceSubNav />
      <main className="container max-w-6xl py-6 flex-1 space-y-6">
        <BackButton label={t("mp.back")} />

        <Card className="overflow-hidden">
          {vendor.banner_url && (
            <div className="h-32 md:h-48 w-full bg-muted overflow-hidden">
              <img src={vendor.banner_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5 flex items-start gap-4 flex-wrap">
            <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" className="w-full h-full object-cover" /> : <Store className="h-10 w-10 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{vendor.store_name}</h1>
                <Badge className={vendor.is_open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {vendor.is_open ? t("mp.open_now") : t("mp.closed_now")}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-3">
                {vendor.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{vendor.city}{vendor.area_text ? ` - ${vendor.area_text}` : ""}</span>}
                {vendor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{vendor.phone}</span>}
                {vendor.working_hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{typeof vendor.working_hours === "string" ? vendor.working_hours : JSON.stringify(vendor.working_hours)}</span>}
              </div>
              {vendor.description && <p className="text-sm mt-2 text-muted-foreground">{vendor.description}</p>}
              <div className="flex gap-2 mt-3">
                <Button onClick={() => setChatOpen(true)} className="gap-2">
                  <MessageCircle className="h-4 w-4" /> {t("mp.contact_store")}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="text-lg font-bold mb-3">{t("mp.vendor.products_count")} ({products.length})</h2>
          {products.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{t("mp.vendor.no_products")}</Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        <MarketplaceChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          vendorId={vendor.id}
          vendorName={vendor.store_name}
        />
      </main>
      <AppFooter />
    </div>
  );
}
