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
  ClipboardList, Loader2, ChevronLeft, RefreshCw,
} from "lucide-react";
import BookingChat from "@/components/booking/BookingChat";

interface Conversation {
  booking_id: string;
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
  last_message_id: string;
  last_message_body: string;
  last_message_created_at: string;
  last_sender_id: string;
  last_sender_role: string;
  last_sender_display_name: string;
  total_count: number;
  incoming_count: number;
  is_private: boolean;
  customer_avatar: string | null;
  customer_full_name: string | null;
  unreadCount: number;
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
    const { data, error } = await supabase.rpc("provider_messages_inbox");
    if (error) {
      console.error("[ProviderMessagesTab] inbox RPC error:", error);
      setConversations([]);
      setLoading(false);
      return;
    }
    const rows = (data || []) as any[];
    const convs: Conversation[] = rows.map((r) => {
      const lastReadIso = readMap[r.booking_id];
      // Unread = incoming messages whose created_at > lastRead (approximated using last_message_created_at)
      const unreadCount =
        !lastReadIso || new Date(r.last_message_created_at).getTime() > new Date(lastReadIso).getTime()
          ? r.incoming_count
          : 0;
      return {
        ...r,
        customer_full_name: r.customer_full_name || r.customer_display_name || "العميل",
        unreadCount,
      };
    });
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
    // Safety net: poll every 15 seconds in case realtime misses
    const poll = setInterval(fetchAll, 15000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const openConversation = (conv: Conversation) => {
    setOpenConv(conv);
    persistRead({ ...readMap, [conv.booking_id]: new Date().toISOString() });
    setConversations((prev) =>
      prev.map((c) => (c.booking_id === conv.booking_id ? { ...c, unreadCount: 0 } : c))
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
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchAll}>
          <RefreshCw className="h-3 w-3 ml-1" /> تحديث
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          {conversations.length} محادثة — تشمل تفاصيل كل طلب وعنوانه
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={fetchAll}>
          <RefreshCw className="h-3 w-3 ml-1" /> تحديث
        </Button>
      </div>

      {conversations.map((conv) => {
        const serviceName = serviceNames[conv.service_id] || conv.service_id;
        return (
          <Card
            key={conv.booking_id}
            className={`cursor-pointer hover:border-primary/40 transition-colors ${
              conv.unreadCount > 0 ? "border-primary/40 bg-primary/5" : ""
            }`}
            onClick={() => openConversation(conv)}
          >
            <CardContent className="py-3 px-3 space-y-2">
              <div className="flex items-start gap-2">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={conv.customer_avatar || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate">{conv.customer_full_name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(conv.last_message_created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {conv.booking_number && (
                      <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">
                        {conv.booking_number}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {STATUS_LABELS[conv.status] || conv.status}
                    </Badge>
                    {conv.is_emergency && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                        طوارئ
                      </Badge>
                    )}
                    {conv.is_private && (
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

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground border-t pt-1.5">
                <span className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  {serviceName}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(conv.scheduled_at).toLocaleDateString("ar-JO", {
                    month: "short", day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(conv.scheduled_at).toLocaleTimeString("ar-JO", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {conv.client_address_text || conv.area_public || conv.city}
                </span>
              </div>

              <div className="text-xs text-foreground/80 line-clamp-2 bg-muted/50 rounded-md px-2 py-1.5">
                <span className="font-medium text-muted-foreground">
                  {conv.last_sender_id === providerId
                    ? "أنت: "
                    : `${conv.last_sender_display_name}: `}
                </span>
                {conv.last_message_body}
              </div>
            </CardContent>
          </Card>
        );
      })}

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
                  <span>محادثة مع {openConv.customer_full_name}</span>
                </DialogTitle>
                <DialogDescription className="text-[11px]" dir="ltr">
                  {openConv.booking_number}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">
                    {serviceNames[openConv.service_id] || openConv.service_id}
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABELS[openConv.status] || openConv.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(openConv.scheduled_at).toLocaleString("ar-JO", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {openConv.client_address_text || openConv.area_public || openConv.city}
                  </span>
                </div>
              </div>

              <BookingChat
                bookingId={openConv.booking_id}
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
