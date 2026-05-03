import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  MessageCircle, MapPin, CalendarDays, Clock, User,
  ClipboardList, Loader2, ChevronLeft,
} from "lucide-react";
import BookingChat from "@/components/booking/BookingChat";

interface MessageRow {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: "customer" | "provider";
  sender_display_name: string | null;
  body: string;
  created_at: string;
  target_provider_id: string | null;
}

interface BookingInfo {
  id: string;
  booking_number: string | null;
  service_id: string;
  city: string;
  scheduled_at: string;
  status: string;
  area_public: string | null;
  is_emergency: boolean;
  client_address_text: string | null;
  customer_display_name: string | null;
  assigned_provider_id: string | null;
}

interface Conversation {
  booking: BookingInfo;
  lastMessage: MessageRow;
  unreadCount: number;
  totalCount: number;
  isPrivate: boolean;
  customerAvatar: string | null;
  customerName: string;
}

interface Props {
  providerId: string;
  serviceNames: Record<string, string>;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  ASSIGNED: "معيّن",
  ACCEPTED: "مقبول",
  PROVIDER_ON_THE_WAY: "في الطريق",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ar-JO", { day: "2-digit", month: "short" });
};

export default function ProviderMessagesTab({ providerId, serviceNames }: Props) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [openConv, setOpenConv] = useState<Conversation | null>(null);
  const [readMap, setReadMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("mfn_provider_msg_read") || "{}"); }
    catch { return {}; }
  });

  const persistRead = (next: Record<string, string>) => {
    setReadMap(next);
    localStorage.setItem("mfn_provider_msg_read", JSON.stringify(next));
  };

  const fetchAll = async () => {
    // 1) Fetch all messages where provider has visibility
    //    RLS already enforces this — get messages for any booking provider can see
    const { data: msgs } = await supabase
      .from("booking_messages")
      .select("id, booking_id, sender_id, sender_role, sender_display_name, body, created_at, target_provider_id")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!msgs || msgs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Group by booking_id, filter out messages targeted at OTHER providers
    const byBooking = new Map<string, MessageRow[]>();
    for (const m of msgs as MessageRow[]) {
      // Skip private messages targeted at a different provider
      if (m.target_provider_id && m.target_provider_id !== providerId && m.sender_id !== providerId) continue;
      const list = byBooking.get(m.booking_id) || [];
      list.push(m);
      byBooking.set(m.booking_id, list);
    }

    const bookingIds = Array.from(byBooking.keys());
    if (bookingIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // 2) Fetch booking details
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, booking_number, service_id, city, scheduled_at, status, area_public, is_emergency, client_address_text, customer_display_name, assigned_provider_id")
      .in("id", bookingIds);

    const bookingMap = new Map((bookings || []).map((b: any) => [b.id, b as BookingInfo]));

    // 3) Fetch customer avatars (sender profiles)
    const customerIds = [...new Set(
      (msgs as MessageRow[])
        .filter((m) => m.sender_role === "customer")
        .map((m) => m.sender_id)
    )];
    const { data: profs } = customerIds.length
      ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", customerIds)
      : { data: [] as any[] };
    const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));

    const convs: Conversation[] = [];
    for (const [bookingId, list] of byBooking.entries()) {
      const booking = bookingMap.get(bookingId);
      if (!booking) continue;
      // Only include if there is at least one INCOMING message (from someone other than me)
      const incoming = list.filter((m) => m.sender_id !== providerId);
      if (incoming.length === 0) continue;

      const sorted = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastMessage = sorted[0];
      const lastReadIso = readMap[bookingId];
      const unreadCount = incoming.filter(
        (m) => !lastReadIso || new Date(m.created_at).getTime() > new Date(lastReadIso).getTime()
      ).length;

      // Find a customer profile (first customer message)
      const firstCust = list.find((m) => m.sender_role === "customer");
      const profile = firstCust ? profMap.get(firstCust.sender_id) : null;
      const customerName =
        profile?.full_name ||
        firstCust?.sender_display_name ||
        booking.customer_display_name ||
        "العميل";

      convs.push({
        booking,
        lastMessage,
        unreadCount,
        totalCount: list.length,
        isPrivate: list.some((m) => m.target_provider_id === providerId),
        customerAvatar: profile?.avatar_url || null,
        customerName,
      });
    }

    convs.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    setConversations(convs);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel(`provider_messages_inbox:${providerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages" },
        () => fetchAll()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const openConversation = (conv: Conversation) => {
    setOpenConv(conv);
    persistRead({ ...readMap, [conv.booking.id]: new Date().toISOString() });
    // Mark zero in UI immediately
    setConversations((prev) =>
      prev.map((c) => (c.booking.id === conv.booking.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">لا توجد رسائل واردة</p>
        <p className="text-xs mt-1">ستظهر هنا الرسائل الواردة من العملاء</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">
        {conversations.length} محادثة — تشمل تفاصيل كل طلب وعنوانه
      </p>

      {conversations.map((conv) => {
        const b = conv.booking;
        const serviceName = serviceNames[b.service_id] || b.service_id;
        return (
          <Card
            key={b.id}
            className={`cursor-pointer hover:border-primary/40 transition-colors ${
              conv.unreadCount > 0 ? "border-primary/40 bg-primary/5" : ""
            }`}
            onClick={() => openConversation(conv)}
          >
            <CardContent className="py-3 px-3 space-y-2">
              {/* Header row: customer + booking number + unread badge */}
              <div className="flex items-start gap-2">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={conv.customerAvatar || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate">{conv.customerName}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(conv.lastMessage.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {b.booking_number && (
                      <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">
                        {b.booking_number}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {STATUS_LABELS[b.status] || b.status}
                    </Badge>
                    {b.is_emergency && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                        طوارئ
                      </Badge>
                    )}
                    {conv.isPrivate && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                        خاصة
                      </Badge>
                    )}
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>

              {/* Booking details strip */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground border-t pt-1.5">
                <span className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  {serviceName}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(b.scheduled_at).toLocaleDateString("ar-JO", {
                    month: "short", day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(b.scheduled_at).toLocaleTimeString("ar-JO", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {b.client_address_text || b.area_public || b.city}
                </span>
              </div>

              {/* Last message preview */}
              <div className="text-xs text-foreground/80 line-clamp-2 bg-muted/50 rounded-md px-2 py-1.5">
                <span className="font-medium text-muted-foreground">
                  {conv.lastMessage.sender_id === providerId
                    ? "أنت: "
                    : `${conv.lastMessage.sender_display_name || conv.customerName}: `}
                </span>
                {conv.lastMessage.body}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Conversation Dialog */}
      <Dialog open={!!openConv} onOpenChange={(o) => !o && setOpenConv(null)}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          {openConv && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setOpenConv(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>محادثة مع {openConv.customerName}</span>
                </DialogTitle>
                <DialogDescription className="text-[11px]" dir="ltr">
                  {openConv.booking.booking_number}
                </DialogDescription>
              </DialogHeader>

              {/* Booking summary card */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">
                    {serviceNames[openConv.booking.service_id] || openConv.booking.service_id}
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABELS[openConv.booking.status] || openConv.booking.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(openConv.booking.scheduled_at).toLocaleString("ar-JO", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {openConv.booking.client_address_text || openConv.booking.area_public || openConv.booking.city}
                  </span>
                </div>
              </div>

              <BookingChat
                bookingId={openConv.booking.id}
                viewerRole="provider"
                viewerId={providerId}
                allowQuote
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
