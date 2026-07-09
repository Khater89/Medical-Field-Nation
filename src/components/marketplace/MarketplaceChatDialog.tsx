import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Send, MessagesSquare, ShieldCheck, Paperclip } from "lucide-react";
import { toast } from "sonner";
import ChatAttachment from "./ChatAttachment";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendorId: string;
  vendorName: string;
  productId?: string | null;
  productName?: string | null;
  initialChatId?: string | null;
  initialGuestToken?: string | null;
}

interface Msg {
  id: string;
  sender_id: string | null;
  sender_role: string;
  sender_name?: string | null;
  body: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

const LS_NAME = "mp_guest_name";
const LS_PHONE = "mp_guest_phone";
const tokenKey = (vendorId: string, productId?: string | null) =>
  `mp_guest_token:${vendorId}:${productId || "none"}`;

const fileToBase64 = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = (r.result as string).split(",")[1] || "";
      resolve(s);
    };
    r.onerror = reject;
    r.readAsDataURL(f);
  });

export default function MarketplaceChatDialog({ open, onOpenChange, vendorId, vendorName, productId, productName, initialChatId, initialGuestToken }: Props) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [identified, setIdentified] = useState(false);
  const [opening, setOpening] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(localStorage.getItem(LS_NAME) || "");
    setPhone(localStorage.getItem(LS_PHONE) || "");
    if (initialChatId && initialGuestToken) {
      setChatId(initialChatId);
      setGuestToken(initialGuestToken);
      localStorage.setItem(tokenKey(vendorId, productId), initialGuestToken);
      setIdentified(true);
      setMessages([]);
      loadMessages(initialChatId, initialGuestToken);
      return;
    }
    const tok = localStorage.getItem(tokenKey(vendorId, productId));
    setGuestToken(tok);
    setIdentified(false);
    setChatId(null);
    setMessages([]);
    const savedName = localStorage.getItem(LS_NAME);
    const savedPhone = localStorage.getItem(LS_PHONE);
    if (tok && savedName && savedPhone) openChat(savedName, savedPhone, tok);
  }, [open, vendorId, productId, initialChatId, initialGuestToken]);

  const loadMessages = async (targetChatId: string, token: string) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("mp-guest", {
      body: { action: "list_messages", chat_id: targetChatId, guest_token: token },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "تعذّر تحميل الرسائل");
      setMessages([]);
    } else {
      setMessages((data?.messages as Msg[]) || []);
    }
    setLoading(false);
  };

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
    await loadMessages(data.chat_id, data.guest_token);
  };

  // Guest customers have no authenticated Supabase session, so realtime RLS
  // blocks marketplace_messages inserts from reaching them. We poll the
  // mp-guest edge function instead so vendor replies arrive reliably.
  useEffect(() => {
    if (!chatId || !guestToken || !open) return;
    let cancelled = false;
    const poll = async () => {
      const { data } = await supabase.functions.invoke("mp-guest", {
        body: { action: "list_messages", chat_id: chatId, guest_token: guestToken },
      });
      if (cancelled || !data?.messages) return;
      setMessages((prev) => {
        const incoming = data.messages as Msg[];
        if (incoming.length === prev.length && incoming.every((m, i) => m.id === prev[i]?.id)) {
          return prev;
        }
        return incoming;
      });
    };
    const interval = setInterval(poll, 3500);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [chatId, guestToken, open]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const handleIdentify = async () => {
    if (name.trim().length < 2) return toast.error("الرجاء إدخال الاسم الكامل");
    if (phone.replace(/\D/g, "").length < 7) return toast.error("الرجاء إدخال رقم هاتف صحيح");
    await openChat(name.trim(), phone.trim(), guestToken);
  };

  const sendPayload = async (extra: { body?: string; attachment_url?: string; attachment_type?: string; attachment_name?: string }) => {
    const { data, error } = await supabase.functions.invoke("mp-guest", {
      body: {
        action: "send_message", chat_id: chatId, guest_token: guestToken,
        body: extra.body || "",
        attachment_url: extra.attachment_url || null,
        attachment_type: extra.attachment_type || null,
        attachment_name: extra.attachment_name || null,
      },
    });
    if (error || data?.error) { toast.error(data?.error || error?.message || "تعذّر الإرسال"); return false; }
    if (data?.message) setMessages((prev) => prev.find((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
    return true;
  };

  const send = async () => {
    if (!chatId || !guestToken || !input.trim()) return;
    setSending(true);
    const text = input.trim();
    const ok = await sendPayload({ body: text });
    setSending(false);
    if (ok) setInput("");
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !chatId || !guestToken) return;
    if (f.size > 10 * 1024 * 1024) return toast.error("الحد الأقصى 10MB");
    setUploading(true);
    try {
      const b64 = await fileToBase64(f);
      const { data, error } = await supabase.functions.invoke("mp-guest", {
        body: { action: "upload_attachment", chat_id: chatId, guest_token: guestToken, file_base64: b64, mime: f.type, filename: f.name },
      });
      if (error || data?.error) { toast.error(data?.error || error?.message || "فشل الرفع"); return; }
      await sendPayload({ attachment_url: data.url, attachment_type: data.type, attachment_name: data.name });
    } finally { setUploading(false); }
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
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground pt-8">ابدأ المحادثة بكتابة رسالتك أو إرسال مرفق.</div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_role === "customer";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                        {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                        {m.attachment_url && <ChatAttachment url={m.attachment_url} type={m.attachment_type} name={m.attachment_name} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t flex items-center gap-2">
              <input ref={fileRef} type="file" hidden onChange={onPickFile}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
              <Button type="button" size="icon" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || sending}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="اكتب رسالتك..." />
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
