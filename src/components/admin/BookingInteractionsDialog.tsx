import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, DollarSign, Clock, User, AlertCircle } from "lucide-react";

interface Interaction {
  provider_id: string;
  full_name: string;
  role_type: string | null;
  avatar_url: string | null;
  message_count: number;
  last_message: string | null;
  last_message_at: string | null;
  quote_price: number | null;
  quote_note: string | null;
  quote_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  doctor: "طبيب", nurse: "ممرض/ة", physiotherapist: "معالج طبيعي", caregiver: "مقدم رعاية",
};

interface Props {
  bookingId: string | null;
  bookingNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingInteractionsDialog({ bookingId, bookingNumber, open, onOpenChange }: Props) {
  const [data, setData] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bookingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Try the RPC first (preferred path)
        const rpcRes = await supabase.rpc("booking_interactions_summary" as any, { _booking_id: bookingId });
        if (!rpcRes.error && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
          if (!cancelled) setData(rpcRes.data as any);
          return;
        }
        if (rpcRes.error) console.warn("[interactions] RPC failed, falling back:", rpcRes.error);

        // 2) Fallback: build the summary client-side from raw tables (admin RLS allows it)
        const [msgsRes, quotesRes] = await Promise.all([
          supabase.from("booking_messages")
            .select("sender_id, sender_role, body, created_at")
            .eq("booking_id", bookingId)
            .eq("sender_role", "provider")
            .order("created_at", { ascending: true }),
          supabase.from("provider_quotes")
            .select("provider_id, quoted_price, note, created_at")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: true }),
        ]);

        if (msgsRes.error) throw msgsRes.error;
        if (quotesRes.error) throw quotesRes.error;

        const msgs = msgsRes.data || [];
        const quotes = quotesRes.data || [];
        const providerIds = Array.from(new Set([
          ...msgs.map((m: any) => m.sender_id).filter(Boolean),
          ...quotes.map((q: any) => q.provider_id).filter(Boolean),
        ]));

        if (providerIds.length === 0) {
          if (!cancelled) setData([]);
          return;
        }

        const profRes = await supabase.from("profiles")
          .select("user_id, full_name, role_type, avatar_url")
          .in("user_id", providerIds);
        const profMap = new Map((profRes.data || []).map((p: any) => [p.user_id, p]));

        const out: Interaction[] = providerIds.map((pid) => {
          const pMsgs = msgs.filter((m: any) => m.sender_id === pid);
          const pQuotes = quotes.filter((q: any) => q.provider_id === pid);
          const lastMsg = pMsgs[pMsgs.length - 1];
          const lastQuote = pQuotes[pQuotes.length - 1];
          const prof: any = profMap.get(pid) || {};
          return {
            provider_id: pid,
            full_name: prof.full_name || "مزود",
            role_type: prof.role_type || null,
            avatar_url: prof.avatar_url || null,
            message_count: pMsgs.length,
            last_message: lastMsg?.body || null,
            last_message_at: lastMsg?.created_at || null,
            quote_price: lastQuote?.quoted_price ?? null,
            quote_note: lastQuote?.note || null,
            quote_at: lastQuote?.created_at || null,
          };
        });

        if (!cancelled) setData(out);
      } catch (e: any) {
        console.error("[interactions] failed:", e);
        if (!cancelled) {
          setError(e?.message || "تعذّر تحميل البيانات");
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, bookingId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">المزودون الذين تفاعلوا مع الطلب</DialogTitle>
          <DialogDescription className="text-xs">
            {bookingNumber && <span dir="ltr" className="font-mono">{bookingNumber}</span>}
            {" — ملخص رسائل وعروض جميع المزودين على هذا الطلب"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-destructive text-sm">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">لا يوجد أي تفاعل من المزودين بعد.</div>
        ) : (
          <div className="space-y-3 pt-2">
            {data.map((it) => (
              <div key={it.provider_id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={it.avatar_url || undefined} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{it.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {it.role_type && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ROLE_LABELS[it.role_type] || it.role_type}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-2.5 w-2.5" /> {it.message_count} رسالة
                      </span>
                      {it.quote_price != null && (
                        <Badge variant="outline" className="text-[10px] gap-0.5 text-success border-success/40">
                          <DollarSign className="h-2.5 w-2.5" /> {it.quote_price} JOD
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {it.last_message && (
                  <div className="rounded bg-background border p-2 text-xs">
                    <p className="line-clamp-3 break-words">{it.last_message}</p>
                    {it.last_message_at && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(it.last_message_at).toLocaleString("ar-JO", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                )}

                {it.quote_note && (
                  <div className="rounded bg-success/5 border border-success/20 p-2 text-xs">
                    <p className="text-[10px] font-bold text-success mb-0.5">عرض السعر:</p>
                    <p className="line-clamp-3 break-words">{it.quote_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
