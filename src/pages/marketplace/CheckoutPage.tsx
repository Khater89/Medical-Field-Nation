import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import { useCart, CartItem } from "@/contexts/MarketplaceCartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
import AcknowledgementDialog, { CUSTOMER_ORDER_ACK_TEXT, CUSTOMER_ORDER_ACK_TEXT_EN } from "@/components/marketplace/AcknowledgementDialog";

type DeliveryMethod = "VENDOR_DELIVERY" | "PICKUP" | "SHIPPING_COMPANY";
type PaymentMethod = "CASH_ON_DELIVERY" | "ONLINE" | "CLIQ";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, profile, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
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

  const ackText = lang === "en" ? CUSTOMER_ORDER_ACK_TEXT_EN : CUSTOMER_ORDER_ACK_TEXT;
  const currency = t("mp.currency.jod");

  useEffect(() => {
    if (profile) {
      setCustomerName(profile.full_name || localStorage.getItem("mp_guest_name") || "");
      setCustomerPhone(profile.phone || localStorage.getItem("mp_guest_phone") || "");
      setCustomerEmail(user?.email || "");
      setCity(profile.city || "");
    } else {
      setCustomerName(localStorage.getItem("mp_guest_name") || "");
      setCustomerPhone(localStorage.getItem("mp_guest_phone") || "");
    }
  }, [profile, user]);

  const groups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    items.forEach((i) => {
      const arr = map.get(i.vendor_id) || [];
      arr.push(i);
      map.set(i.vendor_id, arr);
    });
    return Array.from(map.entries());
  }, [items]);

  const validateAndOpenAck = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error(t("mp.checkout.toast_missing_name_phone"));
      return;
    }
    if (deliveryMethod !== "PICKUP" && (!city.trim() || !address.trim())) {
      toast.error(t("mp.checkout.toast_missing_address"));
      return;
    }
    if (items.length === 0) {
      toast.error(t("mp.checkout.toast_empty_cart"));
      return;
    }
    setAckOpen(true);
  };

  const handleSubmit = async () => {
    setAckOpen(false);
    setSubmitting(true);
    try {
      localStorage.setItem("mp_guest_name", customerName);
      localStorage.setItem("mp_guest_phone", customerPhone);

      const createdOrders: string[] = [];

      if (user) {
        for (const [vendor_id, vItems] of groups) {
          const vSubtotal = vItems.reduce((s, i) => s + i.price * i.quantity, 0);
          const { data: order, error: orderErr } = await supabase
            .from("marketplace_orders")
            .insert({
              customer_user_id: user.id,
              vendor_id,
              payment_method: paymentMethod,
              delivery_method: deliveryMethod,
              subtotal: vSubtotal, delivery_fee: 0, discount: 0, total: vSubtotal, currency: "JOD",
              customer_name: customerName, customer_phone: customerPhone, customer_email: customerEmail || null,
              delivery_address: deliveryMethod === "PICKUP" ? null : address,
              delivery_city: deliveryMethod === "PICKUP" ? null : city,
              notes: notes || null,
              customer_acknowledged_at: new Date().toISOString(),
              customer_acknowledgement_text: ackText,
            }).select("id, order_number").single();
          if (orderErr || !order) throw orderErr || new Error(t("mp.checkout.toast_create_failed"));
          const itemsPayload = vItems.map((i) => ({
            order_id: order.id, product_id: i.product_id, product_name: i.name,
            unit_price: i.price, quantity: i.quantity, line_total: i.price * i.quantity,
          }));
          const { error: itemsErr } = await supabase.from("marketplace_order_items").insert(itemsPayload);
          if (itemsErr) throw itemsErr;
          createdOrders.push(order.id);
        }
      } else {
        const guestToken = localStorage.getItem("mp_guest_order_token") || crypto.randomUUID();
        localStorage.setItem("mp_guest_order_token", guestToken);
        for (const [vendor_id, vItems] of groups) {
          const { data, error } = await supabase.functions.invoke("mp-guest", {
            body: {
              action: "create_order",
              vendor_id,
              items: vItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
              delivery_method: deliveryMethod,
              delivery_address: deliveryMethod === "PICKUP" ? null : address,
              delivery_city: deliveryMethod === "PICKUP" ? null : city,
              notes: notes || null,
              name: customerName, phone: customerPhone,
              guest_token: guestToken,
              acknowledgement_text: ackText,
            },
          });
          if (error || data?.error) throw new Error(data?.error || error?.message || t("mp.checkout.toast_create_failed"));
          createdOrders.push(data.order_id);
        }
      }

      clear();
      toast.success(t("mp.checkout.toast_success"));
      navigate(user ? "/marketplace/orders" : "/marketplace");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("mp.checkout.toast_error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
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
        <BackButton to="/marketplace/cart" label={t("mp.back_to_cart")} className="mb-3" />
        <h1 className="text-2xl font-bold mb-4">{t("mp.checkout.title")}</h1>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-bold">{t("mp.checkout.contact_info")}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>{t("mp.checkout.full_name")}</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label>{t("mp.checkout.phone")}</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={t("mp.gmsg.phone_placeholder")} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t("mp.checkout.email")}</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="font-bold">{t("mp.checkout.delivery_method")}</h2>
              <RadioGroup value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)} className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="VENDOR_DELIVERY" /> {t("mp.checkout.vendor_delivery")}
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="PICKUP" /> {t("mp.checkout.pickup")}
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="SHIPPING_COMPANY" /> {t("mp.checkout.shipping_company")}
                </label>
              </RadioGroup>

              {deliveryMethod !== "PICKUP" && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label>{t("mp.checkout.city")}</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("mp.checkout.city_placeholder")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t("mp.checkout.address")}</Label>
                    <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <h2 className="font-bold">{t("mp.checkout.payment_method")}</h2>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="CASH_ON_DELIVERY" /> {t("mp.checkout.cash_on_delivery")}
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg">
                  <RadioGroupItem value="CLIQ" /> CliQ
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-lg opacity-50">
                  <RadioGroupItem value="ONLINE" disabled /> {t("mp.checkout.online_soon")}
                </label>
              </RadioGroup>
            </Card>

            <Card className="p-4 space-y-2">
              <Label>{t("mp.checkout.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Card>
          </div>

          <Card className="p-4 h-fit space-y-3 sticky top-20">
            <h2 className="font-bold">{t("mp.cart.summary")}</h2>
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
              <span>{t("mp.checkout.total")}</span>
              <span>{subtotal.toFixed(2)} {currency}</span>
            </div>
            <Button className="w-full" size="lg" onClick={validateAndOpenAck} disabled={submitting || items.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("mp.checkout.confirm_order")}
            </Button>
          </Card>
        </div>
      </main>
      <AcknowledgementDialog
        open={ackOpen}
        onOpenChange={setAckOpen}
        title={t("mp.checkout.ack_title")}
        text={ackText}
        confirmLabel={t("mp.checkout.ack_confirm")}
        loading={submitting}
        onConfirm={handleSubmit}
      />
      <AppFooter />
    </div>
  );
}
