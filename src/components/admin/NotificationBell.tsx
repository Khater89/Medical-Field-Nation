import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, CheckCircle, MessageCircle, Copy, Key } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface StaffNotification {
  id: string;
  target_role: string;
  title: string;
  body: string | null;
  booking_id: string | null;
  provider_id: string | null;
  read: boolean;
  created_at: string;
}

/** Extract OTP code from notification body */
const extractOTP = (body: string | null): string | null => {
  if (!body) return null;
  const match = body.match(/كود التأكيد:\s*(\d{4})/);
  return match ? match[1] : null;
};

/** Extract customer phone from notification body */
const extractPhone = (body: string | null): string | null => {
  if (!body) return null;
  const match = body.match(/(\d{10,13})/);
  return match ? match[1] : null;
};

/** Extract customer name from notification body */
const extractCustomerName = (body: string | null): string | null => {
  if (!body) return null;
  const match = body.match(/العميل:\s*([^—\n]+)/);
  return match ? match[1].trim() : null;
};

const NotificationBell = ({ onOpenBooking }: { onOpenBooking?: (bookingId: string) => void }) => {
  const { t, formatDateShort } = useLanguage();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("staff_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as unknown as StaffNotification[]) || []);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from("staff_notifications" as any).update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("staff_notifications" as any).update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const copyOTP = (otp: string) => {
    navigator.clipboard.writeText(otp);
    toast.success(`تم نسخ الكود: ${otp}`);
  };

  const sendOTPviaWhatsApp = (phone: string, otp: string, customerName: string | null) => {
    const cleanPhone = phone.replace(/^0/, "962");
    const msg = `مرحباً ${customerName || ""}، كود تأكيد إنهاء الخدمة هو: *${otp}*\nيرجى إعطاء هذا الكود لمقدم الخدمة عند الانتهاء.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const isOTPNotification = (n: StaffNotification) => n.title.includes("🔑");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h4 className="text-sm font-bold">{t("notifications.title")}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllRead}>
              <CheckCircle className="h-3 w-3 me-1" /> {t("notifications.mark_read")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("notifications.no_notifications")}</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const otp = extractOTP(n.body);
                const phone = extractPhone(n.body);
                const customerName = extractCustomerName(n.body);
                const isOTP = isOTPNotification(n);

                return (
                  <div
                    key={n.id}
                    className={`px-3 py-2.5 transition-colors ${!n.read ? "bg-primary/5" : ""} ${isOTP ? "border-s-4 border-s-warning bg-warning/5" : ""}`}
                  >
                    <div className="cursor-pointer" onClick={() => { markRead(n.id); if (n.booking_id) { setOpen(false); onOpenBooking?.(n.booking_id); } }}>
                      <p className={`text-xs font-medium ${isOTP ? "text-warning" : ""}`}>{n.title}</p>
                      {n.body && !isOTP && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                    </div>

                    {/* OTP Special UI */}
                    {isOTP && otp && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-warning/10 border border-warning/30 py-2 px-3">
                          <Key className="h-4 w-4 text-warning" />
                          <span className="text-xl font-bold tracking-[0.3em] text-warning" dir="ltr">{otp}</span>
                        </div>
                        {customerName && (
                          <p className="text-[11px] text-muted-foreground">
                            العميل: <strong>{customerName}</strong> {phone ? `— ${phone}` : ""}
                          </p>
                        )}
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-[10px] flex-1"
                            onClick={() => copyOTP(otp)}
                          >
                            <Copy className="h-3 w-3" /> نسخ الكود
                          </Button>
                          {phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 text-[10px] flex-1"
                              onClick={() => sendOTPviaWhatsApp(phone, otp, customerName)}
                            >
                              <MessageCircle className="h-3 w-3" /> إرسال واتساب
                            </Button>
                          )}
                          {phone && (
                            <a href={`tel:${phone}`}>
                              <Button size="sm" variant="outline" className="gap-1 h-7 text-[10px]">
                                📞
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-1">{formatDateShort(n.created_at)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
