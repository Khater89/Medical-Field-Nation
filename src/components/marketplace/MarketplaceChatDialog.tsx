import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, MessagesSquare, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendorId: string;
  vendorName: string;
  productId?: string | null;
  productName?: string | null;
}

interface Msg {
  id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  created_at: string;
}

export default function MarketplaceChatDialog({ open, onOpenChange, vendorId, vendorName, productId, productName }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Identification gate
  const [identified, setIdentified] = useState(false);
  const [identName, setIdentName] = useState("");
  const [identPhone, setIdentPhone] = useState("");
  const [identConsent, setIdentConsent] = useState(false);
  const [savingIdent, setSavingIdent] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("marketplace_open_or_get_chat", {
        _vendor_id: vendorId,
        _product_id: productId || null,
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      const cid = data as unknown as string;
      setChatId(cid);

      // Fetch chat to determine if identity is set
      const { data: chatRow } = await supabase
        .from("marketplace_chats")
        .select("customer_name, customer_phone, customer_consent_at")
        .eq("id", cid).maybeSingle();

      const hasIdent = !!(chatRow?.customer_name && chatRow?.customer_phone && chatRow?.customer_consent_at);
      setIdentified(hasIdent);
      if (!hasIdent) {
        setIdentName(chatRow?.customer_name || profile?.full_name || "");
        setIdentPhone(chatRow?.customer_phone || profile?.phone || "");
      }

      const { data: msgs } = await supabase
        .from("marketplace_messages")
        .select("*").eq("chat_id", cid).order("created_at", { ascending: true });
      setMessages((msgs as Msg[]) || []);
      setLoading(false);
    })();
  }, [open, user, vendorId, productId, profile]);

  useEffect(() => {
    if (!chatId || !identified) return;
    const ch = supabase
      .channel(`mp_chat:${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_messages", filter: `chat_id=eq.${chatId}` },
        (p) => setMessages((prev) => [...prev, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId, identified]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const saveIdentity = async () => {
    if (!chatId) return;
    if (identName.trim().length < 2) return toast.error("الرجاء إدخال الاسم الكامل");
    if (identPhone.trim().length < 7) return toast.error("الرجاء إدخال رقم الهاتف");
    if (!identConsent) return toast.error("الرجاء الموافقة على التواصل داخل المنصة");
    setSavingIdent(true);
    const { error } = await supabase.rpc("marketplace_set_chat_identity", {
      _chat_id: chatId, _name: identName.trim(), _phone: identPhone.trim(),
    });
    setSavingIdent(false);
    if (error) return toast.error(error.message);
    setIdentified(true);
  };

  const send = async () => {
    if (!chatId || !input.trim()) return;
    setSending(true);
    const { error } = await supabase.rpc("marketplace_send_message", { _chat_id: chatId, _body: input.trim() });
    setSending(false);
    if (error) return toast.error(error.message);
    setInput("");
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تسجيل الدخول مطلوب</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">سجّل دخولك للتواصل مع المتجر.</p>
          <Button onClick={() => navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`)}>تسجيل الدخول</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-primary" /> {vendorName}
          </DialogTitle>
          {productName && <div className="text-xs text-muted-foreground">حول: {productName}</div>}
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !identified ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-xs flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>للتواصل مع المتجر، يرجى تعريفنا بنفسك. تظهر هذه البيانات للجهة البائعة فقط لتسهيل الرد عليك.</span>
            </div>
            <div className="space-y-1">
              <Label>الاسم الكامل *</Label>
              <Input value={identName} onChange={(e) => setIdentName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>رقم الهاتف *</Label>
              <Input value={identPhone} onChange={(e) => setIdentPhone(e.target.value)} placeholder="07XXXXXXXX" />
            </div>
            <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border p-2">
              <Checkbox checked={identConsent} onCheckedChange={(v) => setIdentConsent(Boolean(v))} className="mt-0.5" />
              <span className="text-xs">أوافق على التواصل داخل المنصة ومشاركة اسمي ورقم هاتفي مع الجهة البائعة لغرض الاستفسار.</span>
            </label>
            <Button className="w-full" onClick={saveIdentity} disabled={savingIdent}>
              {savingIdent ? <Loader2 className="h-4 w-4 animate-spin" /> : "متابعة وبدء الدردشة"}
            </Button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground pt-8">ابدأ المحادثة بكتابة رسالتك أدناه.</div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="اكتب رسالتك..."
              />
              <Button onClick={send} disabled={sending || !input.trim()} size="icon">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
