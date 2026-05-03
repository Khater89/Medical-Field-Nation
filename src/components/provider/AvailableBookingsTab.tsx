import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays, MapPin, FileText, Send, Loader2, DollarSign, CheckCircle,
  Zap, Siren, Navigation,
} from "lucide-react";

interface AvailableBooking {
  id: string;
  service_id: string;
  city: string;
  scheduled_at: string;
  booking_number: string | null;
  area_public: string | null;
  notes: string | null;
  created_at: string;
  payment_method: string | null;
  is_emergency: boolean;
  distance_km: number | null;
}

interface Props {
  serviceNames: Record<string, string>;
  onAssigned?: () => void;
}

const AvailableBookingsTab = ({ serviceNames, onAssigned }: Props) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<AvailableBooking[]>([]);
  const [myQuotes, setMyQuotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: available } = await supabase.rpc("available_bookings_for_providers" as any);
    setBookings((available as unknown as AvailableBooking[]) || []);

    const { data: quotes } = await supabase
      .from("provider_quotes" as any)
      .select("booking_id, quoted_price")
      .eq("provider_id", user.id);

    const qMap: Record<string, number> = {};
    (quotes as any[] || []).forEach((q: any) => { qMap[q.booking_id] = q.quoted_price; });
    setMyQuotes(qMap);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const submitQuote = async (bookingId: string) => {
    if (!user || !quotePrice) return;
    const price = parseFloat(quotePrice);
    if (isNaN(price) || price <= 0) {
      toast.error("يرجى إدخال سعر صحيح");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("provider_quotes" as any).insert({
        booking_id: bookingId,
        provider_id: user.id,
        quoted_price: price,
        note: quoteNote.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("لقد قدمت عرضاً لهذا الطلب مسبقاً");
        } else {
          throw error;
        }
      } else {
        toast.success("تم إرسال عرض السعر بنجاح ✅");
        setMyQuotes((prev) => ({ ...prev, [bookingId]: price }));
        setExpandedId(null);
        setQuotePrice("");
        setQuoteNote("");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const selfAssign = async (bookingId: string) => {
    setClaiming(bookingId);
    try {
      const { data, error } = await supabase.rpc("provider_self_assign" as any, { _booking_id: bookingId });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        const msg =
          res?.error === "already_taken" ? "تم أخذ الطلب من قبل مزود آخر"
          : res?.error === "emergency_only" ? "هذا طلب طوارئ — للمزودين المختصين فقط"
          : res?.error === "standard_only" ? "هذا طلب عادي — لا يمكن لمزود الطوارئ أخذه"
          : "تعذّر إسناد الطلب";
        toast.error(msg);
      } else {
        toast.success("تم إسناد الطلب لك ✅ — تواصل مع العميل");
        await fetchData();
        onAssigned?.();
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">لا توجد طلبات متاحة في منطقتك حالياً</p>
        <p className="text-xs mt-1">ستظهر هنا الطلبات الجديدة المطابقة لتخصصك وموقعك</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{bookings.length} طلب متاح في منطقتك</p>
      {bookings.map((b) => {
        const alreadyQuoted = myQuotes[b.id] !== undefined;
        const isExpanded = expandedId === b.id;
        const isClaiming = claiming === b.id;

        return (
          <Card
            key={b.id}
            className={`overflow-hidden ${b.is_emergency ? "border-destructive/40 ring-1 ring-destructive/20" : ""}`}
          >
            <CardContent className="p-3 space-y-2">
              {b.is_emergency && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">
                  <Siren className="h-3.5 w-3.5 animate-pulse" />
                  طلب طوارئ — الاستجابة الفورية مطلوبة
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{serviceNames[b.service_id] || b.service_id}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{b.city}</span>
                    {b.area_public && <span>• {b.area_public}</span>}
                    {b.distance_km != null && (
                      <span className="flex items-center gap-0.5">
                        <Navigation className="h-3 w-3" />
                        {b.distance_km.toFixed(1)} كم
                      </span>
                    )}
                  </div>
                </div>
                {alreadyQuoted ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {myQuotes[b.id]} JOD
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-info/10 text-info border-info/30">منشور</Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(b.scheduled_at).toLocaleString("ar-JO", {
                    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                {b.booking_number && <span className="text-[10px]">{b.booking_number}</span>}
              </div>

              {b.notes && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{b.notes}</p>
              )}

              {b.payment_method && (
                <div className="flex items-center gap-1.5 text-xs">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">طريقة الدفع:</span>
                  <span className="font-medium">{b.payment_method === "CLIQ" ? "CliQ" : b.payment_method === "APPLE_PAY" ? "Apple Pay (CliQ)" : b.payment_method === "INSURANCE" ? "تأمين طبي" : "نقداً"}</span>
                </div>
              )}

              {!alreadyQuoted && !isExpanded && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    className={`gap-1.5 ${b.is_emergency ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}
                    disabled={isClaiming}
                    onClick={() => selfAssign(b.id)}
                  >
                    {isClaiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    إسناد لنفسي
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { setExpandedId(b.id); setQuotePrice(""); setQuoteNote(""); }}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    تقديم عرض
                  </Button>
                </div>
              )}

              {!alreadyQuoted && isExpanded && (
                <div className="space-y-2 border-t border-border pt-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="السعر (JOD)"
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      className="flex-1"
                      min={1}
                      dir="ltr"
                    />
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={!quotePrice || submitting}
                      onClick={() => submitQuote(b.id)}
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      إرسال
                    </Button>
                  </div>
                  <Textarea
                    placeholder="ملاحظة (اختياري)"
                    value={quoteNote}
                    onChange={(e) => setQuoteNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => setExpandedId(null)}
                  >
                    إلغاء
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AvailableBookingsTab;
