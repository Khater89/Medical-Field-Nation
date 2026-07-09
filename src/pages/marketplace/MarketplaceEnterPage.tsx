import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import BackButton from "@/components/ui/back-button";
import { UserRound, UserPlus, LogIn, ShoppingBag, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LS_NAME = "mp_guest_name";
const LS_PHONE = "mp_guest_phone";
const LS_SESSION = "mp_guest_session_token";
const LS_PHONE_NORM = "mp_guest_phone_norm";

export default function MarketplaceEnterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [guestOpen, setGuestOpen] = useState(false);
  const [name, setName] = useState(localStorage.getItem(LS_NAME) || "");
  const [phone, setPhone] = useState(localStorage.getItem(LS_PHONE) || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/marketplace", { replace: true });
  }, [loading, user, navigate]);

  const enterAsGuest = async () => {
    const trimmedName = name.trim();
    const digits = phone.replace(/\D+/g, "");
    if (trimmedName.length < 2) return toast.error(t("mp.enter.toast_name"));
    if (digits.length < 9) return toast.error(t("mp.enter.toast_phone"));
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-guest", {
        body: { action: "guest_login", name: trimmedName, phone: phone.trim() },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || t("mp.enter.toast_failed"));
        return;
      }
      localStorage.setItem(LS_NAME, trimmedName);
      localStorage.setItem(LS_PHONE, phone.trim());
      localStorage.setItem(LS_SESSION, data.session_token);
      localStorage.setItem(LS_PHONE_NORM, data.phone_norm);
      toast.success(t("mp.enter.toast_welcome").replace("{name}", trimmedName));
      setGuestOpen(false);
      navigate("/marketplace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="container max-w-3xl py-8">
        <BackButton to="/" />
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t("mp.enter.title")}</h1>
          <p className="text-muted-foreground">{t("mp.enter.subtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => setGuestOpen(true)}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 items-center justify-center mb-3">
              <UserRound className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">{t("mp.enter.as_guest_title")}</h3>
            <p className="text-xs text-muted-foreground">{t("mp.enter.as_guest_desc")}</p>
          </Card>

          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => navigate("/auth?mode=signup&redirect=/marketplace")}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 items-center justify-center mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">{t("mp.enter.signup_title")}</h3>
            <p className="text-xs text-muted-foreground">{t("mp.enter.signup_desc")}</p>
          </Card>

          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => navigate("/auth?mode=login&redirect=/marketplace")}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 items-center justify-center mb-3">
              <LogIn className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">{t("mp.enter.login_title")}</h3>
            <p className="text-xs text-muted-foreground">{t("mp.enter.login_desc")}</p>
          </Card>
        </div>
      </div>

      <Dialog open={guestOpen} onOpenChange={setGuestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mp.enter.dialog_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("mp.gmsg.full_name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mp.enter.name_placeholder")} />
            </div>
            <div>
              <Label>{t("mp.gmsg.phone")}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("mp.gmsg.phone_placeholder")}
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("mp.enter.phone_hint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuestOpen(false)}>{t("mp.enter.cancel")}</Button>
            <Button onClick={enterAsGuest} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("mp.enter.enter")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
