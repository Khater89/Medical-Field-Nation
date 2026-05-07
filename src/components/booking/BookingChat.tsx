import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Loader2, Star, DollarSign, MessageCircle, User, Phone, Check, CheckCheck, Clock, UserCheck } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  sender_id: string;
  sender_role: "customer" | "provider";
  sender_display_name: string;
  body: string;
  quoted_price: number | null;
  target_provider_id: string | null;
  created_at: string;
  sender_avatar: string | null;
  /** Local-only: optimistic pending message */
  _pending?: boolean;
  _tempId?: string;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" });

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return "اليوم";
  if (same(d, yesterday)) return "أمس";
  return d.toLocaleDateString("ar-JO", { day: "2-digit", month: "short", year: "numeric" });
};

interface Quote {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_avatar: string | null;
  provider_role: string | null;
  quoted_price: number;
  note: string | null;
  created_at: string;
  is_mine: boolean;
}

interface Props {
  bookingId: string;
  viewerRole: "customer" | "provider";
  viewerId: string;
  viewerName?: string;
  /** Provider mode only: allow attaching a quote price */
  allowQuote?: boolean;
  /** Customer mode only: target a specific provider */
  defaultTargetProviderId?: string | null;
  onTargetProviderClick?: (providerId: string) => void;
  /** Guest mode (no auth): use edge functions with booking_number + phone */
  guestMode?: { bookingNumber: string; phone: string; displayName?: string };
}

const ROLE_LABELS: Record<string, string> = {
  doctor: "طبيب", nurse: "ممرض/ة", physiotherapist: "معالج طبيعي", caregiver: "مقدم رعاية",
};

export default function BookingChat({
  bookingId, viewerRole, viewerId, viewerName,
  allowQuote, defaultTargetProviderId, onTargetProviderClick, guestMode,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [price, setPrice] = useState("");
  const [target, setTarget] = useState<string | null>(defaultTargetProviderId ?? null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    if (guestMode) {
      const { data, error } = await supabase.functions.invoke("guest-list-messages", {
        body: { booking_number: guestMode.bookingNumber, phone: guestMode.phone },
      });
      if (!error && data) {
        setMessages((data.messages as any) || []);
        setQuotes((data.quotes as any) || []);
      }
    } else {
      const [{ data: msgs }, { data: qts }] = await Promise.all([
        supabase.rpc("list_booking_messages" as any, { _booking_id: bookingId }),
        supabase.rpc("booking_quotes_public" as any, { _booking_id: bookingId }),
      ]);
      setMessages((msgs as any) || []);
      setQuotes((qts as any) || []);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  useEffect(() => {
    fetchAll();
    if (guestMode) {
      // Guests poll every 5s for new messages
      const t = setInterval(fetchAll, 5000);
      return () => clearInterval(t);
    }
    const ch = supabase.channel(`booking_messages:${bookingId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages", filter: `booking_id=eq.${bookingId}` },
        () => fetchAll()
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId, guestMode?.bookingNumber, guestMode?.phone]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const priceNum = price ? parseFloat(price) : null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: viewerId,
      sender_role: viewerRole,
      sender_display_name: viewerName || (viewerRole === "customer" ? "أنت" : "أنت"),
      body: body.trim(),
      quoted_price: priceNum,
      target_provider_id: viewerRole === "customer" ? target : null,
      created_at: new Date().toISOString(),
      sender_avatar: null,
      _pending: true,
      _tempId: tempId,
    };
    setMessages((prev) => [...prev, optimistic]);
    const sentBody = body.trim();
    setBody(""); setPrice("");
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);

    try {
      if (guestMode) {
        const { data, error } = await supabase.functions.invoke("guest-send-message", {
          body: {
            booking_number: guestMode.bookingNumber,
            phone: guestMode.phone,
            body: sentBody,
            target_provider_id: target || null,
          },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "send_failed");
      } else {
        const { error } = await supabase.from("booking_messages" as any).insert({
          booking_id: bookingId,
          sender_id: viewerId,
          sender_role: viewerRole,
          sender_display_name: viewerName || null,
          body: sentBody,
          quoted_price: priceNum,
          target_provider_id: viewerRole === "customer" ? target : null,
        });
        if (error) throw error;

        // If provider attached a price, also insert a formal quote (best-effort)
        if (viewerRole === "provider" && priceNum && priceNum > 0) {
          await supabase.from("provider_quotes" as any).insert({
            booking_id: bookingId, provider_id: viewerId, quoted_price: priceNum, note: sentBody,
          });
        }
      }
      await fetchAll();
    } catch (e: any) {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
      setBody(sentBody);
      toast.error(e.message || "تعذّر الإرسال");
    } finally { setSending(false); }
  };

  // Distinct providers from quotes + messages (excluding viewer if provider)
  // Build provider list from quotes + provider messages (provider may message without quote)
  const providerMap = new Map<string, { id: string; name: string; avatar: string | null; role: string | null; price: number | null; isMine: boolean }>();
  quotes.forEach((q) => {
    providerMap.set(q.provider_id, {
      id: q.provider_id, name: q.provider_name, avatar: q.provider_avatar,
      role: q.provider_role, price: q.quoted_price, isMine: q.is_mine,
    });
  });
  messages.forEach((m) => {
    if (m.sender_role === "provider" && !providerMap.has(m.sender_id)) {
      providerMap.set(m.sender_id, {
        id: m.sender_id, name: m.sender_display_name || "مقدم خدمة",
        avatar: m.sender_avatar, role: null, price: null,
        isMine: m.sender_id === viewerId,
      });
    }
  });
  const providers = Array.from(providerMap.values());

  // Customer-only: filter messages by selected provider thread
  const visibleMessages = (() => {
    if (viewerRole !== "customer" || !target) return messages;
    return messages.filter((m) => {
      if (m.sender_role === "provider") return m.sender_id === target;
      return !m.target_provider_id || m.target_provider_id === target;
    });
  })();

  const ROLE_LABEL = (r: string | null) => (r ? ROLE_LABELS[r] || r : "");

  return (
    <div className="border rounded-lg bg-card">
      {/* Providers strip — customer can filter to a single provider's thread */}
      {providers.length > 0 && (
        <div className="border-b p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {viewerRole === "customer"
                ? `🩺 ${providers.length} مزود مهتم — اضغط على مزود لعرض محادثته فقط`
                : "العروض المقدمة"}
            </p>
            {viewerRole === "customer" && target && (
              <button
                onClick={() => setTarget(null)}
                className="text-[10px] text-primary font-bold hover:underline"
              >
                عرض كل الرسائل
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {providers.map((p) => {
              const isActive = target === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (viewerRole === "customer") {
                      setTarget(p.id === target ? null : p.id);
                      onTargetProviderClick?.(p.id);
                    }
                  }}
                  className={`shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border min-w-[92px] transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                      : "border-border bg-background hover:bg-muted/50"
                  } ${p.isMine ? "ring-1 ring-success" : ""}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar || undefined} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <p className="text-[11px] font-bold truncate max-w-[80px]">{p.name}</p>
                  {p.role && <span className="text-[9px] text-muted-foreground">{ROLE_LABEL(p.role)}</span>}
                  {p.price != null && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
                      <DollarSign className="h-2.5 w-2.5" />{p.price} JOD
                    </Badge>
                  )}
                  {p.isMine && <span className="text-[9px] text-success font-bold">عرضي</span>}
                </button>
              );
            })}
          </div>
          {viewerRole === "customer" && target && (() => {
            const sel = providers.find((p) => p.id === target);
            return (
              <div className="text-[11px] text-primary bg-primary/5 rounded px-2 py-1.5 border border-primary/20">
                <span className="font-bold">محادثة:</span> {sel?.name}
                {sel?.role && <span className="text-muted-foreground"> • {ROLE_LABEL(sel.role)}</span>}
                <span className="block text-[10px] text-muted-foreground mt-0.5">رسالتك التالية ستُرسل لهذا المزود فقط</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="h-[300px]">
        <div className="p-3 space-y-2" ref={scrollRef}>
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              لا توجد رسائل بعد — ابدأ المحادثة
            </div>
          )}
          {(() => {
            const latestOtherTs = visibleMessages
              .filter((x) => x.sender_id !== viewerId && !x._pending)
              .reduce<number>((acc, x) => Math.max(acc, new Date(x.created_at).getTime()), 0);

            // Color palette for distinguishing providers (customer view)
            const providerColors = [
              "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30",
              "border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
              "border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/30",
              "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
              "border-l-4 border-l-pink-500 bg-pink-50 dark:bg-pink-950/30",
            ];
            const providerColorMap = new Map<string, string>();
            providers.forEach((p, i) => providerColorMap.set(p.id, providerColors[i % providerColors.length]));

            let lastDateLabel = "";
            let lastSenderId = "";
            return visibleMessages.map((m) => {
              const mine = m.sender_id === viewerId;
              const isPrivate = m.target_provider_id != null;
              const hidden = isPrivate && viewerRole === "provider" && m.target_provider_id !== viewerId && !mine;
              if (hidden) return null;

              const dateLabel = formatDateLabel(m.created_at);
              const showDate = dateLabel !== lastDateLabel;
              lastDateLabel = dateLabel;

              // Show provider header divider when sender changes (customer view, multiple providers)
              const showProviderDivider =
                viewerRole === "customer" &&
                m.sender_role === "provider" &&
                !target &&
                providers.length > 1 &&
                m.sender_id !== lastSenderId;
              lastSenderId = m.sender_id;

              let status: "pending" | "sent" | "delivered" = "sent";
              if (m._pending) status = "pending";
              else if (mine && new Date(m.created_at).getTime() < latestOtherTs) status = "delivered";

              const providerInfo = m.sender_role === "provider" ? providers.find((p) => p.id === m.sender_id) : null;
              const colorClass = m.sender_role === "provider" && !mine ? (providerColorMap.get(m.sender_id) || "bg-muted") : "";

              return (
                <div key={m.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {dateLabel}
                      </span>
                    </div>
                  )}
                  {showProviderDivider && providerInfo && (
                    <div className="flex items-center gap-2 my-2 px-2">
                      <div className="h-px flex-1 bg-border" />
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={providerInfo.avatar || undefined} />
                          <AvatarFallback className="text-[8px]">🩺</AvatarFallback>
                        </Avatar>
                        {providerInfo.name}
                        {providerInfo.role && <span className="text-muted-foreground/70">• {ROLE_LABEL(providerInfo.role)}</span>}
                      </div>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className={`flex gap-2 ${mine ? "flex-row-reverse" : ""} ${m._pending ? "opacity-70" : ""}`}>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={m.sender_avatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {m.sender_role === "customer" ? "👤" : "🩺"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : (colorClass || "bg-muted")
                    }`}>
                      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                        <span className="text-[10px] opacity-80 font-bold">{m.sender_display_name}</span>
                        {providerInfo?.role && !mine && (
                          <span className="text-[9px] opacity-70">• {ROLE_LABEL(providerInfo.role)}</span>
                        )}
                        {isPrivate && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">خاص</Badge>}
                      </div>
                      <p className="break-words whitespace-pre-wrap">{m.body}</p>
                      {m.quoted_price && (
                        <Badge variant="outline" className={`mt-1 text-[10px] gap-0.5 ${mine ? "bg-primary-foreground/20 border-primary-foreground/30" : ""}`}>
                          <DollarSign className="h-2.5 w-2.5" />السعر المقترح: {m.quoted_price} JOD
                        </Badge>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${mine ? "justify-start flex-row-reverse" : "justify-start"}`}>
                        <span className="text-[9px] opacity-60">{formatTime(m.created_at)}</span>
                        {mine && (
                          <span
                            className="text-[10px] opacity-80 inline-flex items-center"
                            title={
                              status === "pending" ? "جارٍ الإرسال..."
                              : status === "delivered" ? "تم التسليم"
                              : "تم الإرسال"
                            }
                            aria-label={
                              status === "pending" ? "جارٍ الإرسال"
                              : status === "delivered" ? "تم التسليم"
                              : "تم الإرسال"
                            }
                          >
                            {status === "pending" && <Clock className="h-3 w-3" />}
                            {status === "sent" && <Check className="h-3 w-3" />}
                            {status === "delivered" && <CheckCheck className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t p-2 space-y-2">
        {allowQuote && (
          <Input
            type="number"
            placeholder="إرفاق سعر (JOD) — اختياري"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-8 text-xs"
            dir="ltr"
            min={0}
          />
        )}
        <div className="flex gap-2">
          <Input
            placeholder={target ? "رسالة خاصة للمزود المختار..." : "اكتب رسالتك..."}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="flex-1"
            disabled={sending}
          />
          <Button size="sm" onClick={send} disabled={!body.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
