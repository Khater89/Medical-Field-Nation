import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type Msg = { role: "user" | "assistant"; content: string };

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
const APIKEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function AIChatWidget() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{
        role: "assistant",
        content: lang === "ar"
          ? "أهلاً بك! أنا مساعد MFN الذكي 🤖\nكيف أقدر أساعدك اليوم؟ (حجز خدمة، سؤال طبي، البحث في السوق الطبي)"
          : "Hi! I'm the MFN AI assistant 🤖\nHow can I help? (book a service, medical question, marketplace search)",
      }]);
    }
  }, [open, lang, msgs.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${APIKEY}`,
          "apikey": APIKEY,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Network error" }));
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${err.error || "Error"}` };
          return copy;
        });
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              setMsgs((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: full };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "⚠️ " + (e as Error).message };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={lang === "ar" ? "المساعد الذكي" : "AI Assistant"}
          className="fixed bottom-4 end-4 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform animate-pulse"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
      {open && (
        <Card className="fixed bottom-4 end-4 z-50 w-[min(92vw,380px)] h-[min(75vh,560px)] flex flex-col shadow-2xl border-2 border-primary/20">
          <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <div className="font-bold text-sm">{lang === "ar" ? "المساعد الذكي" : "AI Assistant"}</div>
                <div className="text-[10px] opacity-90">{lang === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-powered"}</div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                  {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn("rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap break-words", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border")}>
                  {m.content || (loading && i === msgs.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t flex items-end gap-2 bg-background rounded-b-lg">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={lang === "ar" ? "اكتب سؤالك…" : "Type your question…"}
              rows={1}
              className="min-h-[40px] max-h-24 resize-none text-sm"
              disabled={loading}
            />
            <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
