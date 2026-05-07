import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import BookingChat from "@/components/booking/BookingChat";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Search, Loader2, CheckCircle, Circle, Clock,
  MapPin, CalendarDays, Landmark, Copy, AlertTriangle,
  Star, Briefcase, User, Phone, MessageCircle, Languages, Wrench, BadgeCheck,
} from "lucide-react";
import ApplePayButton from "@/components/booking/ApplePayButton";

const COORDINATOR_PHONE = "+962781343144";
const COORDINATOR_WA = "962781343144";

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

const CANCELLABLE_STATUSES = ["NEW", "CONFIRMED", "ASSIGNED", "ACCEPTED"];

interface ProviderInfo {
  provider_id?: string;
  full_name: string | null;
  avatar_url: string | null;
  role_type: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  city: string | null;
  phone: string | null;
  bio: string | null;
  languages: string[] | null;
  tools: string[] | null;
  provider_number: number | null;
  completed_count: number;
  avg_rating: string | null;
  total_ratings: number;
}

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
    payment_status?: string;
    payment_method?: string;
  };
  history: { action: string; created_at: string; note: string | null }[];
  rating: { rating: number; comment: string | null } | null;
  bank_info: {
    bank_name: string | null;
    bank_iban: string | null;
    bank_cliq_alias: string | null;
    bank_account_holder: string | null;
  } | null;
  provider_info: ProviderInfo | null;
  is_provider_late?: boolean;
  late_minutes?: number;
}

const ROLE_LABELS: Record<string, string> = {
  doctor: "طبيب",
  nurse: "ممرض/ة",
  therapist: "معالج/ة",
  midwife: "قابلة",
};

const TrackOrderPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ ✓" });
  };
  const [bookingNumber, setBookingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Rating state
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Payment method state
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);

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
      // If payment already locked, reflect that in state
      const trackData = data as TrackingResult;
      if (trackData.booking.payment_status === "PAYMENT_METHOD_SET") {
        setSelectedPayment(trackData.booking.payment_method || null);
        setPaymentSaved(true);
      }
    } catch {
      toast({ title: "حدث خطأ في الاتصال", variant: "destructive" });
    }
    setLoading(false);
  };

  const canCancel = () => {
    if (!result?.booking) return false;
    const { status, scheduled_at } = result.booking;
    if (!CANCELLABLE_STATUSES.includes(status)) return false;
    const scheduledTime = new Date(scheduled_at).getTime();
    const twoHoursBefore = scheduledTime - 2 * 60 * 60 * 1000;
    return Date.now() < twoHoursBefore;
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-booking", {
        body: { booking_number: bookingNumber.trim(), phone: phone.trim() },
      });

      if (error || data?.error) {
        const reason = data?.reason;
        if (reason === "too_close") {
          toast({ title: "لا يمكن الإلغاء", description: "لا يمكن إلغاء الطلب قبل موعده بأقل من ساعتين", variant: "destructive" });
        } else {
          toast({ title: "لا يمكن إلغاء الطلب في هذه المرحلة", variant: "destructive" });
        }
      } else {
        toast({ title: "تم إلغاء الطلب بنجاح ✓" });
        handleTrack();
      }
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
    setCancelling(false);
    setCancelDialogOpen(false);
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

  const providerInfo = result?.provider_info;

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
          <>
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

                {/* Direct contact — prefer assigned provider; fallback to coordinator */}
                {(() => {
                  const provPhone = providerInfo?.phone?.replace(/[\s\-]/g, "");
                  const useProvider = !!provPhone && !!providerInfo;
                  const callNumber = useProvider ? provPhone! : COORDINATOR_PHONE;
                  const waNumber = useProvider ? provPhone!.replace(/^\+/, "") : COORDINATOR_WA;
                  const label = useProvider
                    ? `للتواصل المباشر مع ${providerInfo!.full_name || "مقدم الخدمة"}:`
                    : "للتواصل المباشر مع المنسق:";
                  const waMsg = useProvider
                    ? `مرحباً، أنا صاحب الحجز رقم ${booking.booking_number}`
                    : `مرحباً، استفسار عن الحجز رقم ${booking.booking_number}`;
                  return (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs font-bold text-foreground">{label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${callNumber}`}
                          className="flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow hover:shadow-md transition-shadow"
                        >
                          <Phone className="h-4 w-4" />
                          اتصال
                        </a>
                        <a
                          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 h-10 rounded-lg bg-[#25D366] text-white font-bold text-sm shadow hover:shadow-md transition-shadow"
                        >
                          <MessageCircle className="h-4 w-4" />
                          واتساب
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {/* Late provider alert */}
                {result.is_provider_late && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">تأخر مقدم الخدمة</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        مقدم الخدمة متأخر عن الموعد المحدد بـ {result.late_minutes} دقيقة. فريقنا يتابع الوضع.
                      </p>
                    </div>
                  </div>
                )}

                {/* Provider Info Card — clickable to open full details */}
                {providerInfo && (
                  <button
                    type="button"
                    onClick={() => setProviderDialogOpen(true)}
                    className="w-full text-right rounded-lg border bg-muted/30 p-4 space-y-3 hover:bg-muted/50 hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">مقدم الخدمة</p>
                      <span className="text-[10px] text-primary font-medium">عرض الملف الكامل ←</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={providerInfo.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{providerInfo.full_name || "مقدم خدمة"}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {providerInfo.role_type && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {ROLE_LABELS[providerInfo.role_type] || providerInfo.role_type}
                            </Badge>
                          )}
                          {providerInfo.experience_years && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Briefcase className="h-2.5 w-2.5" />
                              {providerInfo.experience_years} سنوات خبرة
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {providerInfo.avg_rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="font-medium text-foreground">{providerInfo.avg_rating}</span>
                          <span>({providerInfo.total_ratings} تقييم)</span>
                        </span>
                      )}
                      {providerInfo.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {providerInfo.city}
                        </span>
                      )}
                    </div>

                    {providerInfo.specialties && providerInfo.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {providerInfo.specialties.slice(0, 4).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            {s}
                          </Badge>
                        ))}
                        {providerInfo.specialties.length > 4 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            +{providerInfo.specialties.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                )}

                {/* Booking Chat — visible to all (guests use booking_number + phone) */}
                {booking.id && !isCancelled && (
                  <div className="border-t pt-4 -mx-2">
                    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-3 shadow-sm">
                      <div className="flex items-start gap-2 mb-3 px-1">
                        <div className="relative shrink-0 mt-0.5">
                          <MessageCircle className="h-5 w-5 text-primary" />
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-success ring-2 ring-background animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">
                            💬 محادثة مباشرة مع المزودين
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            هنا يتواصل معك المزودون المهتمون بطلبك ويرسلون عروض الأسعار مباشرة — لا حاجة لإنشاء حساب، فقط رقم الحجز والهاتف.
                          </p>
                        </div>
                      </div>
                      <BookingChat
                        bookingId={booking.id}
                        viewerRole="customer"
                        viewerId={user?.id || booking.id}
                        guestMode={{ bookingNumber: bookingNumber.trim(), phone: phone.trim() }}
                        canAssign={booking.status === "NEW"}
                        onAssigned={() => handleTrack()}
                      />
                    </div>
                  </div>
                )}

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

                {/* Payment Method Selection - after COMPLETED */}
                {booking.status === "COMPLETED" && (
                  <div className="border-t pt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" />
                      <p className="text-sm font-bold">اختر طريقة الدفع</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: "CASH", label: "💵 نقداً", desc: "يُسلم للمزود مباشرة" },
                        { value: "INSURANCE", label: "🏥 تأمين", desc: "عبر بوليصة التأمين" },
                        { value: "CLIQ", label: "📱 CliQ", desc: "تحويل لحساب المنصة" },
                      ].map((pm) => (
                        <button
                          key={pm.value}
                          onClick={() => !paymentSaved && setSelectedPayment(pm.value)}
                          disabled={paymentSaved}
                          className={`p-3 rounded-lg border text-center transition-all min-h-[68px] flex flex-col items-center justify-center gap-1 ${
                            selectedPayment === pm.value
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : paymentSaved ? "opacity-50 border-border" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="text-base block leading-none">{pm.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-none">{pm.desc}</span>
                        </button>
                      ))}
                      <ApplePayButton
                        variant="option"
                        selected={selectedPayment === "APPLE_PAY"}
                        disabled={paymentSaved}
                        onClick={() => !paymentSaved && setSelectedPayment("APPLE_PAY")}
                      />
                    </div>
                    {!paymentSaved ? (
                      <Button
                        size="sm"
                        disabled={!selectedPayment || savingPayment}
                        className="w-full gap-1.5"
                        onClick={async () => {
                          if (!selectedPayment) return;
                          setSavingPayment(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("track-booking-payment", {
                              body: {
                                booking_number: bookingNumber.trim(),
                                phone: phone.trim(),
                                payment_method: selectedPayment,
                              },
                            });
                            if (error || data?.error) {
                              toast({ title: "حدث خطأ في حفظ طريقة الدفع", variant: "destructive" });
                            } else {
                              setPaymentSaved(true);
                              toast({ title: "تم حفظ طريقة الدفع ✅" });
                            }
                          } catch {
                            toast({ title: "حدث خطأ", variant: "destructive" });
                          }
                          setSavingPayment(false);
                        }}
                      >
                        {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        تأكيد طريقة الدفع
                      </Button>
                    ) : (
                      <p className="text-xs text-center text-success font-medium">✅ تم حفظ طريقة الدفع</p>
                    )}
                  </div>
                )}

                {/* Rating display or form */}
                {result.rating ? (
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
                ) : booking.status === "COMPLETED" && !ratingSubmitted ? (
                  <div className="border-t pt-3 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground">قيّم مقدم الخدمة</p>
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setRatingValue(s)}
                          className={`text-2xl transition-colors ${s <= ratingValue ? "text-warning" : "text-muted-foreground/20"} hover:text-warning`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    {ratingValue > 0 && (
                      <>
                        <textarea
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          placeholder="اكتب ملاحظاتك (اختياري)..."
                          className="w-full rounded-lg border border-border bg-background p-2 text-sm resize-none"
                          rows={2}
                        />
                        <Button
                          className="w-full gap-1.5"
                          size="sm"
                          disabled={submittingRating}
                          onClick={async () => {
                            setSubmittingRating(true);
                            try {
                              const { data, error } = await supabase.functions.invoke("submit-rating", {
                                body: {
                                  booking_number: bookingNumber.trim(),
                                  phone: phone.trim(),
                                  rating: ratingValue,
                                  comment: ratingComment.trim() || null,
                                },
                              });
                              if (error || data?.error) {
                                toast({ title: "حدث خطأ في إرسال التقييم", variant: "destructive" });
                              } else {
                                setRatingSubmitted(true);
                                toast({ title: "شكراً لتقييمك! ✨" });
                              }
                            } catch {
                              toast({ title: "حدث خطأ", variant: "destructive" });
                            }
                            setSubmittingRating(false);
                          }}
                        >
                          {submittingRating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                          إرسال التقييم
                        </Button>
                      </>
                    )}
                  </div>
                ) : ratingSubmitted ? (
                  <div className="border-t pt-3 text-center">
                    <p className="text-sm text-success font-medium">✅ شكراً لتقييمك!</p>
                  </div>
                ) : null}

                {/* Bank Payment Info - shown after COMPLETED when CLIQ or APPLE_PAY selected */}
                {result.bank_info && booking.status === "COMPLETED" && (selectedPayment === "CLIQ" || selectedPayment === "APPLE_PAY" || paymentSaved) && (
                  <div className="border-t pt-3 space-y-3 text-start">
                    <div className="flex items-center gap-2 justify-center">
                      <Landmark className="h-5 w-5 text-primary" />
                      <p className="font-bold text-sm text-foreground">
                        {selectedPayment === "APPLE_PAY"
                          ? "ادفع عبر Apple Pay → CliQ"
                          : "ادفع عبر CliQ / تحويل بنكي"}
                      </p>
                    </div>
                    {selectedPayment === "APPLE_PAY" && (
                      <p className="text-xs text-muted-foreground text-center leading-relaxed bg-muted/40 rounded-lg p-2.5">
                        افتح <strong>Apple Wallet</strong> على جهازك، اختر بطاقتك البنكية الأردنية المسجّلة في CliQ، ثم حوّل المبلغ إلى الـ Alias أدناه.
                      </p>
                    )}
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

            {/* Cancel - subtle text link at the bottom */}
            {canCancel() && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setCancelDialogOpen(true)}
                  className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors underline underline-offset-2"
                >
                  هل تريد إلغاء هذا الطلب؟
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إلغاء الطلب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "إلغاء الطلب"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Provider Full Details Dialog */}
      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-y-auto">
          {providerInfo && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">الملف الكامل لمقدم الخدمة</DialogTitle>
                <DialogDescription className="text-xs">
                  معلومات تفصيلية عن مقدم الخدمة المعيّن لطلبك
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16 border-2 border-primary/30">
                    <AvatarImage src={providerInfo.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-7 w-7" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-base truncate">{providerInfo.full_name || "مقدم خدمة"}</p>
                      <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                    </div>
                    {providerInfo.role_type && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {ROLE_LABELS[providerInfo.role_type] || providerInfo.role_type}
                      </Badge>
                    )}
                    {providerInfo.provider_number != null && (
                      <p className="text-[10px] text-muted-foreground mt-1" dir="ltr">
                        ID #{providerInfo.provider_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border bg-muted/30 p-2">
                    <p className="text-base font-bold text-primary">
                      {providerInfo.avg_rating || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">التقييم</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-2">
                    <p className="text-base font-bold text-primary">
                      {providerInfo.completed_count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">طلب مكتمل</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-2">
                    <p className="text-base font-bold text-primary">
                      {providerInfo.experience_years ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">سنوات خبرة</p>
                  </div>
                </div>

                {/* Bio */}
                {providerInfo.bio && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">نبذة عن مقدم الخدمة</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{providerInfo.bio}</p>
                  </div>
                )}

                {/* Specialties */}
                {providerInfo.specialties && providerInfo.specialties.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">التخصصات</p>
                    <div className="flex flex-wrap gap-1.5">
                      {providerInfo.specialties.map((s) => (
                        <Badge key={s} variant="outline" className="text-[11px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {providerInfo.languages && providerInfo.languages.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Languages className="h-3 w-3" /> اللغات
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {providerInfo.languages.map((l) => (
                        <Badge key={l} variant="secondary" className="text-[11px]">{l}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools */}
                {providerInfo.tools && providerInfo.tools.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> الأدوات والمعدات
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {providerInfo.tools.map((t) => (
                        <Badge key={t} variant="outline" className="text-[11px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                {providerInfo.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {providerInfo.city}
                  </div>
                )}

                {/* Contact buttons */}
                {providerInfo.phone && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <a
                      href={`tel:${providerInfo.phone}`}
                      className="flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm"
                    >
                      <Phone className="h-4 w-4" /> اتصال مباشر
                    </a>
                    <a
                      href={`https://wa.me/${providerInfo.phone.replace(/[\s\-+]/g, "")}?text=${encodeURIComponent(`مرحباً، أنا صاحب الحجز رقم ${booking?.booking_number || ""}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 h-11 rounded-lg bg-[#25D366] text-white font-bold text-sm"
                    >
                      <MessageCircle className="h-4 w-4" /> واتساب
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrackOrderPage;
