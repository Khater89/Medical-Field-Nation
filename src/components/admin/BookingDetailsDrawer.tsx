import { useState } from "react";
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
  MessageCircle, FileText, StickyNote, Ban, Loader2, ClipboardCheck,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrderWorkflowPhases from "./OrderWorkflowPhases";

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
  customer_name?: string | null;
  customer_phone?: string | null;
  client_address_text?: string | null;
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

const BookingDetailsDrawer = ({ booking, open, onOpenChange, serviceName, servicePrice, providerName, providerPhone, onStatusChange, onDataRefresh }: Props) => {
  const { t, formatCurrency, formatDate, formatDateTime, formatDateShort } = useLanguage();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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

  if (!booking) return null;

  const showWorkflow = booking.status === "NEW" || (booking.status === "ASSIGNED" && !booking.accepted_at);
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
              {booking.accepted_at && (
                <p className="text-xs text-success">✅ {t("booking.details.accepted_date")}: {formatDateShort(booking.accepted_at)}</p>
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
            />
          )}

          {/* Actions for non-workflow bookings */}
          {!showWorkflow && (
            <div className="flex gap-2 pt-2">
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
    </Sheet>
  );
};

export default BookingDetailsDrawer;
