import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import BackButton from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessagesSquare, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MarketplaceChatDialog from "@/components/marketplace/MarketplaceChatDialog";
import { useLanguage } from "@/contexts/LanguageContext";

const LS_NAME = "mp_guest_name";
const LS_PHONE = "mp_guest_phone";
const LS_SESSION = "mp_guest_session_token";
const LS_PHONE_NORM = "mp_guest_phone_norm";

const VENDOR_TYPE_LABEL_KEYS: Record<string, string> = {
  pharmacy: "mp.vendor_type.pharmacy_single",
  medical_devices: "mp.vendor_type.medical_devices_single",
  prosthetics: "mp.vendor_type.prosthetics_single",
};

export default function GuestMessagesPage() {
  const { t, formatDateShort } = useLanguage();
  const [name, setName] = useState(localStorage.getItem(LS_NAME) || "");
  const [phone, setPhone] = useState(localStorage.getItem(LS_PHONE) || "");
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem(LS_SESSION));
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => {
    if (sessionToken) loadChats(sessionToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChats = async (tok: string) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("mp-guest", {
      body: { action: "list_my_chats", session_token: tok },
    });
    setLoading(false);
    if (error || data?.error) {
      if (data?.error === "session_invalid") {
        localStorage.removeItem(LS_SESSION);
        setSessionToken(null);
      } else {
        toast.error(data?.error || error?.message || t("mp.gmsg.toast_error"));
      }
      return;
    }
    setChats(data.chats || []);
    if (data.name && !name) setName(data.name);
  };

  const login = async () => {
    if (name.trim().length < 2) return toast.error(t("mp.gmsg.toast_name_required"));
    if (phone.replace(/\D/g, "").length < 7) return toast.error(t("mp.gmsg.toast_invalid_phone"));
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("mp-guest", {
      body: { action: "guest_login", name: name.trim(), phone: phone.trim() },
    });
    setLoading(false);
    if (error || data?.error) return toast.error(data?.error || error?.message || t("mp.gmsg.toast_error"));
    localStorage.setItem(LS_NAME, name.trim());
    localStorage.setItem(LS_PHONE, phone.trim());
    localStorage.setItem(LS_SESSION, data.session_token);
    localStorage.setItem(LS_PHONE_NORM, data.phone_norm);
    setSessionToken(data.session_token);
    await loadChats(data.session_token);
  };

  const signOut = () => {
    localStorage.removeItem(LS_SESSION);
    setSessionToken(null);
    setChats([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader /><MarketplaceSubNav />
      <main className="container max-w-2xl py-6 flex-1 space-y-4">
        <BackButton to="/marketplace" label={t("mp.back")} />
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-primary" /> {t("mp.gmsg.title")}
        </h1>

        {!sessionToken ? (
          <Card className="p-5 space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-xs flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{t("mp.gmsg.login_hint")}</span>
            </div>
            <div className="space-y-1">
              <Label>{t("mp.gmsg.full_name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mp.gmsg.name_placeholder")} />
            </div>
            <div className="space-y-1">
              <Label>{t("mp.gmsg.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("mp.gmsg.phone_placeholder")} inputMode="tel" />
            </div>
            <Button className="w-full" onClick={login} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("mp.gmsg.login_button")}
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {name || localStorage.getItem(LS_NAME)} · <span dir="ltr">{phone || localStorage.getItem(LS_PHONE)}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut className="h-4 w-4 ms-1" /> {t("mp.gmsg.signout")}
              </Button>
            </div>
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : chats.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                {t("mp.gmsg.no_chats")}
              </Card>
            ) : (
              <div className="space-y-2">
                {chats.map((c) => (
                  <Card key={c.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive(c)}>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                        {c.vendor?.logo_url ? <img src={c.vendor.logo_url} alt="" className="w-full h-full object-cover" /> : <MessagesSquare className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm truncate">{c.vendor?.store_name || t("mp.store")}</div>
                          {c.vendor?.vendor_type && <Badge variant="outline" className="text-[10px]">{VENDOR_TYPE_LABEL_KEYS[c.vendor.vendor_type] ? t(VENDOR_TYPE_LABEL_KEYS[c.vendor.vendor_type]) : c.vendor.vendor_type}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.last_message_preview || "-"}</div>
                        <div className="text-[10px] text-muted-foreground">{c.last_message_at ? formatDateShort(c.last_message_at) : ""}</div>
                      </div>
                      {c.unread_for_customer > 0 && <Badge>{c.unread_for_customer}</Badge>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <AppFooter />
      {active && (
        <MarketplaceChatDialog
          open={!!active}
          onOpenChange={(v) => {
            if (!v) {
              setActive(null);
              if (sessionToken) loadChats(sessionToken);
            }
          }}
          vendorId={active.vendor_id}
          vendorName={active.vendor?.store_name || t("mp.store")}
          productId={active.product_id}
          initialChatId={active.id}
          initialGuestToken={active.guest_token}
        />
      )}
    </div>
  );
}
