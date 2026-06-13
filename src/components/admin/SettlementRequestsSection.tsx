import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Clock, BanknoteIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = "PENDING" | "PAID" | "REJECTED";
interface Req {
  id: string;
  provider_id: string;
  amount: number;
  status: Status;
  requested_at: string;
  paid_at: string | null;
  payment_reference: string | null;
  finance_note: string | null;
  provider_name?: string | null;
  provider_phone?: string | null;
}

const SettlementRequestsSection = () => {
  const { formatCurrency } = useLanguage();
  const { toast } = useToast();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status>("PENDING");

  const [payOpen, setPayOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [current, setCurrent] = useState<Req | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("provider_settlement_requests" as any)
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(200);
    const list = ((data as any) || []) as Req[];
    const ids = [...new Set(list.map((r) => r.provider_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", ids);
      const map = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]));
      list.forEach((r) => {
        r.provider_name = map[r.provider_id]?.full_name || null;
        r.provider_phone = map[r.provider_id]?.phone || null;
      });
    }
    setReqs(list);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const ch = supabase
      .channel("admin_psr")
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_settlement_requests" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  const openPay = (r: Req) => { setCurrent(r); setReference(""); setNote(""); setPayOpen(true); };
  const openReject = (r: Req) => { setCurrent(r); setNote(""); setRejectOpen(true); };

  const confirmPay = async () => {
    if (!current || !reference.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("admin_mark_settlement_paid" as any, {
      _id: current.id, _payment_reference: reference.trim(), _finance_note: note.trim() || null,
    });
    setSubmitting(false);
    if (error || !(data as any)?.success) {
      toast({ title: "تعذر تسجيل الدفع", description: error?.message || (data as any)?.error || "خطأ", variant: "destructive" });
      return;
    }
    toast({ title: "تمت تسوية المستحقات بنجاح" });
    setPayOpen(false);
    fetchData();
  };

  const confirmReject = async () => {
    if (!current) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("admin_reject_settlement" as any, {
      _id: current.id, _finance_note: note.trim() || null,
    });
    setSubmitting(false);
    if (error || !(data as any)?.success) {
      toast({ title: "تعذر رفض الطلب", description: error?.message || (data as any)?.error || "خطأ", variant: "destructive" });
      return;
    }
    toast({ title: "تم رفض الطلب وإعادة الرصيد للمزود" });
    setRejectOpen(false);
    fetchData();
  };

  const filtered = reqs.filter((r) => r.status === tab);
  const pendingCount = reqs.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BanknoteIcon className="h-5 w-5 text-primary" />
          طلبات تسوية المزودين
          {pendingCount > 0 && <Badge className="bg-warning text-warning-foreground">{pendingCount} جديد</Badge>}
        </h2>
        <div className="flex gap-1">
          {(["PENDING", "PAID", "REJECTED"] as Status[]).map((s) => (
            <Button key={s} size="sm" variant={tab === s ? "default" : "outline"} onClick={() => setTab(s)}>
              {s === "PENDING" ? "قيد المراجعة" : s === "PAID" ? "مدفوعة" : "مرفوضة"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">لا توجد طلبات في هذا التبويب</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((r) => (
            <Card key={r.id} className={r.status === "PENDING" ? "border-warning/40 bg-warning/5" : ""}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{r.provider_name || "—"}</span>
                      {r.provider_phone && <span className="text-xs text-muted-foreground" dir="ltr">{r.provider_phone}</span>}
                      {r.status === "PENDING" && <Badge variant="outline" className="gap-1 text-warning border-warning/40"><Clock className="h-3 w-3" /> طلب جديد</Badge>}
                      {r.status === "PAID" && <Badge className="gap-1 bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3" /> مدفوع</Badge>}
                      {r.status === "REJECTED" && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> مرفوض</Badge>}
                    </div>
                    <p className="text-lg font-bold text-primary">{formatCurrency(r.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.requested_at).toLocaleString("ar-JO")}
                      {r.paid_at && <> • تمت: {new Date(r.paid_at).toLocaleString("ar-JO")}</>}
                    </p>
                    {r.payment_reference && <p className="text-xs">مرجع الدفع: <strong dir="ltr">{r.payment_reference}</strong></p>}
                    {r.finance_note && <p className="text-xs text-muted-foreground">ملاحظة: {r.finance_note}</p>}
                  </div>
                  {r.status === "PENDING" && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" onClick={() => openPay(r)} className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> تسوية / Mark as Paid
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReject(r)}>رفض</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pay dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل تسوية المستحقات</DialogTitle>
            <DialogDescription>
              {current && <>دفع <strong>{formatCurrency(current.amount)}</strong> للمزود <strong>{current.provider_name || "—"}</strong></>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>مرجع الدفع (CliQ / رقم تحويل)<span className="text-destructive">*</span></Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="مثال: CLQ-2025-001" />
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>إلغاء</Button>
            <Button onClick={confirmPay} disabled={!reference.trim() || submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              تأكيد الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب التسوية</DialogTitle>
            <DialogDescription>
              سيتم إعادة المبلغ إلى الرصيد المتاح للمزود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>سبب الرفض (اختياري)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettlementRequestsSection;
