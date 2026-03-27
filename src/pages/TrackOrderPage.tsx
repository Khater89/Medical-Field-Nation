import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Loader2, CheckCircle, Circle, Clock,
  MapPin, CalendarDays, Landmark, Copy, AlertTriangle,
} from "lucide-react";

const STATUS_ORDER = ["NEW", "CONFIRMED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];
const STATUS_LABELS: Record<string, string> = {
  NEW: "تم استلام الطلب",
  CONFIRMED: "تم تأكيد الطلب",
  ASSIGNED: "تم تعيين مقدم الخدمة",
  ACCEPTED: "المزود قبل الطلب",
  IN_PROGRESS: "الخدمة قيد التنفيذ",
  COMPLETED: "تم إكمال الخدمة",
  CANCELLED: "تم إلغاء الطلب",
  REJECTED: "تم رفض الطلب",
};

interface TrackingResult {
  booking: {
    id: string;
    booking_number: string;
    status: string;
    city: string;
    scheduled_at: string;
    created_at: string;
    service_name: string;
    subtotal: number;
    calculated_total: number | null;
  };
  history: { action: string; created_at: string; note: string | null }[];
  rating: { rating: number; comment: string | null } | null;
  bank_info: {
    bank_name: string | null;
    bank_iban: string | null;
    bank_cliq_alias: string | null;
    bank_account_holder: string | null;
  } | null;
}

const TrackOrderPage = () => {
  const { toast } = useToast();
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ ✓" });
  };
  const [bookingNumber, setBookingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);

  const handleTrack = async () => {
    if (!bookingNumber.trim() || !phone.trim()) {
      toast({ title: "يرجى إدخال رقم الحجز ورقم الهاتف", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("track-booking", {
        body: { booking_number: bookingNumber.trim(), phone: phone.trim() },
      });

      if (error || data?.error) {
        const errCode = data?.error;
        if (errCode === "not_found") {
          toast({ title: "لم يتم العثور على الطلب", description: "تأكد من رقم الحجز", variant: "destructive" });
        } else if (errCode === "phone_mismatch") {
          toast({ title: "رقم الهاتف غير مطابق", description: "أدخل رقم الهاتف المستخدم عند الحجز", variant: "destructive" });
        } else {
          toast({ title: "حدث خطأ", variant: "destructive" });
        }
        setLoading(false);
        return;
      }

      setResult(data as TrackingResult);
    } catch {
      toast({ title: "حدث خطأ في الاتصال", variant: "destructive" });
    }
    setLoading(false);
  };

  const booking = result?.booking;
  const isCancelled = booking?.status === "CANCELLED" || booking?.status === "REJECTED";
  const currentIdx = booking ? STATUS_ORDER.indexOf(booking.status) : -1;

  const steps = booking
    ? STATUS_ORDER.map((s, i) => ({
        label: STATUS_LABELS[s],
        status: isCancelled ? "upcoming" : i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming",
        time: result?.history.find((h) => h.action?.includes(s))?.created_at,
      }))
    : [];

  if (isCancelled && booking) {
    steps.push({
      label: STATUS_LABELS[booking.status],
      status: "current",
      time: booking.created_at,
    });
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <AppHeader />

      <main className="container max-w-lg py-8 px-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">تتبع طلبك</h1>
          <p className="text-sm text-muted-foreground">
            أدخل رقم الحجز ورقم الهاتف لمتابعة حالة طلبك
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">رقم الحجز</label>
              <Input
                placeholder="MFN-2026-000001"
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                dir="ltr"
                className="text-center font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">رقم الهاتف</label>
              <Input
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                type="tel"
              />
            </div>
            <Button onClick={handleTrack} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              تتبع الطلب
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && booking && (
          <Card>
            <CardContent className="py-5 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{booking.service_name}</p>
                  <p className="text-xs text-muted-foreground font-mono" dir="ltr">{booking.booking_number}</p>
                </div>
                <Badge variant={isCancelled ? "destructive" : booking.status === "COMPLETED" ? "outline" : "default"}>
                  {STATUS_LABELS[booking.status] || booking.status}
                </Badge>
              </div>

              {/* Info */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(booking.scheduled_at).toLocaleDateString("ar-JO", {
                    weekday: "short", month: "short", day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(booking.scheduled_at).toLocaleTimeString("ar-JO", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {booking.city}
                </span>
                <span className="font-medium text-primary">
                  {booking.calculated_total || booking.subtotal} د.أ
                </span>
              </div>

              {/* Timeline */}
              <div className="relative space-y-0 pr-4 pt-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 pb-6 relative">
                    {i < steps.length - 1 && (
                      <div className={`absolute right-[7px] top-6 w-0.5 h-full ${step.status === "done" ? "bg-primary" : "bg-border"}`} />
                    )}
                    <div className="relative z-10 shrink-0">
                      {step.status === "done" ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
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

              {/* Rating display */}
              {result.rating && (
                <div className="border-t pt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">التقييم</p>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`text-lg ${s <= result.rating!.rating ? "text-warning" : "text-muted-foreground/20"}`}>★</span>
                    ))}
                  </div>
                  {result.rating.comment && (
                    <p className="text-xs text-muted-foreground">{result.rating.comment}</p>
                  )}
                </div>
              )}

              {/* Bank Payment Info - only after COMPLETED */}
              {result.bank_info && booking.status === "COMPLETED" && (
                <div className="border-t pt-3 space-y-3 text-start">
                  <div className="flex items-center gap-2 justify-center">
                    <Landmark className="h-5 w-5 text-primary" />
                    <p className="font-bold text-sm text-foreground">ادفع عبر CliQ / تحويل بنكي</p>
                  </div>

                  {result.bank_info.bank_account_holder && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">صاحب الحساب</span>
                      <span className="font-medium">{result.bank_info.bank_account_holder}</span>
                    </div>
                  )}
                  {result.bank_info.bank_name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">البنك</span>
                      <span className="font-medium">{result.bank_info.bank_name}</span>
                    </div>
                  )}
                  {result.bank_info.bank_iban && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">IBAN</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(result.bank_info!.bank_iban!)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs font-mono bg-muted rounded px-2 py-1.5 break-all" dir="ltr">
                        {result.bank_info.bank_iban}
                      </p>
                    </div>
                  )}
                  {result.bank_info.bank_cliq_alias && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">CliQ Alias</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-medium" dir="ltr">{result.bank_info.bank_cliq_alias}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(result.bank_info!.bank_cliq_alias!)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    يرجى ذكر رقم الحجز في ملاحظات التحويل
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TrackOrderPage;
