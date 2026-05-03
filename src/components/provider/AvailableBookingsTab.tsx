import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, FileText, Loader2, DollarSign, CheckCircle,
  Zap, Siren, Navigation, Users, MessageSquareQuote, MessageCircle,
} from "lucide-react";
import BookingChat from "@/components/booking/BookingChat";

interface AvailableBooking {
  id: string;
  service_id: string;
  service_name: string | null;
  city: string;
  scheduled_at: string;
  booking_number: string | null;
  area_public: string | null;
  notes: string | null;
  created_at: string;
  payment_method: string | null;
  is_emergency: boolean;
  distance_km: number | null;
  base_price: number | null;
  viewer_count: number | null;
  quote_count: number | null;
}

interface Props {
  serviceNames: Record<string, string>;
  onAssigned?: () => void;
}

const AvailableBookingsTab = ({ serviceNames, onAssigned }: Props) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<AvailableBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [reserving, setReserving] = useState<string | null>(null);
  const [agreementFor, setAgreementFor] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.rpc("available_bookings_for_providers" as any);
    setBookings((data as unknown as AvailableBooking[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Step 1: reserve (soft claim — opens agreement modal)
  const reserve = async (bookingId: string) => {
    setReserving(bookingId);
    try {
      const { data, error } = await supabase.rpc("provider_reserve_booking" as any, { _booking_id: bookingId });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        const msg =
          res?.error === "already_assigned" ? "تم تعيين الطلب لمزود آخر"
          : res?.error === "already_reserved" ? "هناك مزود آخر يقوم بتأكيد الموافقة الآن"
          : res?.error === "emergency_only" ? "هذا طلب طوارئ — للمزودين المختصين فقط"
          : res?.error === "standard_only" ? "هذا طلب عادي — لا يمكن لمزود الطوارئ أخذه"
          : "تعذّر الحجز";
        toast.error(msg);
      } else {
        setAgreementFor(bookingId);
      }
    } catch (e: any) {
      toast.error(e.message || "خطأ");
    } finally { setReserving(null); }
  };

  // Step 2: confirm agreement -> ACCEPTED
  const confirmAgreement = async () => {
    if (!agreementFor) return;
    setConfirming(true);
    try {
      const { data, error } = await supabase.rpc("provider_confirm_agreement" as any, { _booking_id: agreementFor });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        toast.error(res?.error || "تعذّر التأكيد");
      } else {
        toast.success("تمت الموافقة — الطلب الآن في خانة المقبولة ✅");
        setAgreementFor(null);
        await fetchData();
        onAssigned?.();
      }
    } catch (e: any) {
      toast.error(e.message || "خطأ");
    } finally { setConfirming(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">لا توجد طلبات متاحة حالياً</p>
        <p className="text-xs mt-1">ستظهر هنا جميع الطلبات الجديدة فور وصولها</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{bookings.length} طلب متاح — جميع الطلبات معروضة لجميع المزودين</p>
        {bookings.map((b) => {
          const isExpanded = openChat === b.id;
          const isReserving = reserving === b.id;
          const serviceName = b.service_name || serviceNames[b.service_id] || b.service_id;

          return (
            <Card key={b.id} className={`overflow-hidden ${b.is_emergency ? "border-destructive/40 ring-1 ring-destructive/20" : ""}`}>
              <CardContent className="p-3 space-y-2">
                {b.is_emergency && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">
                    <Siren className="h-3.5 w-3.5 animate-pulse" />
                    طلب طوارئ — الاستجابة الفورية مطلوبة
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{serviceName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{b.city}</span>
                      {b.area_public && <span>• {b.area_public}</span>}
                      {b.distance_km != null && (
                        <span className="flex items-center gap-0.5"><Navigation className="h-3 w-3" />{b.distance_km.toFixed(1)} كم</span>
                      )}
                    </div>
                  </div>
                  {b.base_price != null && b.base_price > 0 && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <DollarSign className="h-3 w-3" />
                      السعر الافتراضي: {b.base_price} JOD
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-0.5">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(b.scheduled_at).toLocaleString("ar-JO", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {b.booking_number && <span className="text-[10px]">{b.booking_number}</span>}
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{b.viewer_count || 0} مزود مطّلع</span>
                  <span className="flex items-center gap-0.5"><MessageSquareQuote className="h-3 w-3" />{b.quote_count || 0} عرض</span>
                </div>

                {b.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{b.notes}</p>}

                {b.payment_method && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">طريقة الدفع:</span>
                    <span className="font-medium">{b.payment_method === "CLIQ" ? "CliQ" : b.payment_method === "APPLE_PAY" ? "Apple Pay (CliQ)" : b.payment_method === "INSURANCE" ? "تأمين طبي" : "نقداً"}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    className={`gap-1.5 ${b.is_emergency ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}
                    disabled={isReserving}
                    onClick={() => reserve(b.id)}
                  >
                    {isReserving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    إسناد لنفسي
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setOpenChat(isExpanded ? null : b.id)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {isExpanded ? "إغلاق المحادثة" : "محادثة وعرض"}
                  </Button>
                </div>

                {isExpanded && user && (
                  <div className="pt-2">
                    <BookingChat
                      bookingId={b.id}
                      viewerRole="provider"
                      viewerId={user.id}
                      allowQuote
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!agreementFor} onOpenChange={(o) => !o && setAgreementFor(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>اتفاقية تنفيذ الطلب</AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-2 text-sm">
              بإسنادك هذا الطلب لنفسك، أنت توافق على:
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>الالتزام بالموعد المحدد للخدمة</li>
                <li>تقديم الخدمة وفق المعايير الطبية والمهنية</li>
                <li>سداد عمولة المنصة من قيمة الطلب</li>
                <li>المسؤولية الكاملة عن جودة الخدمة المقدمة</li>
                <li>التواصل المهني مع العميل عبر القنوات الرسمية</li>
              </ul>
              <p className="mt-3 font-semibold text-foreground">
                بالموافقة سيتم نقل الطلب إلى خانة "المقبولة" فوراً.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAgreement} disabled={confirming}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "موافق وأقبل الطلب"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AvailableBookingsTab;
