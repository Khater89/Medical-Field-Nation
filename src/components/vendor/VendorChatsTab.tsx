import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MessagesSquare, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";
import ChatAttachment from "@/components/marketplace/ChatAttachment";

export default function VendorChatsTab({ vendorId }: { vendorId: string }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadChats = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_chats")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("last_message_at", { ascending: false });
    setChats(data || []);
    setLoading(false);
  };

  useEffect(() => { loadChats(); }, [vendorId]);

  useEffect(() => {
    const ch = supabase
      .channel(`vendor_chats:${vendorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_chats", filter: `vendor_id=eq.${vendorId}` }, loadChats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vendorId]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const { data } = await supabase
        .from("marketplace_messages")
        .select("*")
        .eq("chat_id", active.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      supabase.rpc("marketplace_mark_chat_seen", { _chat_id: active.id });
    })();
    const ch = supabase
      .channel(`mp_msgs:${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_messages", filter: `chat_id=eq.${active.id}` },
        (p) => setMessages((prev) => prev.find((m) => m.id === (p.new as any).id) ? prev : [...prev, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const sendRpc = async (args: { body?: string; attachment_url?: string; attachment_type?: string; attachment_name?: string }) => {
    const { error } = await supabase.rpc("marketplace_send_message", {
      _chat_id: active.id,
      _body: args.body || "",
      _attachment_url: args.attachment_url || null,
      _attachment_type: args.attachment_type || null,
      _attachment_name: args.attachment_name || null,
    } as any);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const send = async () => {
    if (!active || !input.trim()) return;
    setSending(true);
    const ok = await sendRpc({ body: input.trim() });
    setSending(false);
    if (ok) setInput("");
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !active) return;
    if (f.size > 10 * 1024 * 1024) return toast.error("الحد الأقصى 10MB");
    setUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
      const path = `chats/${active.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("marketplace-chat").upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) { toast.error(up.error.message); return; }
      const signed = await supabase.storage.from("marketplace-chat").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) { toast.error(signed.error.message); return; }
      await sendRpc({ attachment_url: signed.data.signedUrl, attachment_type: f.type, attachment_name: f.name });
    } finally { setUploading(false); }
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="grid md:grid-cols-3 gap-3 h-[70vh]">
      <Card className="md:col-span-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا توجد محادثات.</div>
        ) : (
          <div className="divide-y">
            {chats.map((c) => (
              <button key={c.id} onClick={() => setActive(c)}
                className={`w-full text-start p-3 hover:bg-muted/50 ${active?.id === c.id ? "bg-muted" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{c.customer_name || "عميل"}</div>
                  {c.unread_for_vendor > 0 && <Badge variant="destructive">{c.unread_for_vendor}</Badge>}
                </div>
                {c.customer_phone && <div className="text-xs text-primary mt-0.5" dir="ltr">{c.customer_phone}</div>}
                <div className="text-xs text-muted-foreground truncate mt-1">{c.last_message_preview || "-"}</div>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card className="md:col-span-2 flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center"><MessagesSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />اختر محادثة للرد</div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20">
              {messages.map((m) => {
                const mine = m.sender_role === "vendor";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                      {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                      {m.attachment_url && <ChatAttachment url={m.attachment_url} type={m.attachment_type} name={m.attachment_name} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t flex items-center gap-2">
              <input ref={fileRef} type="file" hidden onChange={onPickFile}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
              <Button type="button" size="icon" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || sending}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="اكتب ردك..." />
              <Button onClick={send} disabled={sending || !input.trim()} size="icon">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
