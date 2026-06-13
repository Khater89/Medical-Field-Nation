import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Clock, CheckCircle2, XCircle } from "lucide-react";

interface SettlementRequest {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "REJECTED";
  requested_at: string;
  paid_at: string | null;
  payment_reference: string | null;
  finance_note: string | null;
}

interface Props {
  availableBalance: number;
  onChanged?: () => void;
}

const ProviderSettlementCard = ({ availableBalance, onChanged }: Props) => {
  const { user } = useAuth();
  const { formatCurrency } = useLanguage();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SettlementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pending = requests.find((r) => r.status === "PENDING") || null;

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("provider_settlement_requests" as any)
      .select("id, amount, status, requested_at, paid_at, payment_reference, finance_note")
      .eq("provider_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(20);
    setRequests((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`psr_${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "provider_settlement_requests", filter: `provider_id=eq.${user.id}` },
        () => { fetchRequests(); onChanged?.(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchRequests, onChanged]);

  const handleRequest = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("provider_request_settlement" as any);
    setSubmitting(false);
    setConfirmOpen(false);
    if (error) {
      toast({ title: "تعذر إنشاء طلب التسوية", description: error.message, variant: "destructive" });
      return;
    }
    const res = data as any;
    if (!res?.success) {
      const msg =
        res?.error === "no_balance" ? "لا يوجد رصيد مستحق للتسوية" :
        res?.error === "pending_exists" ? "لديك طلب تسوية قيد المراجعة بالفعل" :
        res?.error || "خطأ غير متوقع";
      toast({ title: "تعذر إنشاء طلب التسوية", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "تم إرسال طلب التسوية", description: `سيتم تحويل ${formatCurrency(res.amount)} بعد المراجعة.` });
    fetchRequests();
    onChanged?.();
  };

  const canRequest = !pending && availableBalance > 0.009;

  return (
    <>
      {/* Available + Request button */}
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4 px-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">الرصيد المستحق القابل للمطالبة</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(Math.max(0, availableBalance))}</p>
            </div>
            <Button
              size="sm"
              disabled={!canRequest || submitting}
              onClick={() => setConfirmOpen(true)}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              طلب التسوية من المنصة
            </Button>
          </div>
          {pending && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning shrink-0" />
              <div className="text-xs">
                <p className="font-semibold">يوجد مبلغ قيد التسوية: {formatCurrency(pending.amount)}</p>
                <p className="text-muted-foreground">سيتم تحويله بعد مراجعة فريق المالية.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold">طلبات التسوية</h4>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <Card><CardContent className="py-4 text-center text-xs text-muted-foreground">لا توجد طلبات</CardContent></Card>
        ) : (
          requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-3 px-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{formatCurrency(r.amount)}</span>
                  {r.status === "PENDING" && <Badge variant="outline" className="gap-1 text-warning border-warning/40"><Clock className="h-3 w-3" /> قيد المراجعة</Badge>}
                  {r.status === "PAID" && <Badge className="gap-1 bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3" /> تمت التسوية</Badge>}
                  {r.status === "REJECTED" && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> مرفوض</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  طُلب: {new Date(r.requested_at).toLocaleString("ar-JO")}
                  {r.paid_at && <> • تمت: {new Date(r.paid_at).toLocaleString("ar-JO")}</>}
                </p>
                {r.payment_reference && <p className="text-[11px]">مرجع الدفع: <strong dir="ltr">{r.payment_reference}</strong></p>}
                {r.finance_note && <p className="text-[11px] text-muted-foreground">ملاحظة: {r.finance_note}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد طلب التسوية</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إرسال طلب إلى مالية المنصة لتسوية المبلغ المستحق لك ({formatCurrency(Math.max(0, availableBalance))}).
              لن تتمكن من إنشاء طلب جديد حتى يتم البت في هذا الطلب.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequest} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              تأكيد الإرسال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProviderSettlementCard;
