import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import { useCart, CartItem } from "@/contexts/MarketplaceCartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import AcknowledgementDialog, { CUSTOMER_ORDER_ACK_TEXT } from "@/components/marketplace/AcknowledgementDialog";

type DeliveryMethod = "VENDOR_DELIVERY" | "PICKUP" | "SHIPPING_COMPANY";
type PaymentMethod = "CASH_ON_DELIVERY" | "ONLINE" | "CLIQ";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("VENDOR_DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH_ON_DELIVERY");

  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("يرجى تسجيل الدخول لإتمام الشراء");
      navigate(`/auth?redirect=${encodeURIComponent("/marketplace/checkout")}`);
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setCustomerName(profile.full_name || "");
      setCustomerPhone(profile.phone || "");
      setCustomerEmail(user?.email || "");
      setCity(profile.city || "");
    }
  }, [profile, user]);

  // Group items by vendor
  const groups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    items.forEach((i) => {
      const arr = map.get(i.vendor_id) || [];
      arr.push(i);
      map.set(i.vendor_id, arr);
    });
    return Array.from(map.entries()); // [[vendor_id, items[]], ...]
  }, [items]);

  const validateAndOpenAck = () => {
    if (!user) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("الرجاء تعبئة الاسم ورقم الهاتف");
      return;
    }
    if (deliveryMethod !== "PICKUP" && (!city.trim() || !address.trim())) {
      toast.error("الرجاء تعبئة عنوان التوصيل");
      return;
    }
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    setAckOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setAckOpen(false);
    setSubmitting(true);
    try {
      const createdOrders: string[] = [];

      for (const [vendor_id, vItems] of groups) {
        const vSubtotal = vItems.reduce((s, i) => s + i.price * i.quantity, 0);

        const { data: order, error: orderErr } = await supabase
          .from("marketplace_orders")
          .insert({
            customer_user_id: user.id,
            vendor_id,
            payment_method: paymentMethod,
            delivery_method: deliveryMethod,
            subtotal: vSubtotal,
            delivery_fee: 0,
            discount: 0,
            total: vSubtotal,
            currency: "JOD",
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            delivery_address: deliveryMethod === "PICKUP" ? null : address,
            delivery_city: deliveryMethod === "PICKUP" ? null : city,
            notes: notes || null,
            customer_acknowledged_at: new Date().toISOString(),
            customer_acknowledgement_text: CUSTOMER_ORDER_ACK_TEXT,
          })
          .select("id, order_number")
          .single();

        if (orderErr || !order) throw orderErr || new Error("فشل إنشاء الطلب");

        const itemsPayload = vItems.map((i) => ({
          order_id: order.id,
          product_id: i.product_id,
          product_name: i.name,
          unit_price: i.price,
          quantity: i.quantity,
          line_total: i.price * i.quantity,
        }));

        const { error: itemsErr } = await supabase.from("marketplace_order_items").insert(itemsPayload);
        if (itemsErr) throw itemsErr;

        createdOrders.push(order.id);
      }

      clear();
      toast.success("تم إنشاء طلبك بنجاح");
      navigate("/marketplace/orders");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <MarketplaceSubNav />
      <main className="container max-w-4xl py-6 flex-1">
        <BackButton to="/marketplace/cart" label="رجوع للسلة" className="mb-3" />
        <h1 className="text-2xl font-bold mb-4">إتمام الشراء</h1>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-bold">معلومات الاتصال</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>الاسم الكامل *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label>رقم الهاتف *</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XXXXXXXX" />
                </div>
                <div className="sm:col-span-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="font-bold">طريقة التوصيل</h2>
              <RadioGroup value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)} className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="VENDOR_DELIVERY" /> توصيل من البائع
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="PICKUP" /> الاستلام من المتجر
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="SHIPPING_COMPANY" /> عبر شركة شحن
                </label>
              </RadioGroup>

              {deliveryMethod !== "PICKUP" && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label>المدينة *</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: عمان" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>العنوان التفصيلي *</Label>
                    <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="font-bold">طريقة الدفع</h2>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="CASH_ON_DELIVERY" /> الدفع عند الاستلام
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="CLIQ" /> CliQ
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg opacity-50">
                  <RadioGroupItem value="ONLINE" disabled /> الدفع الإلكتروني (قريباً)
                </label>
              </RadioGroup>
            </Card>

            <Card className="p-4 space-y-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Card>
          </div>

          <Card className="p-4 h-fit space-y-3 sticky top-20">
            <h2 className="font-bold">ملخص الطلب</h2>
            {groups.map(([vendor_id, vItems]) => (
              <div key={vendor_id} className="space-y-1 text-sm border-b border-border pb-2 last:border-0">
                {vItems.map((i) => (
                  <div key={i.product_id} className="flex justify-between">
                    <span className="truncate me-2">{i.name} × {i.quantity}</span>
                    <span>{(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t border-border">
              <span>الإجمالي</span>
              <span>{subtotal.toFixed(2)} JOD</span>
            </div>
            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting || items.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد الطلب"}
            </Button>
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
