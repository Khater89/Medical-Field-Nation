import { useEffect, useState, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ProviderNotification {
  id: string;
  booking_id: string | null;
  type: "ONE_HOUR_BEFORE" | "DUE_NOW" | "OVERDUE_REMINDER";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

const TYPE_ICON: Record<string, string> = {
  ONE_HOUR_BEFORE: "⏰",
  DUE_NOW: "🔔",
  OVERDUE_REMINDER: "⚠️",
};

export default function ProviderNotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProviderNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("provider_notifications")
      .select("*")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as any) || []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`provider_notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "provider_notifications",
          filter: `provider_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as ProviderNotification;
          setItems((prev) => [n, ...prev].slice(0, 30));
          toast({ title: n.title, description: n.message });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "provider_notifications",
          filter: `provider_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as ProviderNotification;
          setItems((prev) => prev.map((x) => (x.id === n.id ? n : x)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const unread = items.filter((i) => !i.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("provider_notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("provider_notifications")
      .update({ is_read: true })
      .eq("provider_id", user.id)
      .eq("is_read", false);
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const onClick = async (n: ProviderNotification) => {
    if (!n.is_read) await markRead(n.id);
    setOpen(false);
    if (n.booking_id) {
      navigate(`/provider?booking=${n.booking_id}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -end-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">التنبيهات</h4>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">لا توجد تنبيهات بعد</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => onClick(n)}
                className={`w-full text-start p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">{TYPE_ICON[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold truncate">{n.title}</p>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("ar-JO", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.id);
                      }}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="تعليم كمقروء"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
