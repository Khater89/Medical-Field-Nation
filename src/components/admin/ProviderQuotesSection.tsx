import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DollarSign, User, Clock, Star, CheckCheck, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Quote {
  id: string;
  provider_id: string;
  quoted_price: number;
  note: string | null;
  status: string;
  created_at: string;
  provider_name?: string;
  provider_phone?: string;
  provider_number?: number | null;
}

interface ProviderStats {
  completed: number;
  cancelled: number;
  avgRating: number | null;
  ratingCount: number;
}

interface Props {
  bookingId: string;
  onSelectQuote?: (providerId: string, quotedPrice: number) => void;
}

const ProviderQuotesSection = ({ bookingId, onSelectQuote }: Props) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerStats, setProviderStats] = useState<Record<string, ProviderStats>>({});

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("provider_quotes" as any)
        .select("*")
        .eq("booking_id", bookingId)
        .order("quoted_price", { ascending: true });

      if (data && data.length > 0) {
        const providerIds = (data as any[]).map((q: any) => q.provider_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, provider_number")
          .in("user_id", providerIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const enriched = (data as any[]).map((q: any) => ({
          ...q,
          provider_name: profileMap.get(q.provider_id)?.full_name || "غير معروف",
          provider_phone: profileMap.get(q.provider_id)?.phone || null,
          provider_number: profileMap.get(q.provider_id)?.provider_number || null,
        }));
        setQuotes(enriched);

        // Fetch stats for these providers
        const [bookingsRes, ratingsRes, clientCancelRes] = await Promise.all([
          supabase.from("bookings").select("id, assigned_provider_id, status")
            .in("assigned_provider_id", providerIds)
            .in("status", ["COMPLETED", "CANCELLED", "REJECTED"]),
          supabase.from("provider_ratings" as any).select("provider_id, rating")
            .in("provider_id", providerIds),
          supabase.from("booking_history").select("booking_id")
            .eq("action", "CANCELLED").eq("performer_role", "customer"),
        ]);

        const clientCancelledIds = new Set((clientCancelRes.data || []).map((h: any) => h.booking_id));

        const statsMap: Record<string, ProviderStats> = {};
        (bookingsRes.data || []).forEach((b: any) => {
          const pid = b.assigned_provider_id;
          if (!pid) return;
          if (!statsMap[pid]) statsMap[pid] = { completed: 0, cancelled: 0, avgRating: null, ratingCount: 0 };
          if (b.status === "COMPLETED") statsMap[pid].completed++;
          else if (!clientCancelledIds.has(b.id)) statsMap[pid].cancelled++;
        });
        (ratingsRes.data || []).forEach((r: any) => {
          const pid = r.provider_id;
          if (!statsMap[pid]) statsMap[pid] = { completed: 0, cancelled: 0, avgRating: null, ratingCount: 0 };
          statsMap[pid].ratingCount++;
          statsMap[pid].avgRating = statsMap[pid].avgRating
            ? (statsMap[pid].avgRating! * (statsMap[pid].ratingCount - 1) + r.rating) / statsMap[pid].ratingCount
            : r.rating;
        });
        setProviderStats(statsMap);
      } else {
        setQuotes([]);
      }
      setLoading(false);
    };
    fetch();
  }, [bookingId]);

  if (loading) return null;
  if (quotes.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
        <DollarSign className="h-3 w-3" /> عروض الأسعار ({quotes.length})
      </h4>
      {quotes.map((q) => {
        const stats = providerStats[q.provider_id];
        return (
          <div
            key={q.id}
            className={`rounded-lg border border-border bg-background p-2.5 text-sm space-y-1.5 ${onSelectQuote ? "cursor-pointer hover:bg-accent/50 hover:border-primary/40 transition-colors" : ""}`}
            onClick={() => onSelectQuote?.(q.provider_id, q.quoted_price)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-xs">{q.provider_name}</p>
                    {q.provider_number && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">
                        #{q.provider_number}
                      </Badge>
                    )}
                  </div>
                  {q.note && <p className="text-[10px] text-muted-foreground">{q.note}</p>}
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-primary">{q.quoted_price.toFixed(2)} JOD</p>
                <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(q.created_at).toLocaleString("ar-JO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            {/* Provider stats */}
            <TooltipProvider>
              <div className="flex items-center gap-3 text-[10px] border-t border-border/50 pt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 text-success">
                      <CheckCheck className="h-2.5 w-2.5" />
                      <span className="font-semibold">{stats?.completed || 0}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>طلبات مكتملة</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 text-destructive">
                      <XCircle className="h-2.5 w-2.5" />
                      <span className="font-semibold">{stats?.cancelled || 0}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>طلبات ملغاة/مرفوضة</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 text-warning">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      <span className="font-semibold">{stats?.avgRating ? stats.avgRating.toFixed(1) : "—"}</span>
                      {stats?.ratingCount ? <span className="text-muted-foreground">({stats.ratingCount})</span> : null}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>تقييم العملاء</TooltipContent>
                </Tooltip>
                {onSelectQuote && (
                  <span className="ms-auto text-primary text-[9px] font-medium">اضغط للإسناد ←</span>
                )}
              </div>
            </TooltipProvider>
          </div>
        );
      })}
    </div>
  );
};

export default ProviderQuotesSection;
