import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, DollarSign, User } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  doctor: "طبيب", nurse: "ممرض/ة", physiotherapist: "معالج طبيعي", caregiver: "مقدم رعاية",
};

interface Msg {
  id: string;
  sender_id: string;
  sender_role: string;
  sender_display_name: string;
  body: string;
  quoted_price: number | null;
  target_provider_id: string | null;
  created_at: string;
  sender_avatar: string | null;
}

interface Props {
  bookingId: string | null;
  bookingNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingMessagesDialog({ bookingId, bookingNumber, open, onOpenChange }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !bookingId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.rpc("list_booking_messages" as any, { _booking_id: bookingId });
      const msgs = (data as any[]) || [];
      setMessages(msgs);
      // Fetch provider role types
      const ids = Array.from(new Set(msgs.filter(m => m.sender_role === "provider").map(m => m.sender_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, role_type").in("user_id", ids);
        const rm: Record<string, string> = {};
        (profs || []).forEach((p: any) => { if (p.role_type) rm[p.user_id] = p.role_type; });
        setRoleMap(rm);
      }
      setLoading(false);
    })();
  }, [open, bookingId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            رسائل الطلب
          </DialogTitle>
          <DialogDescription className="text-xs">
            {bookingNumber && <span dir="ltr" className="font-mono">{bookingNumber}</span>}
            {" — جميع الرسائل بين العميل والمزودين على هذا الطلب فقط"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">لا توجد رسائل بعد على هذا الطلب.</div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3">
              {messages.map((m) => {
                const isCustomer = m.sender_role === "customer";
                const role = roleMap[m.sender_id];
                return (
                  <div key={m.id} className={`flex gap-2 ${isCustomer ? "" : "flex-row-reverse"}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={m.sender_avatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {isCustomer ? "👤" : "🩺"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isCustomer ? "bg-primary/10 border border-primary/20" : "bg-success/10 border border-success/20"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[11px] font-bold">{m.sender_display_name}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                          {isCustomer ? "عميل" : "مزود"}
                        </Badge>
                        {!isCustomer && role && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        )}
                        {m.target_provider_id && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">خاصة</Badge>
                        )}
                      </div>
                      <p className="break-words whitespace-pre-wrap">{m.body}</p>
                      {m.quoted_price != null && (
                        <Badge variant="outline" className="mt-1 text-[10px] gap-0.5 text-success border-success/40">
                          <DollarSign className="h-2.5 w-2.5" />
                          {m.quoted_price} JOD
                        </Badge>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(m.created_at).toLocaleString("ar-JO", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
