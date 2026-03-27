import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle, MessageCircle, Copy, Key, Clock, XCircle, Info } from "lucide-react";
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

type NotifCategory = "all" | "otp" | "late" | "reject" | "other";

const categorize = (n: StaffNotification): NotifCategory => {
  if (n.title.includes("🔑")) return "otp";
  if (n.title.includes("تأخر") || n.title.includes("⏰")) return "late";
  if (n.title.includes("رفض") || n.title.includes("🚨")) return "reject";
  return "other";
};

const CATEGORY_CONFIG: Record<NotifCategory, { label: string; icon: React.ReactNode }> = {
  all: { label: "الكل", icon: <Bell className="h-3 w-3" /> },
  otp: { label: "أكواد", icon: <Key className="h-3 w-3" /> },
  late: { label: "تأخير", icon: <Clock className="h-3 w-3" /> },
  reject: { label: "رفض", icon: <XCircle className="h-3 w-3" /> },
  other: { label: "عام", icon: <Info className="h-3 w-3" /> },
};

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
  const [activeTab, setActiveTab] = useState<NotifCategory>("all");

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("staff_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as unknown as StaffNotification[]) || []);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = activeTab === "all" ? notifications : notifications.filter((n) => categorize(n) === activeTab);

  const unreadByCategory = (cat: NotifCategory) => {
    if (cat === "all") return unreadCount;
    return notifications.filter((n) => !n.read && categorize(n) === cat).length;
  };

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

  const renderNotification = (n: StaffNotification) => {
    const otp = extractOTP(n.body);
    const phone = extractPhone(n.body);
    const customerName = extractCustomerName(n.body);
    const isOTP = isOTPNotification(n);
    const cat = categorize(n);

    const borderColor = cat === "otp" ? "border-s-warning" : cat === "late" ? "border-s-destructive" : cat === "reject" ? "border-s-orange-500" : "border-s-primary";

    return (
      <div
        key={n.id}
        className={`px-3 py-2.5 transition-colors border-s-4 ${borderColor} ${!n.read ? "bg-primary/5" : ""}`}
      >
        <div className="cursor-pointer" onClick={() => { markRead(n.id); if (n.booking_id) { setOpen(false); onOpenBooking?.(n.booking_id); } }}>
          <p className={`text-xs font-medium ${isOTP ? "text-warning" : cat === "late" ? "text-destructive" : cat === "reject" ? "text-orange-600" : ""}`}>{n.title}</p>
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
  };

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
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h4 className="text-sm font-bold">{t("notifications.title")}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllRead}>
              <CheckCircle className="h-3 w-3 me-1" /> {t("notifications.mark_read")}
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotifCategory)} dir="rtl">
          <TabsList className="w-full rounded-none border-b bg-transparent h-9 px-1">
            {(["all", "otp", "late", "reject", "other"] as NotifCategory[]).map((cat) => {
              const count = unreadByCategory(cat);
              return (
                <TabsTrigger key={cat} value={cat} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-muted">
                  {CATEGORY_CONFIG[cat].icon}
                  {CATEGORY_CONFIG[cat].label}
                  {count > 0 && (
                    <span className="bg-destructive text-destructive-foreground rounded-full text-[9px] px-1 min-w-[14px] text-center">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <ScrollArea className="max-h-[400px]">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("notifications.no_notifications")}</p>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(renderNotification)}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
