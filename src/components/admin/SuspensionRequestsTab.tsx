import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface SuspensionRequest {
  id: string;
  provider_id: string;
  requested_by_id: string;
  reason: string;
  status: string;
  created_at: string;
  provider_name?: string;
  requester_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const SuspensionRequestsTab = () => {
  const { toast } = useToast();
  const { t, formatDate } = useLanguage();
  const [requests, setRequests] = useState<SuspensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("suspension_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const providerIds = [...new Set(data.map(r => r.provider_id))];
    const requesterIds = [...new Set(data.map(r => r.requested_by_id))];
    const allIds = [...new Set([...providerIds, ...requesterIds])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", allIds);

    const nameMap: Record<string, string> = {};
    (profiles || []).forEach(p => { nameMap[p.user_id] = p.full_name || "—"; });

    setRequests(data.map(r => ({
      ...r,
      provider_name: nameMap[r.provider_id] || "—",
      requester_name: nameMap[r.requested_by_id] || "—",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (req: SuspensionRequest) => {
    setProcessing(req.id);
    try {
      await supabase.from("suspension_requests").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      }).eq("id", req.id);
      await supabase.from("profiles").update({ provider_status: "suspended" }).eq("user_id", req.provider_id);
      await supabase.rpc("remove_user_role", { target_user_id: req.provider_id, old_role: "provider" as any });
      toast({ title: t("suspension.approved_success") });
      fetchRequests();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req: SuspensionRequest) => {
    setProcessing(req.id);
    try {
      await supabase.from("suspension_requests").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      }).eq("id", req.id);
      toast({ title: t("suspension.rejected_success") });
      fetchRequests();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const columns = useMemo<ColumnDef<SuspensionRequest>[]>(() => [
    { accessorKey: "provider_name", header: t("suspension.col.provider"),
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.provider_name}</span> },
    { accessorKey: "requester_name", header: t("suspension.col.requested_by"),
      cell: ({ row }) => <span className="text-sm">{row.original.requester_name}</span> },
    { accessorKey: "reason", header: t("suspension.col.reason"),
      cell: ({ row }) => <span className="text-sm max-w-[200px] truncate block">{row.original.reason}</span> },
    { accessorKey: "created_at", header: t("suspension.col.date"),
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.created_at)}</span> },
    { accessorKey: "status", header: t("suspension.col.status"),
      cell: ({ row }) => (
        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[row.original.status] || ""}`}>
          {t(`suspension.status.${row.original.status}`)}
        </Badge>
      ) },
    { id: "actions", header: t("suspension.col.actions"), enableSorting: false,
      cell: ({ row }) => row.original.status === "pending" ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-success hover:text-success hover:bg-success/10"
            disabled={!!processing} onClick={() => handleApprove(row.original)}>
            {processing === row.original.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={!!processing} onClick={() => handleReject(row.original)}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      ) : <span className="text-xs text-muted-foreground">—</span>
    },
  ], [t, formatDate, processing]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">
        {t("suspension.title")} {pendingCount > 0 && <Badge variant="destructive" className="mr-2">{pendingCount}</Badge>}
      </h2>

      <DataTable
        columns={columns}
        data={requests}
        globalSearchPlaceholder={t("admin.providers.search")}
        globalSearchKeys={["provider_name", "requester_name", "reason"]}
        emptyMessage={t("suspension.no_requests")}
      />
    </div>
  );
};

export default SuspensionRequestsTab;
