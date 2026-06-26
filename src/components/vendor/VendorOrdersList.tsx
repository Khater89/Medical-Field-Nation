import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const STATUS_FLOW: Record<string, { next: string; label: string }[]> = {
  pending: [{ next: "confirmed", label: "تأكيد الطلب" }, { next: "cancelled", label: "إلغاء" }],
  confirmed: [{ next: "preparing", label: "بدء التحضير" }],
  preparing: [{ next: "out_for_delivery", label: "في الطريق" }, { next: "ready_for_pickup", label: "جاهز للاستلام" }],
  ready_for_pickup: [{ next: "delivered", label: "تم التسليم" }],
  out_for_delivery: [{ next: "delivered", label: "تم التسليم" }],
};

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  out_for_delivery: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  refunded: "مسترد",
};

export default function VendorOrdersList({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_orders")
      .select("*, items:marketplace_order_items(*)")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendorId]);

  const updateStatus = async (orderId: string, status: string) => {
    const patch: any = { status };
    if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
    const { error } = await supabase.from("marketplace_orders").update(patch).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث الحالة");
    load();
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  if (orders.length === 0) return (
    <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد طلبات بعد</CardContent></Card>
  );

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">طلب #{o.order_number || o.id.slice(0, 8)}</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString("ar")}</div>
              </div>
              <Badge>{STATUS_LABEL[o.status] || o.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">العميل:</span> {o.customer_name || "-"}</div>
              <div><span className="text-muted-foreground">الهاتف:</span> {o.customer_phone || "-"}</div>
              <div><span className="text-muted-foreground">التوصيل:</span> {o.delivery_method}</div>
              <div><span className="text-muted-foreground">الدفع:</span> {o.payment_method}</div>
              {o.delivery_address && <div className="sm:col-span-2"><span className="text-muted-foreground">العنوان:</span> {o.delivery_address}، {o.delivery_city}</div>}
            </div>
            <div className="border rounded p-2 bg-muted/30">
              {(o.items || []).map((it: any) => (
                <div key={it.id} className="flex justify-between text-xs py-1">
                  <span>{it.product_name} × {it.quantity}</span>
                  <span>{Number(it.line_total).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t mt-1">
                <span>الإجمالي</span>
                <span>{Number(o.total).toFixed(2)} {o.currency}</span>
              </div>
            </div>
            {STATUS_FLOW[o.status] && (
              <div className="flex flex-wrap gap-2 pt-2">
                {STATUS_FLOW[o.status].map((a) => (
                  <Button key={a.next} size="sm" variant={a.next === "cancelled" ? "destructive" : "default"} onClick={() => updateStatus(o.id, a.next)}>
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
