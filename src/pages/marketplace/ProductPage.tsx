import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Minus, Plus, ShoppingCart, Pill, Store, MessageCircle } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import { useCart } from "@/contexts/MarketplaceCartContext";
import { toast } from "sonner";
import MarketplaceChatDialog from "@/components/marketplace/MarketplaceChatDialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface Product {
  id: string;
  vendor_id: string;
  name_ar: string;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  brand?: string | null;
  price: number;
  compare_at_price?: number | null;
  currency?: string | null;
  cover_image_url?: string | null;
  unit?: string | null;
  stock_quantity?: number | null;
  unlimited_stock?: boolean;
  requires_prescription?: boolean;
}
interface Vendor {
  id: string;
  store_name: string;
  vendor_type: string;
  city?: string | null;
  rating?: number | null;
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("marketplace_products")
        .select("*")
        .eq("id", id!)
        .eq("is_active", true)
        .maybeSingle();
      if (p) {
        setProduct(p as Product);
        const [{ data: v }, { data: imgs }] = await Promise.all([
          supabase.from("marketplace_vendors_public" as any).select("id,store_name,vendor_type,city,rating").eq("id", p.vendor_id).maybeSingle(),
          supabase.from("marketplace_product_images").select("url").eq("product_id", p.id).order("sort_order"),
        ]);
        setVendor(v as unknown as Vendor);
        setImages((imgs || []).map((i: any) => i.url));
      }
      setLoading(false);
    })();
  }, [id]);

  const inStock = !!product && (product.unlimited_stock || (product.stock_quantity ?? 0) > 0);
  const displayName = product ? (lang === "en" && product.name_en ? product.name_en : product.name_ar) : "";
  const displayDescription = product ? (lang === "en" && product.description_en ? product.description_en : product.description_ar) : null;
  const currency = product?.currency || t("mp.currency.jod");

  const handleAdd = () => {
    if (!product || !inStock) return;
    addItem(
      {
        product_id: product.id,
        vendor_id: product.vendor_id,
        name: displayName,
        price: Number(product.price),
        cover_image_url: product.cover_image_url,
        unit: product.unit,
        requires_prescription: product.requires_prescription,
      },
      qty
    );
    toast.success(t("mp.product.added_qty").replace("{qty}", String(qty)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <MarketplaceSubNav />
        <main className="container max-w-6xl py-6 flex-1 grid md:grid-cols-2 gap-6">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <MarketplaceSubNav />
        <main className="container max-w-6xl py-12 flex-1 text-center">
          <p className="text-muted-foreground">{t("mp.product.not_found")}</p>
          <Link to="/marketplace"><Button variant="link">{t("mp.product.back_to_market")}</Button></Link>
        </main>
      </div>
    );
  }

  const gallery = [product.cover_image_url, ...images].filter(Boolean) as string[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />
      <main className="container max-w-6xl py-6 flex-1">
        <BackButton label={t("mp.back")} className="mb-3" />
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="aspect-square bg-muted rounded-xl overflow-hidden">
              {gallery[0] ? (
                <img src={gallery[0]} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">{t("mp.no_image")}</div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {gallery.slice(0, 5).map((u, i) => (
                  <div key={i} className="aspect-square bg-muted rounded overflow-hidden">
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {product.requires_prescription && (
              <Badge className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100">
                <Pill className="h-3 w-3" /> {t("mp.requires_prescription")}
              </Badge>
            )}
            <div className="flex items-end gap-3">
              <span className="text-3xl font-extrabold text-primary">
                {Number(product.price).toFixed(2)} {currency}
              </span>
              {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                <span className="text-base text-muted-foreground line-through">
                  {Number(product.compare_at_price).toFixed(2)}
                </span>
              )}
            </div>
            {product.unit && <p className="text-sm text-muted-foreground">{t("mp.unit")}: {product.unit}</p>}
            {!inStock && <Badge variant="destructive">{t("mp.out_of_stock_now")}</Badge>}

            {displayDescription && (
              <Card className="p-4 text-sm leading-7 whitespace-pre-wrap">{displayDescription}</Card>
            )}

            {vendor && (
              <Card className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <Link to={`/marketplace/vendor/${vendor.id}`} className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-semibold text-sm">{vendor.store_name}</div>
                    {vendor.city && <div className="text-xs text-muted-foreground">{vendor.city}</div>}
                  </div>
                </Link>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setChatOpen(true)}>
                  <MessageCircle className="h-3 w-3" /> {t("mp.ask_about_product")}
                </Button>
              </Card>
            )}

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border border-border rounded-full">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(Math.max(1, qty - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-3 font-semibold min-w-8 text-center">{qty}</span>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(qty + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="lg" className="flex-1 gap-2" onClick={handleAdd} disabled={!inStock}>
                <ShoppingCart className="h-4 w-4" />
                {t("mp.product.add_to_cart")}
              </Button>
            </div>
          </div>
        </div>
        {vendor && product && (
          <MarketplaceChatDialog
            open={chatOpen}
            onOpenChange={setChatOpen}
            vendorId={vendor.id}
            vendorName={vendor.store_name}
            productId={product.id}
            productName={displayName}
          />
        )}
      </main>
      <AppFooter />
    </div>
  );
}
