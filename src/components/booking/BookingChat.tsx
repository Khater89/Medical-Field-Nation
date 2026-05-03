import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Loader2, Star, DollarSign, MessageCircle, User, Phone } from "lucide-react";

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
}

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
}

const ROLE_LABELS: Record<string, string> = {
  doctor: "طبيب", nurse: "ممرض/ة", physiotherapist: "معالج طبيعي", caregiver: "مقدم رعاية",
};

export default function BookingChat({
  bookingId, viewerRole, viewerId, viewerName,
  allowQuote, defaultTargetProviderId, onTargetProviderClick,
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
    const [{ data: msgs }, { data: qts }] = await Promise.all([
      supabase.rpc("list_booking_messages" as any, { _booking_id: bookingId }),
      supabase.rpc("booking_quotes_public" as any, { _booking_id: bookingId }),
    ]);
    setMessages((msgs as any) || []);
    setQuotes((qts as any) || []);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel(`booking_messages:${bookingId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages", filter: `booking_id=eq.${bookingId}` },
        () => fetchAll()
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const priceNum = price ? parseFloat(price) : null;
      const { error } = await supabase.from("booking_messages" as any).insert({
        booking_id: bookingId,
        sender_id: viewerId,
        sender_role: viewerRole,
        sender_display_name: viewerName || null,
        body: body.trim(),
        quoted_price: priceNum,
        target_provider_id: viewerRole === "customer" ? target : null,
      });
      if (error) throw error;

      // If provider attached a price, also insert a formal quote (best-effort)
      if (viewerRole === "provider" && priceNum && priceNum > 0) {
        await supabase.from("provider_quotes" as any).insert({
          booking_id: bookingId, provider_id: viewerId, quoted_price: priceNum, note: body.trim(),
        });
      }
      setBody(""); setPrice("");
      await fetchAll();
    } catch (e: any) {
      toast.error(e.message || "تعذّر الإرسال");
    } finally { setSending(false); }
  };

  // Distinct providers from quotes + messages (excluding viewer if provider)
  const providers = quotes.map((q) => ({
    id: q.provider_id, name: q.provider_name, avatar: q.provider_avatar,
    role: q.provider_role, price: q.quoted_price, isMine: q.is_mine,
  }));

  return (
    <div className="border rounded-lg bg-card">
      {/* Providers strip — both customer & provider see who's involved */}
      {providers.length > 0 && (
        <div className="border-b p-3 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {viewerRole === "customer" ? "المزودون المهتمون بطلبك" : "العروض المقدمة"}
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  if (viewerRole === "customer") {
                    setTarget(p.id === target ? null : p.id);
                    onTargetProviderClick?.(p.id);
                  }
                }}
                className={`shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border min-w-[80px] transition-colors ${
                  target === p.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/50"
                } ${p.isMine ? "ring-1 ring-success" : ""}`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar || undefined} />
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <p className="text-[11px] font-medium truncate max-w-[72px]">{p.name}</p>
                {p.role && <span className="text-[9px] text-muted-foreground">{ROLE_LABELS[p.role] || p.role}</span>}
                <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
                  <DollarSign className="h-2.5 w-2.5" />{p.price} JOD
                </Badge>
                {p.isMine && <span className="text-[9px] text-success font-bold">عرضي</span>}
              </button>
            ))}
          </div>
          {viewerRole === "customer" && target && (
            <p className="text-[10px] text-primary">
              ✉️ سيتم إرسال رسالتك التالية لهذا المزود فقط — اضغط مرة أخرى لإلغاء التحديد
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="h-[300px]" ref={scrollRef as any}>
        <div className="p-3 space-y-2">
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
          {messages.map((m) => {
            const mine = m.sender_id === viewerId;
            const isPrivate = m.target_provider_id != null;
            const hidden = isPrivate && viewerRole === "provider" && m.target_provider_id !== viewerId && !mine;
            if (hidden) return null;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={m.sender_avatar || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {m.sender_role === "customer" ? "👤" : "🩺"}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] opacity-70 font-medium">{m.sender_display_name}</span>
                    {isPrivate && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">خاص</Badge>}
                  </div>
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  {m.quoted_price && (
                    <Badge variant="outline" className={`mt-1 text-[10px] gap-0.5 ${mine ? "bg-primary-foreground/20 border-primary-foreground/30" : ""}`}>
                      <DollarSign className="h-2.5 w-2.5" />السعر المقترح: {m.quoted_price} JOD
                    </Badge>
                  )}
                  <p className="text-[9px] opacity-60 mt-0.5">
                    {new Date(m.created_at).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
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
