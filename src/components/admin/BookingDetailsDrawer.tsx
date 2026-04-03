import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CalendarDays, MapPin, Phone, User, UserCheck,
  MessageCircle, FileText, StickyNote, Ban, Loader2, ClipboardCheck, X, Lock, Play,
  Key, Copy, History, ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrderWorkflowPhases from "./OrderWorkflowPhases";
import BroadcastProvidersDialog from "./BroadcastProvidersDialog";
import ProviderQuotesSection from "./ProviderQuotesSection";

export interface BookingRow {
  id: string;
  booking_number: string | null;
  customer_display_name: string | null;
  city: string;
  client_lat: number | null;
  client_lng: number | null;
  scheduled_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  platform_fee: number;
  provider_payout: number;
  agreed_price: number | null;
  provider_share: number | null;
  deal_confirmed_at: string | null;
  deal_confirmed_by: string | null;
  internal_note: string | null;
  notes: string | null;
  assigned_provider_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  created_at: string;
  service_id: string;
  close_out_note: string | null;
  close_out_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  reject_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  client_address_text?: string | null;
  area_public?: string | null;
  otp_code?: string | null;
  check_in_at?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-info/10 text-info border-info/30",
  CONFIRMED: "bg-primary/20 text-primary border-primary/30",
  ASSIGNED: "bg-warning/10 text-warning border-warning/30",
  ACCEPTED: "bg-success/10 text-success border-success/30",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/30",
  COMPLETED: "bg-success text-success-foreground",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props {
  booking: BookingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  servicePrice?: number | null;
  providerName: string | null;
  providerPhone?: string | null;
  onStatusChange?: () => void;
  onDataRefresh?: () => void;
}

const InfoRow = ({ icon: Icon, label, value, dir }: { icon: any; label: string; value: string | null | undefined; dir?: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground text-xs">{label}</span>
        <p className="font-medium" dir={dir}>{value}</p>
      </div>
    </div>
  );
};

const CONTRACT_TEXT = `عقد تنفيذ المهمة — إخلاء مسؤولية طبية

المادة 1: طبيعة المنصة
تعمل منصة MFN كوسيط تنسيق فقط بين العميل ومقدم الخدمة الصحية المنزلية. لا تقدم المنصة أي تشخيص أو علاج أو استشارة طبية مباشرة.

المادة 2: المسؤولية المهنية
يتحمل مقدم الخدمة كامل المسؤولية المهنية والقانونية عن جودة الخدمات المقدمة، بما يشمل الأخطاء الطبية، والإهمال المهني، وأي أضرار مباشرة أو غير مباشرة تلحق بالعميل.

المادة 3: إخلاء مسؤولية المنصة
تُخلي المنصة مسؤوليتها الكاملة عن أي أخطاء طبية، مضاعفات صحية، أو حوادث ناتجة عن الخدمات المقدمة، وتقع المسؤولية حصرياً على مقدم الخدمة المعتمد.

المادة 4: نموذج التسعير والأجور
• السعر الأساسي: هو المبلغ المتفق عليه مسبقاً للساعة الأولى من الخدمة.
• الوقت الإضافي: يُحتسب بنسبة 8% من السعر الأساسي عن كل 15 دقيقة إضافية بعد الساعة الأولى.
• حصة المزود: هي المبلغ المتفق عليه والمحدد في تفاصيل كل طلب.
• رسوم المنصة: الفرق بين السعر المتفق عليه مع العميل وحصة المزود.

المادة 5: الالتزامات العامة
يلتزم مقدم الخدمة بالحضور في الموعد المحدد، وتقديم الخدمة بأعلى معايير المهنية، والتعامل مع بيانات العملاء بسرية تامة.`;

const BookingDetailsDrawer = ({ booking, open, onOpenChange, serviceName, servicePrice, providerName, providerPhone, onStatusChange, onDataRefresh }: Props) => {
  const { t, formatCurrency, formatDate, formatDateTime, formatDateShort } = useLanguage();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [reopenExpired, setReopenExpired] = useState(false);
  const [reopenTimeLeft, setReopenTimeLeft] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [coordinatorPhone, setCoordinatorPhone] = useState<string | null>(null);
  const [preSelectedProviderId, setPreSelectedProviderId] = useState<string | null>(null);
  const [preSelectedProviderShare, setPreSelectedProviderShare] = useState<number | null>(null);

  // Fetch coordinator phone
  useEffect(() => {
    supabase.from("platform_settings").select("coordinator_phone").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setCoordinatorPhone((data as any).coordinator_phone);
    });
  }, []);

  // Fetch booking history
  useEffect(() => {
    if (!booking || !open) { setHistory([]); return; }
    const fetchHistory = async () => {
      const { data } = await supabase.from("booking_history").select("*").eq("booking_id", booking.id).order("created_at", { ascending: true });
      setHistory(data || []);
    };
    fetchHistory();
  }, [booking?.id, open]);

  // 10-minute reopen timer for staff-cancelled bookings
  useEffect(() => {
    if (!booking || booking.status !== "CANCELLED" || !open) {
      setReopenExpired(false);
      setReopenTimeLeft("");
      return;
    }

    // Find cancellation entry by staff (not customer)
    const staffCancel = history.find(
      (h) => h.action === "CANCELLED" && h.performer_role !== "customer"
    );

    if (!staffCancel) {
      setReopenExpired(false);
      return;
    }

    const cancelledAt = new Date(staffCancel.created_at).getTime();
    const expiresAt = cancelledAt + 10 * 60 * 1000; // 10 minutes

    const checkExpiry = () => {
      const now = Date.now();
      if (now >= expiresAt) {
        setReopenExpired(true);
        setReopenTimeLeft("");
        return true;
      }
      const remaining = Math.ceil((expiresAt - now) / 1000);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setReopenTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
      setReopenExpired(false);
      return false;
    };

    if (checkExpiry()) return;

    const interval = setInterval(() => {
      if (checkExpiry()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [booking?.id, booking?.status, open, history]);

  const handleCancel = async () => {
    if (!booking || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "CANCELLED" })
        .eq("id", booking.id);
      if (updateError) throw updateError;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", authUser!.id);
      const roles = (rolesData || []).map((r: any) => r.role);
      const performerRole = roles.includes("admin") ? "admin" : roles.includes("cs") ? "cs" : "admin";
      await supabase.from("booking_history").insert({
        booking_id: booking.id,
        action: "CANCELLED",
        performed_by: authUser!.id,
        performer_role: performerRole,
        note: cancelReason.trim(),
      });

      toast.success(t("booking.details.cancelled_success") || "تم إلغاء الطلب");
      setCancelDialogOpen(false);
      setCancelReason("");
      onOpenChange(false);
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setCancelling(false);
    }
  };

  const handleReopen = async () => {
    if (!booking) return;
    setReopening(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "NEW",
          assigned_provider_id: null,
          assigned_at: null,
          assigned_by: null,
          accepted_at: null,
          rejected_at: null,
          rejected_by: null,
          reject_reason: null,
          agreed_price: null,
          provider_share: null,
          deal_confirmed_at: null,
          deal_confirmed_by: null,
        } as any)
        .eq("id", booking.id);
      if (error) throw error;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      await supabase.from("booking_history").insert({
        booking_id: booking.id,
        action: "REOPENED",
        performed_by: authUser!.id,
        performer_role: "admin",
        note: "تم إعادة فتح الطلب",
      });

      toast.success("تم إعادة فتح الطلب بنجاح");
      onOpenChange(false);
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setReopening(false);
    }
  };

  const handleUnassign = async () => {
    if (!booking) return;
    if (!confirm("هل أنت متأكد من إلغاء إسناد المزود؟ سيتم إعادة الطلب لحالة جديد.")) return;
    setUnassigning(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "NEW",
          assigned_provider_id: null,
          assigned_at: null,
          assigned_by: null,
          accepted_at: null,
          rejected_at: null,
          rejected_by: null,
          reject_reason: null,
        } as any)
        .eq("id", booking.id);
      if (error) throw error;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      await supabase.from("booking_history").insert({
        booking_id: booking.id,
        action: "UNASSIGNED",
        performed_by: authUser!.id,
        performer_role: "admin",
        note: `تم إلغاء إسناد المزود: ${providerName || "غير معروف"}`,
      });

      toast.success("تم إلغاء الإسناد — يمكنك الآن إسناد مزود آخر");
      onOpenChange(false);
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setUnassigning(false);
    }
  };

  if (!booking) return null;

  const showWorkflow = booking.status === "NEW" || booking.status === "REJECTED" || (booking.status === "ASSIGNED" && !booking.accepted_at);
  const profit = (booking.agreed_price != null && booking.provider_share != null)
    ? booking.agreed_price - booking.provider_share : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">{t("booking.details.title")}</SheetTitle>
          <SheetDescription dir="ltr" className="text-xs">
            {booking.booking_number || booking.id.slice(0, 8)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status & Service */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{serviceName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("booking.details.created")} {formatDate(booking.created_at)}
              </p>
            </div>
            <Badge variant="outline" className={STATUS_COLORS[booking.status] || ""}>
              {t(`status.${booking.status}`)}
            </Badge>
          </div>

          {/* Broadcast to providers button - only for NEW bookings */}
          {booking.status === "NEW" && (
            <Button
              variant="outline"
              className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setBroadcastOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              بث الطلب لجميع المزودين
            </Button>
          )}

          {/* Provider Quotes */}
          <ProviderQuotesSection
            bookingId={booking.id}
            onSelectQuote={(providerId, quotedPrice) => {
              setPreSelectedProviderId(providerId);
              setPreSelectedProviderShare(quotedPrice);
            }}
            onDirectAssign={showWorkflow ? async (providerId, providerNameVal, quotedPrice) => {
              // Direct assign from quote
              try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) return;
                const { error } = await supabase
                  .from("bookings")
                  .update({
                    status: "ASSIGNED",
                    assigned_provider_id: providerId,
                    assigned_at: new Date().toISOString(),
                    assigned_by: authUser.id,
                    agreed_price: quotedPrice,
                    provider_share: quotedPrice,
                  })
                  .eq("id", booking.id);
                if (error) throw error;

                await supabase.from("booking_history").insert({
                  booking_id: booking.id,
                  action: "ASSIGNED",
                  performed_by: authUser.id,
                  performer_role: "admin",
                  note: `إسناد مباشر من عرض السعر — ${providerNameVal} بسعر ${quotedPrice} JOD`,
                });

                // Notify other providers who quoted
                const { data: otherQuotes } = await supabase
                  .from("provider_quotes" as any)
                  .select("provider_id")
                  .eq("booking_id", booking.id)
                  .neq("provider_id", providerId);

                if (otherQuotes && otherQuotes.length > 0) {
                  const notifications = (otherQuotes as any[]).map((q: any) => ({
                    title: "📋 تم إسناد الطلب لمزود آخر",
                    body: `تم إسناد الطلب ${booking.booking_number || ""} لمزود آخر لمطابقته مع تفاصيل الطلب ولتقديمه عرض سعر منافس.`,
                    target_role: "provider",
                    provider_id: q.provider_id,
                    booking_id: booking.id,
                  }));
                  await supabase.from("staff_notifications").insert(notifications);
                }

                toast.success(`تم إسناد الطلب لـ ${providerNameVal} بنجاح ✅`);
                onOpenChange(false);
                onStatusChange?.();
              } catch (err: any) {
                toast.error(err.message || "حدث خطأ أثناء الإسناد");
              }
            } : undefined}
          />

          {/* Client Info */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("booking.details.client_info")}</h4>
            <InfoRow icon={User} label={t("booking.details.client_name")} value={booking.customer_name} />
            <InfoRow icon={Phone} label={t("booking.details.client_phone")} value={booking.customer_phone} dir="ltr" />
            <InfoRow icon={MapPin} label={t("booking.details.client_city")} value={booking.city} />
            <InfoRow icon={MapPin} label={t("booking.details.client_address")} value={booking.client_address_text} />
            {booking.client_lat && booking.client_lng && (
              <p className="text-xs text-muted-foreground" dir="ltr">📍 {booking.client_lat}, {booking.client_lng}</p>
            )}
          </div>

          {/* Schedule */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("booking.details.schedule")}</h4>
            <InfoRow icon={CalendarDays} label={t("booking.details.service_date")} value={formatDateTime(booking.scheduled_at)} />
          </div>

          {/* Financials (Spread Model) */}
          {(booking.agreed_price != null || booking.provider_share != null) && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("booking.details.financials")}</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">{t("workflow.phase1.client_price")}</span>
                  <p className="font-bold">{booking.agreed_price != null ? formatCurrency(booking.agreed_price) : "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t("workflow.phase1.provider_share")}</span>
                  <p className="font-bold">{booking.provider_share != null ? formatCurrency(booking.provider_share) : "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">{t("workflow.phase1.platform_profit")}</span>
                  <p className={`font-bold ${profit != null && profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {profit != null ? formatCurrency(profit) : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Assignment Info */}
          {booking.assigned_provider_id && (
            <div className="rounded-lg border border-success/20 bg-success/5 p-3 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("booking.details.assignment")}</h4>
              <InfoRow icon={UserCheck} label={t("booking.details.provider")} value={providerName || t("booking.details.provider")} />
              {providerPhone && (
                <div className="flex items-center gap-2">
                  <InfoRow icon={Phone} label="هاتف المزود" value={providerPhone} dir="ltr" />
                  <a href={`tel:${providerPhone}`}>
                    <Button size="sm" variant="outline" className="gap-1 h-6 text-[10px]">
                      <Phone className="h-3 w-3" /> اتصال
                    </Button>
                  </a>
                  <a href={`https://wa.me/${providerPhone.replace(/^0/, "962")}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1 h-6 text-[10px]">
                      <MessageCircle className="h-3 w-3" /> واتساب
                    </Button>
                  </a>
                </div>
              )}
              {booking.assigned_by && (
                <p className="text-xs text-muted-foreground">{t("booking.details.assigned_by")}: {booking.assigned_by}</p>
              )}
              {booking.assigned_at && (
                <p className="text-xs text-muted-foreground">{t("booking.details.assigned_date")}: {formatDateShort(booking.assigned_at)}</p>
              )}

              {/* Waiting for acceptance indicator */}
              {booking.status === "ASSIGNED" && !booking.accepted_at && (
                <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 rounded-lg p-2 mt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  بانتظار قبول المزود...
                </div>
              )}

              {booking.accepted_at && (
                <p className="text-xs text-success">✅ {t("booking.details.accepted_date")}: {formatDateShort(booking.accepted_at)}</p>
              )}

              {/* Unassign button - allowed in ASSIGNED and ACCEPTED, blocked in IN_PROGRESS */}
              {(booking.status === "ASSIGNED" || booking.status === "ACCEPTED") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={handleUnassign}
                  disabled={unassigning}
                >
                  {unassigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  إلغاء الإسناد وتعيين مزود آخر
                </Button>
              )}
               {booking.status === "IN_PROGRESS" && (
                <div className="space-y-2 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                    <Lock className="h-3.5 w-3.5" />
                    لا يمكن تغيير المزود أثناء تنفيذ الخدمة
                  </div>
                  {/* OTP Code Display */}
                  {booking.otp_code && (
                    <div className="rounded-lg border-2 border-warning/40 bg-warning/5 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-warning">
                        <Key className="h-3.5 w-3.5" /> كود إنهاء الخدمة
                      </div>
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-warning/10 py-3">
                        <span className="text-2xl font-bold tracking-[0.4em] text-warning" dir="ltr">{booking.otp_code}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7 text-xs flex-1"
                          onClick={() => {
                            navigator.clipboard.writeText(booking.otp_code!);
                            toast.success(`تم نسخ الكود: ${booking.otp_code}`);
                          }}
                        >
                          <Copy className="h-3 w-3" /> نسخ الكود
                        </Button>
                        {booking.customer_phone && (
                          <a
                            href={`https://wa.me/${(booking.customer_phone).replace(/^0/, "962")}?text=${encodeURIComponent(`مرحباً ${booking.customer_name || ""}، كود تأكيد إنهاء الخدمة هو: *${booking.otp_code}*\nيرجى إعطاء هذا الكود لمقدم الخدمة عند الانتهاء.`)}`}
                            target="_blank" rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                              <MessageCircle className="h-3 w-3" /> إرسال واتساب
                            </Button>
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        تواصل مع العميل للتأكيد ثم زوّده بالكود
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <FileText className="h-3 w-3" /> {t("booking.details.client_notes")}
              </div>
              <p className="text-sm">{booking.notes}</p>
            </div>
          )}

          {booking.internal_note && (
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-warning">
                <StickyNote className="h-3 w-3" /> {t("booking.details.internal_note")}
              </div>
              <p className="text-sm">{booking.internal_note}</p>
            </div>
          )}

          {/* Close-out Note */}
          {booking.status === "COMPLETED" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <ClipboardCheck className="h-3 w-3" /> {t("booking.details.close_out_note") || "ملاحظة الإغلاق"}
              </div>
              {booking.close_out_note ? (
                <>
                  <p className="text-sm">{booking.close_out_note}</p>
                  {booking.close_out_at && <p className="text-[10px] text-muted-foreground">{formatDateShort(booking.close_out_at)}</p>}
                </>
              ) : (
                <p className="text-xs text-warning">⚠️ {t("booking.details.no_close_out_note") || "لا توجد ملاحظة إغلاق"}</p>
              )}
            </div>
          )}

          {/* Booking History Timeline */}
          {history.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <History className="h-3 w-3" /> سجل الطلب
              </h4>
              {history.map((h: any) => (
                <div key={h.id} className="flex items-start gap-2 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    h.action === "ACCEPTED" ? "bg-success" :
                    h.action === "CONTRACT_ACCEPTED" ? "bg-primary" :
                    h.action === "CHECK_IN" ? "bg-primary" :
                    h.action === "CHECK_OUT" ? "bg-warning" :
                    h.action === "COMPLETED" ? "bg-success" :
                    h.action === "CANCELLED" ? "bg-destructive" :
                    h.action === "REJECTED" ? "bg-destructive" :
                    h.action === "REOPENED" ? "bg-info" :
                    h.action === "UNASSIGNED" ? "bg-warning" : "bg-muted-foreground"
                  }`} />
                  <div>
                    <span className="font-medium">{
                      h.action === "ASSIGNED" ? "📋 إسناد" :
                      h.action === "ACCEPTED" ? "✅ قبول" :
                      h.action === "CONTRACT_ACCEPTED" ? "📝 قبول العقد" :
                      h.action === "CHECK_IN" ? "▶️ بدء الخدمة" :
                      h.action === "CHECK_OUT" ? "⏹ إنهاء الخدمة" :
                      h.action === "COMPLETED" ? "✅ إكمال" :
                      h.action === "CANCELLED" ? "❌ إلغاء" :
                      h.action === "REJECTED" ? "↩️ رفض" :
                      h.action === "REOPENED" ? "🔄 إعادة فتح" :
                      h.action === "UNASSIGNED" ? "🔄 إلغاء إسناد" : h.action
                    }</span>
                    {h.action === "CONTRACT_ACCEPTED" && (
                      <button
                        onClick={() => setContractDialogOpen(true)}
                        className="inline-flex items-center gap-0.5 ms-1 text-[9px] bg-primary/10 text-primary border border-primary/30 rounded-full px-1.5 py-0.5 hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="h-2.5 w-2.5" /> عرض نص العقد الموقّع
                      </button>
                    )}
                    {h.note && <span className="text-muted-foreground ms-1">— {h.note}</span>}
                    <p className="text-[10px] text-muted-foreground" dir="ltr">{new Date(h.created_at).toLocaleString("ar-JO")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ Phased Workflow for NEW / pre-accepted ASSIGNED bookings ═══ */}
          {showWorkflow && (
            <OrderWorkflowPhases
              booking={booking}
              serviceName={serviceName}
              servicePrice={servicePrice ?? null}
              onWorkflowChange={() => {
                onOpenChange(false);
                onStatusChange?.();
              }}
              onDataRefresh={onDataRefresh}
              preSelectedProviderId={preSelectedProviderId}
              preSelectedProviderShare={preSelectedProviderShare}
            />
          )}

          {/* Actions for non-workflow bookings */}
          {!showWorkflow && (
            <div className="flex gap-2 pt-2 flex-wrap">
              {booking.status === "CANCELLED" && (
                <div className="flex-1 space-y-1">
                  <Button
                    variant="outline"
                    className={`w-full gap-1.5 ${reopenExpired ? "opacity-50 cursor-not-allowed" : "border-success/30 text-success hover:bg-success/10"}`}
                    onClick={handleReopen}
                    disabled={reopening || reopenExpired}
                  >
                    {reopening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {reopenExpired ? "انتهت مهلة إعادة الفتح" : "إعادة فتح الطلب"}
                  </Button>
                  {reopenTimeLeft && !reopenExpired && (
                    <p className="text-[10px] text-center text-warning">⏳ متبقي {reopenTimeLeft} لإعادة الفتح</p>
                  )}
                  {reopenExpired && (
                    <p className="text-[10px] text-center text-destructive">انتهت مهلة 10 دقائق — لا يمكن إعادة الفتح</p>
                  )}
                </div>
              )}
              {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                <Button variant="destructive" className="flex-1 gap-1.5" onClick={() => setCancelDialogOpen(true)}>
                  <Ban className="h-4 w-4" /> {t("booking.details.cancel") || "إلغاء الطلب"}
                </Button>
              )}
              <a
                href={`https://wa.me/${(booking.customer_phone || "").replace(/^0/, "962")}?text=${encodeURIComponent(`مرحباً ${booking.customer_name || ""}، نحن من فريق MFN.`)}`}
                target="_blank" rel="noopener noreferrer" className="flex-1"
              >
                <Button variant="outline" className="w-full gap-1.5">
                  <MessageCircle className="h-4 w-4" /> {t("booking.details.whatsapp")}
                </Button>
              </a>
            </div>
          )}

          {/* Cancel action for workflow bookings too */}
          {showWorkflow && booking.status !== "CANCELLED" && (
            <Button variant="destructive" size="sm" className="w-full gap-1.5" onClick={() => setCancelDialogOpen(true)}>
              <Ban className="h-4 w-4" /> {t("booking.details.cancel") || "إلغاء الطلب"}
            </Button>
          )}
        </div>

        {/* Contract Dialog */}
        <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> عقد تنفيذ المهمة
              </DialogTitle>
              <DialogDescription>النص الكامل للعقد الذي وافق عليه المزود</DialogDescription>
            </DialogHeader>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-muted/30 rounded-lg p-4 border border-border">
              {CONTRACT_TEXT}
            </div>
            {history.find(h => h.action === "CONTRACT_ACCEPTED") && (
              <div className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg p-2">
                <ShieldCheck className="h-4 w-4" />
                <span>تم التوقيع بتاريخ: {new Date(history.find(h => h.action === "CONTRACT_ACCEPTED")!.created_at).toLocaleString("ar-JO")}</span>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setContractDialogOpen(false)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("booking.details.cancel") || "إلغاء الطلب"}</DialogTitle>
              <DialogDescription>{t("booking.details.cancel_confirm") || "هل أنت متأكد من إلغاء هذا الطلب؟"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>{t("booking.details.cancel_reason") || "سبب الإلغاء"}</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t("booking.details.cancel_reason_placeholder") || "اكتب سبب الإلغاء..."} rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>{t("common.cancel") || "تراجع"}</Button>
              <Button variant="destructive" disabled={!cancelReason.trim() || cancelling} onClick={handleCancel}>
                {cancelling ? <><Loader2 className="h-4 w-4 animate-spin me-1" />جاري الإلغاء...</> : (t("booking.details.confirm_cancel") || "تأكيد الإلغاء")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>

      {/* Broadcast Dialog */}
      <BroadcastProvidersDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        booking={booking}
        serviceName={serviceName}
        coordinatorPhone={coordinatorPhone}
      />
    </Sheet>
  );
};

export default BookingDetailsDrawer;
