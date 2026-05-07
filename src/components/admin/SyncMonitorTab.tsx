import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Send, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface OutboxRow {
  id: string;
  booking_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  payload: Record<string, unknown>;
}

const SyncMonitorTab = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_outbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setRows(data as unknown as OutboxRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const processOutbox = async () => {
    setProcessing(true);
    const { error } = await supabase.functions.invoke("process-outbox", {
      method: "POST",
      body: {},
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تمت معالجة الصفوف المعلقة" });
    }
    await fetchRows();
    setProcessing(false);
  };

  const resendOne = async (id: string) => {
    setResendingId(id);
    // Reset status to pending so processor picks it up
    await supabase
      .from("booking_outbox")
      .update({ status: "pending", next_retry_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", id);
    
    const { error } = await supabase.functions.invoke("process-outbox", {
      method: "POST",
      body: { ids: [id] },
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
    await fetchRows();
    setResendingId(null);
  };

  const resendAllFailed = async () => {
    setProcessing(true);
    const failedIds = rows.filter(r => r.status === "failed").map(r => r.id);
    if (failedIds.length === 0) {
      toast({ title: "لا يوجد", description: "لا توجد صفوف فاشلة" });
      setProcessing(false);
      return;
    }
    // Reset all failed to pending
    await supabase
      .from("booking_outbox")
      .update({ status: "pending", next_retry_at: new Date().toISOString(), attempts: 0 } as Record<string, unknown>)
      .in("id", failedIds);

    const { error } = await supabase.functions.invoke("process-outbox", {
      method: "POST",
      body: { ids: failedIds },
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: `تمت إعادة إرسال ${failedIds.length} صف` });
    }
    await fetchRows();
    setProcessing(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> تم الإرسال</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> فشل</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> معلق</Badge>;
    }
  };

  const pendingCount = rows.filter(r => r.status === "pending").length;
  const failedCount = rows.filter(r => r.status === "failed").length;
  const sentCount = rows.filter(r => r.status === "sent").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">مراقب المزامنة - Google Sheets</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={processOutbox} disabled={processing} className="gap-1.5">
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            معالجة المعلقة
          </Button>
          {failedCount > 0 && (
            <Button variant="destructive" size="sm" onClick={resendAllFailed} disabled={processing} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> إعادة إرسال الفاشلة ({failedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">معلق</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          <p className="text-xs text-muted-foreground">فشل</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{sentCount}</p>
          <p className="text-xs text-muted-foreground">تم الإرسال</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">لا توجد سجلات مزامنة</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-start font-medium">رقم الحجز</th>
                <th className="p-2 text-start font-medium">الحالة</th>
                <th className="p-2 text-start font-medium">المحاولات</th>
                <th className="p-2 text-start font-medium">الخطأ</th>
                <th className="p-2 text-start font-medium">تاريخ الإنشاء</th>
                <th className="p-2 text-start font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs">
                    {(row.payload as Record<string, unknown>)?.booking_number as string || row.booking_id.slice(0, 8)}
                  </td>
                  <td className="p-2">{statusBadge(row.status)}</td>
                  <td className="p-2 text-center">{row.attempts}</td>
                  <td className="p-2 text-xs text-destructive max-w-[200px] truncate">{row.last_error || "—"}</td>
                  <td className="p-2 text-xs">{format(new Date(row.created_at), "MM/dd HH:mm")}</td>
                  <td className="p-2">
                    {row.status !== "sent" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendOne(row.id)}
                        disabled={resendingId === row.id}
                        className="gap-1 text-xs h-7"
                      >
                        {resendingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        إعادة
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SyncMonitorTab;
