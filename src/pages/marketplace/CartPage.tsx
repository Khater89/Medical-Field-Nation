import { Link, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import { useCart } from "@/contexts/MarketplaceCartContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, vendorsCount, clear } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />
      <main className="container max-w-4xl py-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">سلة الشراء</h1>

        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">السلة فارغة</p>
            <Link to="/marketplace"><Button>تصفّح المنتجات</Button></Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              {items.map((item) => (
                <Card key={item.product_id} className="p-3 flex items-center gap-3">
                  <div className="w-16 h-16 rounded bg-muted overflow-hidden shrink-0">
                    {item.cover_image_url && <img src={item.cover_image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm line-clamp-2">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.price.toFixed(2)} JOD</div>
                  </div>
                  <div className="flex items-center border border-border rounded-full">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.product_id, item.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="px-2 text-sm font-semibold min-w-6 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.product_id, item.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-sm font-bold w-20 text-end">{(item.price * item.quantity).toFixed(2)}</div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
              <Button variant="ghost" size="sm" className="text-destructive" onClick={clear}>تفريغ السلة</Button>
            </div>

            <Card className="p-4 h-fit space-y-3 sticky top-20">
              <h2 className="font-bold">ملخص الطلب</h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-semibold">{subtotal.toFixed(2)} JOD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">عدد البائعين</span>
                <span>{vendorsCount}</span>
              </div>
              {vendorsCount > 1 && (
                <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  ملاحظة: سيتم إنشاء طلب منفصل لكل بائع.
                </p>
              )}
              <Button className="w-full" size="lg" onClick={() => navigate("/marketplace/checkout")}>
                إتمام الشراء
              </Button>
            </Card>
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
