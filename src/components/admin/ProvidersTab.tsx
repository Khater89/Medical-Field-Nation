import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProviderDetailsDrawer, { type ProviderProfile } from "./ProviderDetailsDrawer";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

const ROLE_TYPES = ["doctor", "nurse", "caregiver", "physiotherapist"];
const PROVIDER_STATUSES = ["pending", "approved", "suspended"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
};

const ProvidersTab = () => {
  const { toast } = useToast();
  const { t, formatCurrency, isRTL } = useLanguage();
  const { isAdmin, user } = useAuth();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProviderProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProviders = async () => {
    // Get all roles to identify admin/cs users to exclude
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const allRoles = roles || [];
    const csAdminIds = new Set(
      allRoles.filter((r) => r.role === "cs" || r.role === "admin").map((r) => r.user_id)
    );
    const providerRoleIds = new Set(
      allRoles.filter((r) => r.role === "provider").map((r) => r.user_id)
    );

    // Fetch profiles that are either:
    // 1. Have provider role in user_roles, OR
    // 2. Have role_type set (registered as provider but not yet approved/assigned role)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .not("role_type", "is", null)
      .order("created_at", { ascending: false });

    if (!profiles || profiles.length === 0) { setProviders([]); setLoading(false); return; }

    // Filter out admin/cs users
    const filteredProfiles = profiles.filter((p) => !csAdminIds.has(p.user_id));

    // Fetch emails for provider profiles via edge function (admin only)
    const allUserIds = filteredProfiles.map((p) => p.user_id);
    let emailMap: Record<string, string> = {};
    try {
      const { data: emailData } = await supabase.functions.invoke("admin-manage-admins", {
        body: { action: "get_emails", user_ids: allUserIds },
      });
      if (emailData?.emails) emailMap = emailData.emails;
    } catch (_) { /* non-critical */ }

    const enriched: ProviderProfile[] = [];
    for (const p of filteredProfiles) {
      let balance = 0;
      if (providerRoleIds.has(p.user_id)) {
        const { data } = await supabase.rpc("get_provider_balance", { _provider_id: p.user_id });
        balance = data || 0;
      }
      enriched.push({
        ...p,
        email: emailMap[p.user_id] || null,
        available_now: p.available_now ?? false,
        profile_completed: p.profile_completed ?? false,
        hasProviderRole: providerRoleIds.has(p.user_id),
        balance,
      } as ProviderProfile);
    }

    setProviders(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchProviders(); }, []);

  const approveProvider = async (userId: string) => {
    const { error: e1 } = await supabase.from("profiles").update({ provider_status: "approved" }).eq("user_id", userId);
    const { error: e2 } = await supabase.rpc("set_user_role", { target_user_id: userId, new_role: "provider" as any });
    if (e1 || e2) {
      toast({ title: t("common.error"), description: (e1 || e2)?.message, variant: "destructive" });
    } else {
      // Send approval notification to provider
      await supabase.from("staff_notifications").insert({
        title: "🎉 تم قبول طلب انضمامك بنجاح",
        body: "مبروك! تم قبول طلب انضمامك بنجاح، ويمكنك الآن استخدام حسابك كمزود خدمة واستقبال الطلبات. لا تنسَ إكمال ملفك الشخصي.",
        target_role: "provider",
        provider_id: userId,
      });
      toast({ title: t("provider.details.approve_success") });
      fetchProviders();
      // Open WhatsApp link to notify provider
      const provider = providers.find(p => p.user_id === userId);
      if (provider?.phone) {
        const msg = encodeURIComponent(`مرحباً ${provider.full_name || ""}،\nتم قبول طلب انضمامك كمزود خدمة في Medical Field Nation ✅\nيمكنك الآن الدخول لحسابك وإكمال ملفك الشخصي للبدء باستقبال الطلبات.\n${window.location.origin}/auth`);
        window.open(`https://wa.me/${provider.phone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
      }
    }
  };

  const suspendProvider = async (userId: string) => {
    const { error: e1 } = await supabase.from("profiles").update({ provider_status: "suspended" }).eq("user_id", userId);
    const { error: e2 } = await supabase.rpc("remove_user_role", { target_user_id: userId, old_role: "provider" as any });
    if (e1 || e2) {
      toast({ title: t("common.error"), description: (e1 || e2)?.message, variant: "destructive" });
    } else {
      toast({ title: t("provider.details.suspend_success") });
      fetchProviders();
    }
  };

  const recordSettlement = async (userId: string) => {
    const amount = prompt(t("provider.details.settlement_prompt"));
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    const paymentMethod = prompt("طريقة الدفع:\n1 - CliQ (أدخل رقم المرجع بعد ذلك)\n2 - كاش\n\nأدخل 1 أو 2:");
    if (!paymentMethod || !["1", "2"].includes(paymentMethod.trim())) return;

    let cliqReference: string | null = null;
    if (paymentMethod.trim() === "1") {
      cliqReference = prompt("أدخل رقم مرجع CliQ:");
      if (!cliqReference || !cliqReference.trim()) return;
    }

    const insertData: any = {
      provider_id: userId,
      amount: Number(amount),
      reason: "settlement",
    };
    if (cliqReference) insertData.cliq_reference = cliqReference.trim();

    const { error } = await supabase.from("provider_wallet_ledger").insert(insertData);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }

    // Find provider info for notification
    const provider = providers.find(p => p.user_id === userId);
    const providerName = provider?.full_name || "مزود";
    const providerPhone = provider?.phone || "";
    const methodText = paymentMethod.trim() === "1" ? `CliQ (${cliqReference})` : "كاش";

    // Send staff notification
    await supabase.from("staff_notifications" as any).insert({
      target_role: "admin",
      title: `💰 تسوية مالية: ${providerName}`,
      body: `تم تسجيل تسوية بقيمة ${Number(amount)} د.أ — طريقة الدفع: ${methodText}`,
      provider_id: userId,
    });

    // Send WhatsApp notification via outbox for provider
    if (providerPhone) {
      const whatsappMessage = `مرحباً ${providerName}، تم تسجيل تسوية مالية في حسابك بقيمة ${Number(amount)} د.أ عبر ${methodText}. فريق إدارة Medical Field Nation.`;
      await supabase.from("booking_outbox").insert({
        booking_id: "00000000-0000-0000-0000-000000000000",
        destination: "webhook",
        payload: {
          event: "provider_settlement",
          provider_id: userId,
          provider_name: providerName,
          provider_phone: providerPhone,
          amount: Number(amount),
          payment_method: methodText,
          message: whatsappMessage,
        },
      } as any);
    }

    toast({ title: t("provider.details.settlement_success") });
    fetchProviders();
  };

  const deleteProvider = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Safe-delete pre-check: count active bookings
      const { count, error: countErr } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("assigned_provider_id", deleteTarget.user_id)
        .not("status", "eq", "COMPLETED")
        .not("status", "eq", "CANCELLED")
        .not("status", "eq", "REJECTED");

      if (countErr) throw countErr;

      if (count && count > 0) {
        toast({
          title: t("provider.delete.has_active_orders_title"),
          description: t("provider.delete.has_active_orders_msg").replace("{count}", String(count)),
          variant: "destructive",
        });
        setDeleting(false);
        setDeleteTarget(null);
        return;
      }

      const res = await supabase.functions.invoke("admin-delete-provider", {
        body: { user_id: deleteTarget.user_id },
      });
      if (res.error) throw res.error;
      toast({ title: t("provider.delete.success") });
      setProviders((prev) => prev.filter((p) => p.user_id !== deleteTarget.user_id));
    } catch (err: any) {
      toast({ title: t("provider.delete.error"), description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = providers.filter((p) => {
    if (statusFilter !== "ALL" && p.provider_status !== statusFilter) return false;
    if (typeFilter !== "ALL" && p.role_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.phone || "").includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.provider_number != null && String(p.provider_number).includes(q)) ||
        (p.specialties || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold">{t("admin.providers.title")} ({providers.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
            <Input
              placeholder={t("admin.providers.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${isRTL ? "pr-9" : "pl-9"} w-[180px]`}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t("admin.providers.col.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("admin.providers.filter_all_types")}</SelectItem>
              {ROLE_TYPES.map((rt) => (
                <SelectItem key={rt} value={rt}>{t(`role_type.${rt}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t("admin.providers.col.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("admin.providers.filter_all_status")}</SelectItem>
              {PROVIDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`provider_status.${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">{t("admin.providers.no_providers")}</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t("admin.providers.col.name")}</TableHead>
                <TableHead>{t("admin.providers.col.phone")}</TableHead>
                <TableHead>{t("admin.providers.col.type")}</TableHead>
                <TableHead>{t("admin.providers.col.city")}</TableHead>
                <TableHead>{t("admin.providers.col.experience")}</TableHead>
                <TableHead>{t("admin.providers.col.status")}</TableHead>
                <TableHead>{t("admin.providers.col.availability")}</TableHead>
                <TableHead>{t("admin.providers.col.balance")}</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.user_id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${p.provider_status === "pending" ? "bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-400" : ""}`}
                  onClick={() => setSelectedProvider(p)}
                >
                  <TableCell className="font-medium text-sm">
                    <span>{p.full_name || t("admin.providers.no_name")}</span>
                    {p.provider_number && (
                      <span className="ms-1.5 text-[10px] font-mono text-primary">#{p.provider_number}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs" dir="ltr">{p.phone}</TableCell>
                  <TableCell className="text-xs">
                    {t(`role_type.${p.role_type || ""}`) !== `role_type.${p.role_type || ""}` ? t(`role_type.${p.role_type}`) : p.role_type || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{p.city || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {p.experience_years != null ? `${p.experience_years} ${t("admin.providers.years")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[p.provider_status] || ""}`}>
                      {t(`provider_status.${p.provider_status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.available_now ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
                        {t("admin.providers.available")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-sm font-medium ${p.balance < 0 ? "text-destructive" : "text-success"}`}>
                    {p.hasProviderRole ? formatCurrency(p.balance) : "—"}
                  </TableCell>
                  {isAdmin && p.user_id !== user?.id && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProviderDetailsDrawer
        provider={selectedProvider}
        open={!!selectedProvider}
        onOpenChange={(open) => { if (!open) setSelectedProvider(null); }}
        onApprove={(id) => { approveProvider(id); setSelectedProvider(null); }}
        onSuspend={(id) => { suspendProvider(id); setSelectedProvider(null); }}
        onSettlement={(id) => { recordSettlement(id); setSelectedProvider(null); }}
        onReject={async (id) => {
          const provider = providers.find(p => p.user_id === id);
          // Delete user via edge function
          try {
            const res = await supabase.functions.invoke("admin-delete-provider", {
              body: { user_id: id },
            });
            if (res.error) throw res.error;
            toast({ title: "تم رفض وحذف حساب المزود بنجاح" });
            setProviders((prev) => prev.filter((p) => p.user_id !== id));
          } catch (err: any) {
            toast({ title: t("common.error"), description: err.message, variant: "destructive" });
          }
          // Open WhatsApp link to notify
          if (provider?.phone) {
            const msg = encodeURIComponent(`مرحباً ${provider.full_name || ""}،\nنأسف لإبلاغك بأنه تم رفض طلب انضمامك كمزود خدمة في Medical Field Nation.\nيمكنك التواصل مع الإدارة لمزيد من التفاصيل.`);
            window.open(`https://wa.me/${provider.phone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
          }
          setSelectedProvider(null);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("provider.delete.confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("provider.delete.confirm_message")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("provider.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={deleteProvider}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("provider.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProvidersTab;
