import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Circle, Clock, Loader2, MapPin, Phone, Star, Landmark, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import ApplePayButton from "@/components/booking/ApplePayButton";

interface TimelineStep {
  label: string;
  status: "done" | "current" | "upcoming";
  time?: string;
}

interface OrderTrackerProps {
  bookingId: string;
  onClose?: () => void;
}

const STATUS_ORDER = ["NEW", "CONFIRMED", "ASSIGNED", "ACCEPTED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS", "COMPLETED"];
const STATUS_LABELS: Record<string, string> = {
  NEW: "تم استلام الطلب",
  CONFIRMED: "تم تأكيد الطلب",
  ASSIGNED: "تم تعيين مقدم الخدمة",
  ACCEPTED: "المزود قبل الطلب",
  PROVIDER_ON_THE_WAY: "المزود في الطريق",
  IN_PROGRESS: "الخدمة قيد التنفيذ",
  COMPLETED: "تم إكمال الخدمة",
  CANCELLED: "تم إلغاء الطلب",
  REJECTED: "تم رفض الطلب",
};

const CustomerOrderTracker = ({ bookingId, onClose }: OrderTrackerProps) => {
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const STATUS_NOTIFICATIONS: Record<string, string> = {
    ACCEPTED: "✅ تم قبول طلبك، المزود سيصلك في الوقت المحدد.",
    PROVIDER_ON_THE_WAY: "🚗 المزود في الطريق إليك الآن.",
    IN_PROGRESS: "🏥 بدأت الخدمة الآن، نتمنى لك السلامة.",
    COMPLETED: "🎉 تم إكمال الخدمة بنجاح، يرجى تقييم المزود وتحديد طريقة الدفع.",
    CANCELLED: "❌ تم إلغاء الطلب.",
  };

  useEffect(() => {
    const fetch = async () => {
      const [bookingRes, historyRes, ratingRes, settingsRes] = await Promise.all([
        supabase.from("bookings").select("*").eq("id", bookingId).single(),
        supabase.from("booking_history").select("*").eq("booking_id", bookingId).order("created_at", { ascending: true }),
        supabase.from("provider_ratings").select("*").eq("booking_id", bookingId).maybeSingle(),
        supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      setBooking(bookingRes.data);
      setHistory(historyRes.data || []);
      if (settingsRes.data) setPlatformSettings(settingsRes.data);
      if (ratingRes.data) {
        setExistingRating(ratingRes.data);
        setRating(ratingRes.data.rating);
        setComment(ratingRes.data.comment || "");
      }
      setLoading(false);
    };
    fetch();

    // Realtime subscription for status changes
    const channel = supabase
      .channel(`booking-track-${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          const newData = payload.new as any;
          setBooking(newData);
          const msg = STATUS_NOTIFICATIONS[newData.status];
          if (msg) {
            setStatusNotification(msg);
            sonnerToast(msg);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  const handleRate = async () => {
    if (!booking || !booking.assigned_provider_id || rating === 0) return;
    setSubmittingRating(true);
    const { error } = await supabase.from("provider_ratings").insert({
      booking_id: bookingId,
      provider_id: booking.assigned_provider_id,
      rated_by: (await supabase.auth.getUser()).data.user?.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmittingRating(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setExistingRating({ rating, comment });
      toast({ title: "شكراً لتقييمك! ⭐" });
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!booking) return <p className="text-center text-muted-foreground py-6">الطلب غير موجود</p>;

  const currentIdx = STATUS_ORDER.indexOf(booking.status);
  const isCancelled = booking.status === "CANCELLED" || booking.status === "REJECTED";

  const steps: TimelineStep[] = STATUS_ORDER.map((s, i) => ({
    label: STATUS_LABELS[s],
    status: isCancelled
      ? "upcoming"
      : i < currentIdx
      ? "done"
      : i === currentIdx
      ? "current"
      : "upcoming",
    time: history.find(h => h.action?.includes(s))?.created_at,
  }));

  if (isCancelled) {
    steps.push({
      label: STATUS_LABELS[booking.status],
      status: "current",
      time: booking.rejected_at || booking.created_at,
    });
  }

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">تتبع الطلب</h3>
        <Badge variant={isCancelled ? "destructive" : booking.status === "COMPLETED" ? "outline" : "default"}>
          {STATUS_LABELS[booking.status] || booking.status}
        </Badge>
      </div>

      {/* Status Notification Banner */}
      {statusNotification && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2">
          <Bell className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-medium flex-1">{statusNotification}</p>
          <button onClick={() => setStatusNotification(null)} className="shrink-0">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Timeline + Payment + Rating in horizontal grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline Card */}
        <Card className="border-border lg:col-span-1">
          <CardContent className="py-4">
            <h4 className="text-sm font-bold mb-3">مراحل الطلب</h4>
            <div className="relative space-y-0 pr-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 pb-4 relative">
                  {i < steps.length - 1 && (
                    <div className={`absolute right-[7px] top-6 w-0.5 h-full ${step.status === "done" ? "bg-success" : "bg-border"}`} />
                  )}
                  <div className="relative z-10 shrink-0">
                    {step.status === "done" ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : step.status === "current" ? (
                      <Clock className="h-4 w-4 text-primary animate-pulse" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step.status === "upcoming" ? "text-muted-foreground/50" : "text-foreground"}`}>
                      {step.label}
                    </p>
                    {step.time && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(step.time).toLocaleString("ar-JO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right column: Payment + Rating stacked, only visible after completion */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Method Selection - shown after completion */}
      {booking.status === "COMPLETED" && (
        <Card className="border-border">
          <CardContent className="py-4 space-y-3">
            <h4 className="text-sm font-bold">طريقة الدفع</h4>
            {booking.payment_status === "PAYMENT_METHOD_SET" ? (
              <Badge variant="outline" className="text-xs">
                {booking.payment_method === "CASH" ? "💵 نقداً — للمزود" :
                 booking.payment_method === "CLIQ" ? "📱 CliQ — للمنصة" :
                 booking.payment_method === "APPLE_PAY" ? " Pay — عبر CliQ" :
                 booking.payment_method === "INSURANCE" ? "🏥 تأمين طبي" :
                 booking.payment_method}
              </Badge>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: "CASH", label: "💵 نقداً", desc: "للمزود" },
                    { value: "CLIQ", label: "📱 CliQ", desc: "للمنصة" },
                    { value: "INSURANCE", label: "🏥 تأمين", desc: "طبي" },
                  ].map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => setSelectedPayment(pm.value)}
                      className={`p-3 rounded-lg border text-center transition-all min-h-[68px] flex flex-col items-center justify-center gap-1 ${
                        selectedPayment === pm.value
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-base block leading-none">{pm.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-none">{pm.desc}</span>
                    </button>
                  ))}
                  <ApplePayButton
                    variant="option"
                    selected={selectedPayment === "APPLE_PAY"}
                    onClick={() => setSelectedPayment("APPLE_PAY")}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!selectedPayment || savingPayment}
                  onClick={async () => {
                    if (!selectedPayment) return;
                    setSavingPayment(true);
                    const { error } = await supabase
                      .from("bookings")
                      .update({ payment_method: selectedPayment, payment_status: "PAYMENT_METHOD_SET" })
                      .eq("id", bookingId);
                    setSavingPayment(false);
                    if (error) {
                      toast({ title: "خطأ", description: error.message, variant: "destructive" });
                    } else {
                      setBooking({ ...booking, payment_method: selectedPayment, payment_status: "PAYMENT_METHOD_SET" });
                      toast({ title: "تم حفظ طريقة الدفع ✅" });
                    }
                  }}
                  className="w-full gap-1.5"
                >
                  {savingPayment && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  تأكيد طريقة الدفع
                </Button>

                {/* Show CliQ / Apple Pay info when relevant */}
                {(selectedPayment === "CLIQ" || selectedPayment === "APPLE_PAY") && platformSettings && (
                  <div className="rounded-lg border border-info/30 bg-info/5 p-3 space-y-1.5 mt-2">
                    <h5 className="text-xs font-bold flex items-center gap-1.5 text-info">
                      <Landmark className="h-3.5 w-3.5" />
                      {selectedPayment === "APPLE_PAY"
                        ? "ادفع عبر Apple Pay → CliQ"
                        : "بيانات التحويل عبر CliQ"}
                    </h5>
                    {selectedPayment === "APPLE_PAY" && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        افتح <strong>Apple Wallet</strong> → اختر بطاقتك البنكية الأردنية المسجّلة في CliQ، ثم حوّل إلى الرقم أدناه.
                      </p>
                    )}
                    {platformSettings.bank_name && <p className="text-xs">🏦 البنك: <strong>{platformSettings.bank_name}</strong></p>}
                    {platformSettings.bank_account_holder && <p className="text-xs">👤 صاحب الحساب: <strong>{platformSettings.bank_account_holder}</strong></p>}
                    {platformSettings.bank_cliq_alias && <p className="text-xs">📱 CliQ Alias: <strong dir="ltr">{platformSettings.bank_cliq_alias}</strong></p>}
                    {platformSettings.bank_iban && <p className="text-xs">🔢 IBAN: <strong dir="ltr">{platformSettings.bank_iban}</strong></p>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rating Section - only for completed bookings */}
      {booking.status === "COMPLETED" && booking.assigned_provider_id && (
        <Card className="border-border">
          <CardContent className="py-4 space-y-3">
            <h4 className="text-sm font-bold">
              {existingRating ? "تقييمك للخدمة" : "قيّم الخدمة"}
            </h4>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => !existingRating && setRating(s)}
                  disabled={!!existingRating}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 ${s <= rating ? "text-warning fill-warning" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
            {!existingRating && (
              <>
                <Textarea
                  placeholder="أضف تعليقاً (اختياري)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleRate}
                  disabled={rating === 0 || submittingRating}
                  className="gap-1.5"
                >
                  {submittingRating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                  إرسال التقييم
                </Button>
              </>
            )}
            {existingRating && (
              <p className="text-xs text-muted-foreground">{existingRating.comment || "تم التقييم بنجاح"}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerOrderTracker;
