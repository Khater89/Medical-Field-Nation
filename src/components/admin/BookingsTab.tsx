import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Search, UserCheck, Eye, MessageSquareQuote } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import BookingDetailsDrawer, { type BookingRow } from "./BookingDetailsDrawer";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-info/10 text-info border-info/30",
  CONFIRMED: "bg-primary/20 text-primary border-primary/30",
  ASSIGNED: "bg-warning/10 text-warning border-warning/30",
  ACCEPTED: "bg-success/10 text-success border-success/30",
  COMPLETED: "bg-success text-success-foreground",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
};

const FILTER_STATUSES = ["ALL", "TODAY_TOMORROW", "NEW", "CONFIRMED", "ASSIGNED", "ACCEPTED", "PROVIDER_ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"];

const FILTER_COLORS: Record<string, string> = {
  ALL: "bg-muted text-foreground border-border",
  TODAY_TOMORROW: "bg-chart-5/20 text-chart-5 border-chart-5/30",
  NEW: "bg-info/10 text-info border-info/30",
  CONFIRMED: "bg-primary/20 text-primary border-primary/30",
  ASSIGNED: "bg-warning/10 text-warning border-warning/30",
  ACCEPTED: "bg-success/10 text-success border-success/30",
  PROVIDER_ON_THE_WAY: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  IN_PROGRESS: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  COMPLETED: "bg-success text-success-foreground border-success",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  REJECTED: "bg-destructive/20 text-destructive border-destructive/40",
};

const BookingsTab = () => {
  const { toast } = useToast();
  const { t, formatCurrency, formatDateShort, isRTL } = useLanguage();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [clientCancelledIds, setClientCancelledIds] = useState<Set<string>>(new Set());
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [serviceCategories, setServiceCategories] = useState<Record<string, string>>({});
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [providerPhones, setProviderPhones] = useState<Record<string, string>>({});
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  const fetchBookings = async () => {
    const [bookingsRes, contactsRes, servicesRes, profilesRes, cancelHistoryRes, msgsRes, quotesRes] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("booking_contacts").select("*"),
      supabase.from("services").select("id, name, base_price, category"),
      supabase.from("profiles").select("user_id, full_name, phone"),
      supabase.from("booking_history").select("booking_id, performer_role").eq("action", "CANCELLED").eq("performer_role", "customer"),
      supabase.from("booking_messages").select("booking_id, sender_id, sender_role").eq("sender_role", "provider"),
      supabase.from("provider_quotes").select("booking_id"),
    ]);

    // Build viewer & quote count maps
    const vMap: Record<string, Set<string>> = {};
    (msgsRes.data || []).forEach((m: any) => {
      if (!vMap[m.booking_id]) vMap[m.booking_id] = new Set();
      vMap[m.booking_id].add(m.sender_id);
    });
    const viewerMap: Record<string, number> = {};
    Object.keys(vMap).forEach((k) => { viewerMap[k] = vMap[k].size; });
    setViewerCounts(viewerMap);

    const qMap: Record<string, number> = {};
    (quotesRes.data || []).forEach((q: any) => { qMap[q.booking_id] = (qMap[q.booking_id] || 0) + 1; });
    setQuoteCounts(qMap);


    // Build set of client-cancelled booking IDs
    const clientCancelled = new Set<string>();
    (cancelHistoryRes.data || []).forEach((h: any) => { clientCancelled.add(h.booking_id); });
    setClientCancelledIds(clientCancelled);

    // Merge contact info into bookings
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
    (profilesRes.data || []).forEach((p: any) => { pMap[p.user_id] = p.full_name || t("admin.providers.no_name"); phMap[p.user_id] = p.phone || ""; });
    setProviderNames(pMap);
    setProviderPhones(phMap);

    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  // Filter out client-cancelled bookings (they disappear from dashboard)
  const visibleBookings = bookings.filter((b) => {
    if (b.status === "CANCELLED" && clientCancelledIds.has(b.id)) return false;
    return true;
  });

  const filtered = visibleBookings.filter((b) => {
    // Today/Tomorrow filter
    if (filter === "TODAY_TOMORROW") {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      const bookingDate = new Date(b.scheduled_at).toISOString().slice(0, 10);
      if (bookingDate !== todayStr && bookingDate !== tomorrowStr) return false;
    } else if (filter !== "ALL" && b.status !== filter) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.customer_phone || "").includes(q) ||
        b.city.toLowerCase().includes(q) ||
        (b.booking_number || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold">{t("admin.bookings.title")} ({visibleBookings.length})</h2>
        <div className="relative">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={t("admin.bookings.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${isRTL ? "pr-9" : "pl-9"} w-[200px]`}
          />
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === s
                ? `${FILTER_COLORS[s]} ring-2 ring-ring ring-offset-1`
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {s === "ALL" ? t("admin.bookings.filter_all") : s === "TODAY_TOMORROW" ? "اليوم/غداً" : t(`status.${s}`)}
            {s === "TODAY_TOMORROW" ? (
              <span className="ms-1 opacity-70">
                ({(() => {
                  const now = new Date();
                  const todayStr = now.toISOString().slice(0, 10);
                  const tomorrow = new Date(now);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
                  return visibleBookings.filter(b => {
                    const d = new Date(b.scheduled_at).toISOString().slice(0, 10);
                    return d === todayStr || d === tomorrowStr;
                  }).length;
                })()})
              </span>
            ) : s !== "ALL" && (
              <span className="ms-1 opacity-70">
                ({visibleBookings.filter(b => b.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">{t("admin.bookings.no_bookings")}</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t("admin.bookings.col.number")}</TableHead>
                <TableHead>{t("admin.bookings.col.service")}</TableHead>
                <TableHead>{t("admin.bookings.col.customer")}</TableHead>
                <TableHead>{t("admin.bookings.col.city")}</TableHead>
                <TableHead>{t("admin.bookings.col.date")}</TableHead>
                <TableHead>{t("admin.bookings.col.amount")}</TableHead>
                <TableHead>{t("admin.bookings.col.status")}</TableHead>
                <TableHead className="text-center">سوق المزودين</TableHead>
                <TableHead>{t("admin.bookings.col.provider")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => {
                const isEmergency = (serviceCategories[b.service_id] || "").toLowerCase() === "emergency" ||
                  (serviceNames[b.service_id] || "").includes("طوارئ");
                return (
                <TableRow
                  key={b.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${isEmergency ? "bg-destructive/10 border-l-4 border-l-destructive" : ""}`}
                  onClick={() => setSelectedBooking(b)}
                >
                  <TableCell className="text-xs font-mono" dir="ltr">
                    {b.booking_number || b.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {isEmergency && <span className="text-destructive me-1">🚨</span>}
                    {serviceNames[b.service_id] || "—"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{b.customer_name || b.customer_display_name || "—"}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{b.customer_phone || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{b.city}</TableCell>
                  <TableCell className="text-xs">
                    {formatDateShort(b.scheduled_at)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {b.agreed_price != null ? (
                      <span className="text-success">{formatCurrency(b.agreed_price)}</span>
                    ) : (
                      formatCurrency(servicePrices[b.service_id] ?? b.subtotal)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[b.status] || ""}`}>
                        {t(`status.${b.status}`)}
                      </Badge>
                      {b.status === "IN_PROGRESS" && b.otp_code && (
                        <Badge className="text-[9px] bg-warning/20 text-warning border border-warning/40 animate-pulse">
                          🔑 OTP
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground" title="عدد المزودين الذين شاهدوا/راسلوا">
                        <Eye className="h-3.5 w-3.5" /> {viewerCounts[b.id] || 0}
                      </span>
                      <span className={`flex items-center gap-1 font-semibold ${(quoteCounts[b.id] || 0) > 0 ? "text-success" : "text-muted-foreground"}`} title="عدد عروض الأسعار">
                        <MessageSquareQuote className="h-3.5 w-3.5" /> {quoteCounts[b.id] || 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {b.assigned_provider_id ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-success" />
                        {providerNames[b.assigned_provider_id] || "—"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <BookingDetailsDrawer
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => { if (!open) setSelectedBooking(null); }}
        serviceName={selectedBooking ? serviceNames[selectedBooking.service_id] || t("provider.dashboard.service") : ""}
        servicePrice={selectedBooking ? servicePrices[selectedBooking.service_id] ?? null : null}
        serviceCategory={selectedBooking ? serviceCategories[selectedBooking.service_id] ?? null : null}
        providerName={selectedBooking?.assigned_provider_id ? providerNames[selectedBooking.assigned_provider_id] || null : null}
        providerPhone={selectedBooking?.assigned_provider_id ? providerPhones[selectedBooking.assigned_provider_id] || null : null}
        onStatusChange={() => { setSelectedBooking(null); fetchBookings(); }}
        onDataRefresh={async () => {
          await fetchBookings();
          // Re-select the same booking with updated data
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
    </div>
  );
};

export default BookingsTab;
