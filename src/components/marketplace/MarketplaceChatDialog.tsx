import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Send, MessagesSquare, ShieldCheck } from "lucide-react";
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
  sender_id: string | null;
  sender_role: string;
  sender_name?: string | null;
  body: string;
  created_at: string;
}

const LS_NAME = "mp_guest_name";
const LS_PHONE = "mp_guest_phone";
const tokenKey = (vendorId: string, productId?: string | null) =>
  `mp_guest_token:${vendorId}:${productId || "none"}`;

export default function MarketplaceChatDialog({ open, onOpenChange, vendorId, vendorName, productId, productName }: Props) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [identified, setIdentified] = useState(false);
  const [opening, setOpening] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(localStorage.getItem(LS_NAME) || "");
    setPhone(localStorage.getItem(LS_PHONE) || "");
    const tok = localStorage.getItem(tokenKey(vendorId, productId));
    setGuestToken(tok);
    setIdentified(false);
    setChatId(null);
    setMessages([]);
    // If we have token + identity already, auto-open
    const savedName = localStorage.getItem(LS_NAME);
    const savedPhone = localStorage.getItem(LS_PHONE);
    if (tok && savedName && savedPhone) {
      openChat(savedName, savedPhone, tok);
    }
  }, [open, vendorId, productId]);

  const openChat = async (n: string, p: string, tok: string | null) => {
    setOpening(true);
    const { data, error } = await supabase.functions.invoke("mp-guest", {
      body: { action: "open_chat", vendor_id: vendorId, product_id: productId || null, guest_token: tok, name: n, phone: p },
    });
    setOpening(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "تعذّر فتح المحادثة"); return; }
    setChatId(data.chat_id);
    setGuestToken(data.guest_token);
    localStorage.setItem(tokenKey(vendorId, productId), data.guest_token);
    localStorage.setItem(LS_NAME, n);
    localStorage.setItem(LS_PHONE, p);
    setIdentified(true);
    setLoading(true);
    const { data: ld } = await supabase.functions.invoke("mp-guest", {
      body: { action: "list_messages", chat_id: data.chat_id, guest_token: data.guest_token },
    });
    setMessages((ld?.messages as Msg[]) || []);
    setLoading(false);
  };

  // Realtime subscription on chat messages
  useEffect(() => {
    if (!chatId) return;
    const ch = supabase
      .channel(`mp_chat:${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_messages", filter: `chat_id=eq.${chatId}` },
        (p) => setMessages((prev) => prev.find((m) => m.id === (p.new as any).id) ? prev : [...prev, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const handleIdentify = async () => {
    if (name.trim().length < 2) return toast.error("الرجاء إدخال الاسم الكامل");
    if (phone.replace(/\D/g, "").length < 7) return toast.error("الرجاء إدخال رقم هاتف صحيح");
    await openChat(name.trim(), phone.trim(), guestToken);
  };

  const send = async () => {
    if (!chatId || !guestToken || !input.trim()) return;
    setSending(true);
    const text = input.trim();
    const { data, error } = await supabase.functions.invoke("mp-guest", {
      body: { action: "send_message", chat_id: chatId, guest_token: guestToken, body: text },
    });
    setSending(false);
    if (error || data?.error) return toast.error(data?.error || error?.message || "تعذّر الإرسال");
    setInput("");
    if (data?.message) setMessages((prev) => prev.find((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-primary" /> {vendorName}
          </DialogTitle>
          {productName && <div className="text-xs text-muted-foreground">حول: {productName}</div>}
        </DialogHeader>

        {!identified ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-xs flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>للتواصل مع المتجر، نحتاج فقط اسمك ورقم هاتفك. لا حاجة لإنشاء حساب أو تسجيل دخول.</span>
            </div>
            <div className="space-y-1">
              <Label>الاسم الكامل *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد محمد" />
            </div>
            <div className="space-y-1">
              <Label>رقم الهاتف *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" inputMode="tel" />
            </div>
            <Button className="w-full" onClick={handleIdentify} disabled={opening}>
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : "متابعة وبدء الدردشة"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              تظهر بياناتك للمتجر فقط لتسهيل الرد عليك.
            </p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground pt-8">ابدأ المحادثة بكتابة رسالتك أدناه.</div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_role === "customer";
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
