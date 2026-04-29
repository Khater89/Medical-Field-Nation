import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Users, Loader2, MapPin, Phone, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    booking_number?: string | null;
    service_id: string;
    city: string;
    scheduled_at: string;
    area_public?: string | null;
    notes?: string | null;
    agreed_price?: number | null;
    client_address_text?: string | null;
  };
  serviceName: string;
  coordinatorPhone: string | null;
  serviceCategory?: string | null;
}

interface ProviderInfo {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  role_type: string | null;
  available_now: boolean | null;
  specialties: string[] | null;
}

const BroadcastProvidersDialog = ({ open, onOpenChange, booking, serviceName, coordinatorPhone, serviceCategory }: Props) => {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const isEmergency =
    (serviceCategory || "").toLowerCase() === "emergency" ||
    (serviceName || "").includes("طوارئ") ||
    (serviceName || "").toLowerCase().includes("emergency");

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, city, role_type, available_now, specialties")
        .eq("provider_status", "approved")
        .eq("profile_completed", true)
        .not("phone", "is", null);
      let list = (data as ProviderInfo[]) || [];
      if (isEmergency) {
        list = list.filter((p) =>
          (p.specialties || []).some((s) => (s || "").toLowerCase().includes("emergency") || s?.includes("طوارئ"))
        );
      }
      setProviders(list);
      setLoading(false);
    };
    fetch();
  }, [open, isEmergency]);

  const scheduledDate = new Date(booking.scheduled_at).toLocaleString("ar-JO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const siteUrl = "https://www.getmfn.com";

  const getTitlePrefix = (roleType: string | null) => {
    if (roleType === "طبيب" || roleType === "doctor") return "دكتور";
    if (roleType === "ممرض/ة" || roleType === "nurse") return "ممرض/ة";
    if (roleType === "أخصائي علاج طبيعي" || roleType === "physiotherapist") return "أخصائي";
    return "";
  };

  const buildMessage = (providerName: string, roleType: string | null) => {
    const prefix = getTitlePrefix(roleType);
    const greeting = prefix ? `مرحباً ${prefix} ${providerName}` : `مرحباً ${providerName}`;
    const lines = [
      `${greeting}، معك فريق أمة الحقل الطبي (MFN).`,
      ``,
      `📋 لدينا طلب خدمة جديد:`,
      `• الخدمة: ${serviceName}`,
      `• المدينة: ${booking.city}`,
      booking.area_public ? `• المنطقة: ${booking.area_public}` : null,
      booking.client_address_text ? `• العنوان التفصيلي: ${booking.client_address_text}` : null,
      `• الموعد: ${scheduledDate}`,
      booking.notes ? `• تفاصيل الحالة: ${booking.notes}` : null,
      ``,
      `📌 لتقديم عرض سعرك:`,
      `1. ادخل لحسابك في الموقع: ${siteUrl}/auth`,
      `2. اذهب لخانة "الطلبات المتاحة"`,
      `3. انقر على الطلب وقدّم عرض سعرك`,
      ``,
      coordinatorPhone ? `📞 للتواصل مع المنسق: ${coordinatorPhone}` : null,
      ``,
      `رقم الطلب: ${booking.booking_number || "—"}`,
    ];
    return lines.filter(Boolean).join("\n");
  };

  const getWaLink = (provider: ProviderInfo) => {
    const phone = (provider.phone || "").replace(/^0/, "962").replace(/\s/g, "");
    const msg = buildMessage(provider.full_name || "", provider.role_type);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            بث الطلب للمزودين
          </DialogTitle>
          <DialogDescription>
            أرسل تفاصيل الطلب لجميع المزودين المعتمدين عبر واتساب
          </DialogDescription>
        </DialogHeader>

        {/* Booking summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
          <p><strong>الخدمة:</strong> {serviceName}</p>
          <p><strong>المدينة:</strong> {booking.city}</p>
          <p><strong>الموعد:</strong> {scheduledDate}</p>
          {booking.booking_number && <p className="text-xs text-muted-foreground">{booking.booking_number}</p>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : providers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            {isEmergency ? "لا يوجد مزودون معتمدون لخدمة الطوارئ حالياً" : "لا يوجد مزودين معتمدين حالياً"}
          </p>
        ) : (
          <div className="space-y-2">
            {isEmergency && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs p-2 font-semibold text-center">
                🚨 يتم عرض مزودي الطوارئ فقط
              </div>
            )}
            <p className="text-xs text-muted-foreground">{providers.length} مزود</p>
            {providers.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between rounded-lg border border-border p-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name || "بدون اسم"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {p.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{p.city}</span>}
                    {p.role_type && <span>{p.role_type}</span>}
                    {p.available_now && <Badge variant="outline" className="text-[9px] h-4 bg-success/10 text-success border-success/30">متاح</Badge>}
                  </div>
                </div>
                <a href={getWaLink(p)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-success/30 text-success hover:bg-success/10">
                    <MessageCircle className="h-3.5 w-3.5" />
                    واتساب
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastProvidersDialog;
