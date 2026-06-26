import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Package } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  NEW: "جديد",
  CONFIRMED: "مؤكد",
  PREPARING: "قيد التحضير",
  OUT_FOR_DELIVERY: "في الطريق",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغى",
  REFUNDED: "مرتجع",
};

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("marketplace_orders")
        .select("id, order_number, status, total, currency, created_at, vendor_id, marketplace_order_items(product_name, quantity)")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />
      <main className="container max-w-4xl py-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">طلباتي</h1>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">لا توجد طلبات بعد</p>
            <Link to="/marketplace"><Button>ابدأ التسوق</Button></Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold">طلب #{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar")}</div>
                  </div>
                  <Badge variant="secondary">{STATUS_LABEL[o.status] || o.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {(o.marketplace_order_items || []).slice(0, 3).map((it: any, i: number) => (
                    <div key={i}>• {it.product_name} × {it.quantity}</div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">الإجمالي</span>
                  <span className="font-bold">{Number(o.total).toFixed(2)} {o.currency}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
