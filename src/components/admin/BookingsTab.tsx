import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, UserCheck, Eye, MessageSquareQuote, MessageSquare } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import BookingDetailsDrawer, { type BookingRow } from "./BookingDetailsDrawer";
import BookingInteractionsDialog from "./BookingInteractionsDialog";
import BookingMessagesDialog from "./BookingMessagesDialog";
import BookingTimer from "./BookingTimer";

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
  const { t, formatCurrency, formatDateShort } = useLanguage();
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
  

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [interactionsBooking, setInteractionsBooking] = useState<BookingRow | null>(null);
  const [messagesBooking, setMessagesBooking] = useState<BookingRow | null>(null);

  const fetchBookings = async () => {
    const [bookingsRes, contactsRes, servicesRes, profilesRes, cancelHistoryRes, msgsRes, quotesRes] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("booking_contacts").select("*"),
      supabase.from("services").select("id, name, base_price, category"),
      supabase.from("profiles").select("user_id, full_name, phone"),
      supabase.from("booking_history").select("booking_id, performer_role").eq("action", "CANCELLED").eq("performer_role", "customer"),
      supabase.from("booking_messages").select("booking_id, sender_id, sender_role").eq("sender_role", "provider"),
      supabase.from("provider_quotes").select("booking_id, provider_id"),
    ]);

    // Count each provider once per booking based on FIRST interaction (message OR quote)
    const vMap: Record<string, Set<string>> = {};
    (msgsRes.data || []).forEach((m: any) => {
      if (!vMap[m.booking_id]) vMap[m.booking_id] = new Set();
      vMap[m.booking_id].add(m.sender_id);
    });
    (quotesRes.data || []).forEach((q: any) => {
      if (!vMap[q.booking_id]) vMap[q.booking_id] = new Set();
      vMap[q.booking_id].add(q.provider_id);
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

  // Realtime: refresh counts when providers send messages or quotes
  useEffect(() => {
    const ch = supabase
      .channel("admin-bookings-interactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_messages" }, () => fetchBookings())
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_quotes" }, () => fetchBookings())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchBookings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

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
    return true;
  });

  const columns: ColumnDef<BookingRow>[] = useMemo(() => [
    {
      accessorKey: "booking_number",
      header: t("admin.bookings.col.number"),
      cell: ({ row }) => (
        <span className="text-xs font-mono" dir="ltr">
          {row.original.booking_number || row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: "service",
      accessorFn: (b) => serviceNames[b.service_id] || "",
      header: t("admin.bookings.col.service"),
      cell: ({ row }) => {
        const b = row.original;
        const isEmergency = (serviceCategories[b.service_id] || "").toLowerCase() === "emergency" ||
          (serviceNames[b.service_id] || "").includes("طوارئ");
        return (
          <span className="text-sm font-medium">
            {isEmergency && <span className="text-destructive me-1">🚨</span>}
            {serviceNames[b.service_id] || "—"}
          </span>
        );
      },
    },
    {
      id: "customer",
      accessorFn: (b) => `${b.customer_name || b.customer_display_name || ""} ${b.customer_phone || ""}`,
      header: t("admin.bookings.col.customer"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.customer_name || row.original.customer_display_name || "—"}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{row.original.customer_phone || "—"}</p>
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: t("admin.bookings.col.city"),
      cell: ({ row }) => <span className="text-sm">{row.original.city}</span>,
    },
    {
      accessorKey: "scheduled_at",
      header: t("admin.bookings.col.date"),
      cell: ({ row }) => <span className="text-xs">{formatDateShort(row.original.scheduled_at)}</span>,
      sortingFn: "datetime",
    },
    {
      id: "amount",
      accessorFn: (b) => b.agreed_price ?? servicePrices[b.service_id] ?? b.subtotal ?? 0,
      header: t("admin.bookings.col.amount"),
      cell: ({ row }) => {
        const b = row.original;
        return (
          <span className="text-sm font-medium">
            {b.agreed_price != null
              ? <span className="text-success">{formatCurrency(b.agreed_price)}</span>
              : formatCurrency(servicePrices[b.service_id] ?? b.subtotal)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("admin.bookings.col.status"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[row.original.status] || ""}`}>
              {t(`status.${row.original.status}`)}
            </Badge>
            {row.original.status === "IN_PROGRESS" && row.original.otp_code && (
              <Badge className="text-[9px] bg-warning/20 text-warning border border-warning/40 animate-pulse">🔑 OTP</Badge>
            )}
          </div>
          <BookingTimer
            scheduledAt={row.original.scheduled_at}
            status={row.original.status}
            checkInAt={row.original.check_in_at}
          />
        </div>
      ),
    },
    {
      id: "marketplace",
      header: () => <span className="text-center w-full block">سوق المزودين</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const b = row.original;
        const viewers = viewerCounts[b.id] || 0;
        const quotes = quoteCounts[b.id] || 0;
        const hasActivity = viewers > 0 || quotes > 0;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setInteractionsBooking(b)}
              className={`relative inline-flex items-center justify-center gap-2 text-xs px-2 py-1 rounded-md transition-all ${
                hasActivity
                  ? "bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30"
                  : "hover:bg-accent"
              }`}
              title="عرض المزودين الذين تفاعلوا مع الطلب"
            >
              <span className={`relative flex items-center gap-1 ${viewers > 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                <span className="relative inline-flex">
                  <Eye className={`h-3.5 w-3.5 ${viewers > 0 ? "animate-pulse" : ""}`} />
                  {viewers > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-ping" />
                  )}
                </span>
                {viewers > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {viewers}
                  </span>
                ) : <span>0</span>}
              </span>
              <span className={`flex items-center gap-1 font-semibold ${quotes > 0 ? "text-success" : "text-muted-foreground"}`}>
                <MessageSquareQuote className={`h-3.5 w-3.5 ${quotes > 0 ? "animate-pulse" : ""}`} />
                {quotes > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-success text-success-foreground text-[10px] font-bold">
                    {quotes}
                  </span>
                ) : <span>0</span>}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMessagesBooking(b)}
              className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-accent transition-colors"
              title="عرض جميع رسائل هذا الطلب"
            >
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        );
      },
    },
    {
      id: "provider",
      accessorFn: (b) => b.assigned_provider_id ? providerNames[b.assigned_provider_id] || "" : "",
      header: t("admin.bookings.col.provider"),
      cell: ({ row }) => row.original.assigned_provider_id ? (
        <span className="flex items-center gap-1 text-xs">
          <UserCheck className="h-3 w-3 text-success" />
          {providerNames[row.original.assigned_provider_id] || "—"}
        </span>
      ) : <span className="text-muted-foreground text-xs">—</span>,
    },
  ], [t, serviceNames, serviceCategories, servicePrices, providerNames, viewerCounts, quoteCounts, formatCurrency, formatDateShort]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold">{t("admin.bookings.title")} ({visibleBookings.length})</h2>
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

      <DataTable
        columns={columns}
        data={filtered}
        globalSearchPlaceholder={t("admin.bookings.search")}
        globalSearchKeys={["customer_name", "customer_phone", "city", "booking_number", "customer_display_name"]}
        onRowClick={(b) => setSelectedBooking(b)}
        rowClassName={(b) => {
          const isEmergency = (serviceCategories[b.service_id] || "").toLowerCase() === "emergency" ||
            (serviceNames[b.service_id] || "").includes("طوارئ");
          return isEmergency ? "bg-destructive/10 border-l-4 border-l-destructive" : "";
        }}
        emptyMessage={t("admin.bookings.no_bookings")}
        pageSize={25}
      />

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
      <BookingInteractionsDialog
        bookingId={interactionsBooking?.id || null}
        bookingNumber={interactionsBooking?.booking_number || null}
        open={!!interactionsBooking}
        onOpenChange={(o) => { if (!o) setInteractionsBooking(null); }}
      />
    </div>
  );
};

export default BookingsTab;
