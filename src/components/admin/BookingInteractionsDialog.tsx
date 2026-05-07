import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, DollarSign, Clock, User } from "lucide-react";

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

  useEffect(() => {
    if (!open || !bookingId) return;
    setLoading(true);
    supabase.rpc("booking_interactions_summary" as any, { _booking_id: bookingId })
      .then(({ data }) => { setData((data as any) || []); setLoading(false); });
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
                    <div className="flex items-center gap-2 mt-0.5">
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
