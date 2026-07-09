import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessagesSquare } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import MarketplaceChatDialog from "@/components/marketplace/MarketplaceChatDialog";

export default function MarketplaceMessagesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_chats")
      .select("*, vendor:marketplace_vendors(id,store_name,logo_url)")
      .eq("customer_user_id", user.id)
      .order("last_message_at", { ascending: false });
    setChats(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader /><MarketplaceSubNav />
      <main className="container max-w-3xl py-6 flex-1 space-y-3">
        <BackButton to="/marketplace" label={t("mp.back")} />
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessagesSquare className="h-5 w-5" /> {t("mp.messages.title_authed")}</h1>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : chats.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t("mp.messages.no_chats")}</Card>
        ) : (
          <div className="space-y-2">
            {chats.map((c) => (
              <Card key={c.id} className="p-3 cursor-pointer hover:shadow-md" onClick={() => setActive(c)}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 overflow-hidden flex items-center justify-center">
                    {c.vendor?.logo_url ? <img src={c.vendor.logo_url} alt="" className="w-full h-full object-cover" /> : <MessagesSquare className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{c.vendor?.store_name || t("mp.store")}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.last_message_preview || "-"}</div>
                  </div>
                  {c.unread_for_customer > 0 && <Badge>{c.unread_for_customer}</Badge>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
      {active && (
        <MarketplaceChatDialog
          open={!!active}
          onOpenChange={(v) => { if (!v) { setActive(null); load(); } }}
          vendorId={active.vendor_id}
          vendorName={active.vendor?.store_name || t("mp.store")}
          productId={active.product_id}
        />
      )}
    </div>
  );
}
