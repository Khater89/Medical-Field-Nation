import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays, MapPin, Search, Filter, Phone,
  MessageCircle, UserCheck, Loader2, Ban, CalendarIcon, X,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import CSAssignmentDialog from "./CSAssignmentDialog";
import BookingDetailsDrawer, { type BookingRow } from "@/components/admin/BookingDetailsDrawer";

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  ASSIGNED: "معيّن",
  ACCEPTED: "مقبول",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-info/10 text-info border-info/30",
  ASSIGNED: "bg-warning/10 text-warning border-warning/30",
  ACCEPTED: "bg-success/10 text-success border-success/30",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/30",
  COMPLETED: "bg-success/10 text-success border-success/30",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/30",
};

const FILTER_STATUSES = ["ALL", "NEW", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"];

const CSBookingsTab = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [serviceCategories, setServiceCategories] = useState<Record<string, string>>({});
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [providerPhones, setProviderPhones] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Detail drawer
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  // Assignment dialog
  const [assignBooking, setAssignBooking] = useState<BookingRow | null>(null);

  // Cancel dialog
  const [cancelBooking, setCancelBooking] = useState<BookingRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    const [bookingsRes, contactsRes, servicesRes, profilesRes] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("booking_contacts").select("*"),
      supabase.from("services").select("id, name, base_price, category"),
      supabase.from("profiles").select("user_id, full_name, phone"),
    ]);

    const contactMap: Record<string, any> = {};
    (contactsRes.data || []).forEach((c: any) => { contactMap[c.booking_id] = c; });

    const merged = (bookingsRes.data || []).map((b: any) => {
      const contact = contactMap[b.id];
      return {
        ...b,
        customer_name: contact?.customer_name || b.customer_display_name || "",
        customer_phone: contact?.customer_phone || "",
        client_address_text: contact?.client_address_text || null,
      };
    });
    setBookings(merged as BookingRow[]);

    const svcMap: Record<string, string> = {};
    const priceMap: Record<string, number> = {};
    const catMap: Record<string, string> = {};
    (servicesRes.data || []).forEach((s: any) => { svcMap[s.id] = s.name; priceMap[s.id] = s.base_price; catMap[s.id] = s.category; });
    setServiceNames(svcMap);
    setServicePrices(priceMap);
    setServiceCategories(catMap);

    const pMap: Record<string, string> = {};
    const phMap: Record<string, string> = {};
    (profilesRes.data || []).forEach((p: any) => { pMap[p.user_id] = p.full_name || "بدون اسم"; phMap[p.user_id] = p.phone || ""; });
    setProviderNames(pMap);
    setProviderPhones(phMap);

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("cs-bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Build unique providers list for filter
  const assignedProviders = Array.from(
    new Set(bookings.filter(b => b.assigned_provider_id).map(b => b.assigned_provider_id!))
  );

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (providerFilter !== "ALL" && b.assigned_provider_id !== providerFilter) return false;
    if (dateFilter && !isSameDay(new Date(b.scheduled_at), dateFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.customer_phone || "").includes(q) ||
        b.city.toLowerCase().includes(q) ||
        (b.booking_number || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCancel = async () => {
    if (!cancelBooking || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "CANCELLED" })
        .eq("id", cancelBooking.id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("booking_history").insert({
          booking_id: cancelBooking.id,
          action: "CANCELLED",
          performed_by: user.id,
          performer_role: "cs",
          note: cancelReason.trim(),
        });
      }

      toast({ title: "تم إلغاء الطلب بنجاح" });
      setCancelBooking(null);
      setCancelReason("");
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف أو المدينة أو رقم الحجز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <Filter className="h-4 w-4 ml-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "الكل" : STATUS_LABELS[s] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Provider filter */}
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[150px]">
            <UserCheck className="h-4 w-4 ml-1" />
            <SelectValue placeholder="المزوّد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل المزوّدين</SelectItem>
            {assignedProviders.map((pid) => (
              <SelectItem key={pid} value={pid}>
                {providerNames[pid] || "مزوّد"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[150px] justify-start text-right font-normal text-xs", !dateFilter && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4 ml-1" />
              {dateFilter ? format(dateFilter, "yyyy-MM-dd") : "تاريخ"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {dateFilter && (
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setDateFilter(undefined)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filteredBookings.length} حجز من أصل {bookings.length}</p>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد حجوزات مطابقة</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filteredBookings.map((b) => {
            const isEmergency = (serviceCategories[b.service_id] || "").toLowerCase() === "emergency" ||
              (serviceNames[b.service_id] || "").includes("طوارئ");
            return (
            <Card
              key={b.id}
              className={cn("cursor-pointer hover:border-primary/50 transition-colors", isEmergency && "border-destructive border-2 bg-destructive/5")}
              onClick={() => setSelectedBooking(b)}
            >
              <CardContent className="py-4 px-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {isEmergency && <span className="text-destructive me-1">🚨</span>}
                      {serviceNames[b.service_id] || "خدمة"}
                      {b.booking_number && (
                        <span className="ms-2 text-[10px] text-muted-foreground" dir="ltr">{b.booking_number}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.customer_name || b.customer_display_name || "—"} · <span dir="ltr">{b.customer_phone || "—"}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_COLORS[b.status] || ""}>
                    {STATUS_LABELS[b.status] || b.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(b.scheduled_at).toLocaleDateString("ar-JO", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.city}</span>
                  <span className="font-medium text-primary">{servicePrices[b.service_id] ?? b.subtotal} د.أ</span>
                  {b.agreed_price != null && (
                    <span className="text-success font-medium">المتفق: {b.agreed_price} د.أ</span>
                  )}
                </div>

                {b.assigned_provider_id && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-3 w-3" />
                    مُسند إلى: <span className="font-medium">{providerNames[b.assigned_provider_id] || "مزوّد"}</span>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {(b.status === "NEW" || b.status === "ASSIGNED") && (
                    <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => setAssignBooking(b)}>
                      <UserCheck className="h-3 w-3" />
                      {b.assigned_provider_id ? "إعادة تعيين" : "تعيين مزوّد"}
                    </Button>
                  )}
                  {b.status !== "COMPLETED" && b.status !== "CANCELLED" && (
                    <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" onClick={() => setCancelBooking(b)}>
                      <Ban className="h-3 w-3" /> إلغاء
                    </Button>
                  )}
                  <a
                    href={`https://wa.me/${(b.customer_phone || "").replace(/^0/, "962")}?text=${encodeURIComponent(`مرحباً ${b.customer_name || ""}، نحن من فريق MFN.`)}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                      <MessageCircle className="h-3 w-3" /> واتساب
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Booking Details Drawer */}
      <BookingDetailsDrawer
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => { if (!open) setSelectedBooking(null); }}
        serviceName={selectedBooking ? serviceNames[selectedBooking.service_id] || "خدمة" : ""}
        servicePrice={selectedBooking ? servicePrices[selectedBooking.service_id] ?? null : null}
        providerName={selectedBooking?.assigned_provider_id ? providerNames[selectedBooking.assigned_provider_id] || null : null}
        providerPhone={selectedBooking?.assigned_provider_id ? providerPhones[selectedBooking.assigned_provider_id] || null : null}
        onStatusChange={() => { setSelectedBooking(null); fetchData(); }}
        onDataRefresh={async () => {
          await fetchData();
          if (selectedBooking) {
            const updated = (await supabase.from("bookings").select("*").eq("id", selectedBooking.id).single()).data;
            if (updated) {
              const contactRes = await supabase.from("booking_contacts").select("*").eq("booking_id", updated.id).single();
              const contact = contactRes.data;
              setSelectedBooking({
                ...updated,
                customer_name: contact?.customer_name || updated.customer_display_name || "",
                customer_phone: contact?.customer_phone || "",
                client_address_text: contact?.client_address_text || null,
              } as BookingRow);
            }
          }
        }}
      />

      {/* Assignment Dialog */}
      {assignBooking && (
        <CSAssignmentDialog
          booking={assignBooking}
          open={!!assignBooking}
          onOpenChange={(open) => { if (!open) setAssignBooking(null); }}
          onAssigned={() => { setAssignBooking(null); fetchData(); }}
          serviceName={serviceNames[assignBooking.service_id] || "خدمة"}
          servicePrice={servicePrices[assignBooking.service_id] ?? null}
          serviceCategory={serviceCategories[assignBooking.service_id] ?? null}
        />
      )}

      {/* Cancel Dialog */}
      <Dialog open={!!cancelBooking} onOpenChange={(open) => { if (!open) { setCancelBooking(null); setCancelReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء الطلب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء الطلب {cancelBooking?.booking_number || ""}؟ يرجى إدخال سبب الإلغاء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>سبب الإلغاء</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="اكتب سبب الإلغاء هنا..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelBooking(null); setCancelReason(""); }}>تراجع</Button>
            <Button variant="destructive" disabled={!cancelReason.trim() || cancelling} onClick={handleCancel}>
              {cancelling ? <><Loader2 className="h-4 w-4 animate-spin me-1" />جاري الإلغاء...</> : "تأكيد الإلغاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CSBookingsTab;
