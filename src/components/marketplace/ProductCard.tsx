import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Pill } from "lucide-react";
import { useCart } from "@/contexts/MarketplaceCartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export interface ProductCardData {
  id: string;
  vendor_id: string;
  name_ar: string;
  name_en?: string | null;
  price: number;
  compare_at_price?: number | null;
  currency?: string | null;
  cover_image_url?: string | null;
  unit?: string | null;
  requires_prescription?: boolean;
  stock_quantity?: number | null;
  unlimited_stock?: boolean;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  const inStock = product.unlimited_stock || (product.stock_quantity ?? 0) > 0;
  const displayName = lang === "en" && product.name_en ? product.name_en : product.name_ar;
  const currencyLabel = product.currency || t("mp.currency.jod");

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem({
      product_id: product.id,
      vendor_id: product.vendor_id,
      name: displayName,
      price: Number(product.price),
      cover_image_url: product.cover_image_url,
      unit: product.unit,
      requires_prescription: product.requires_prescription,
    });
    toast.success(t("mp.added_to_cart"));
  };

  return (
    <Link to={`/marketplace/product/${product.id}`} className="group">
      <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {product.cover_image_url ? (
            <img
              src={product.cover_image_url}
              alt={displayName}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              {t("mp.no_image")}
            </div>
          )}
          {product.requires_prescription && (
            <Badge className="absolute top-2 start-2 gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100">
              <Pill className="h-3 w-3" /> {t("mp.by_prescription")}
            </Badge>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Badge variant="secondary">{t("mp.out_of_stock")}</Badge>
            </div>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col gap-2">
          <h3 className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{displayName}</h3>
          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-base font-bold text-primary">
                {Number(product.price).toFixed(2)} {currencyLabel}
              </span>
              {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                <span className="text-xs text-muted-foreground line-through">
                  {Number(product.compare_at_price).toFixed(2)}
                </span>
              )}
            </div>
            <Button size="icon" variant="default" onClick={handleAdd} disabled={!inStock} className="h-9 w-9 rounded-full">
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}
