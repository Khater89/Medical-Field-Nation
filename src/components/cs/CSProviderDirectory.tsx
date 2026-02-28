import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Phone, MapPin, Briefcase, Navigation,
  Search, Stethoscope, ShieldAlert, Mail,
} from "lucide-react";
import CSSuspensionDialog from "./CSSuspensionDialog";
import ProviderDetailsDrawer, { type ProviderProfile } from "@/components/admin/ProviderDetailsDrawer";
import { useToast } from "@/hooks/use-toast";

const ROLE_TYPE_LABELS: Record<string, string> = {
  doctor: "طبيب",
  nurse: "ممرض/ة",
  caregiver: "مقدم رعاية",
  physiotherapist: "أخصائي علاج طبيعي",
};

const CSProviderDirectory = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [availableFilter, setAvailableFilter] = useState("ALL");

  // Detail drawer
  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(null);

  // Suspension dialog state
  const [suspensionTarget, setSuspensionTarget] = useState<ProviderProfile | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    // Get provider user IDs, excluding users who also have cs or admin roles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const allRoles = roles || [];
    const csAdminIds = new Set(
      allRoles.filter((r) => r.role === "cs" || r.role === "admin").map((r) => r.user_id)
    );
    const providerIds = allRoles
      .filter((r) => r.role === "provider" && !csAdminIds.has(r.user_id))
      .map((r) => r.user_id);

    if (providerIds.length === 0) { setProviders([]); setLoading(false); return; }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", providerIds)
      .order("created_at", { ascending: false });

    // Fetch emails via edge function
    let emailMap: Record<string, string> = {};
    try {
      const { data: emailData } = await supabase.functions.invoke("admin-manage-admins", {
        body: { action: "get_emails", user_ids: providerIds },
      });
      if (emailData?.emails) emailMap = emailData.emails;
    } catch (_) { /* non-critical */ }

    // Fetch balances
    const providerRoleSet = new Set(providerIds);
    const enriched: ProviderProfile[] = ((data as any[]) || []).map((p) => ({
      ...p,
      email: emailMap[p.user_id] || null,
      hasProviderRole: providerRoleSet.has(p.user_id),
      balance: 0,
      profile_completed: p.profile_completed ?? false,
      available_now: p.available_now ?? false,
    }));

    setProviders(enriched);
    setLoading(false);
  };

  const filtered = providers.filter((p) => {
    if (typeFilter !== "ALL" && p.role_type !== typeFilter) return false;
    if (availableFilter === "available" && !p.available_now) return false;
    if (availableFilter === "approved" && p.provider_status !== "approved") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.phone || "").includes(q) ||
        (p.specialties || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Handlers for ProviderDetailsDrawer actions (CS can only request suspension)
  const handleApprove = async () => {
    toast({ title: "غير مسموح", description: "فقط المسؤول يمكنه اعتماد المزودين", variant: "destructive" });
  };
  const handleSuspend = (userId: string) => {
    const p = providers.find(pr => pr.user_id === userId);
    if (p) {
      setSelectedProvider(null);
      setSuspensionTarget(p);
    }
  };
  const handleSettlement = async () => {
    toast({ title: "غير مسموح", description: "فقط المسؤول يمكنه إجراء التسويات", variant: "destructive" });
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو المدينة أو التخصص..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الأنواع</SelectItem>
            <SelectItem value="doctor">طبيب</SelectItem>
            <SelectItem value="nurse">ممرض/ة</SelectItem>
            <SelectItem value="caregiver">مقدم رعاية</SelectItem>
            <SelectItem value="physiotherapist">علاج طبيعي</SelectItem>
          </SelectContent>
        </Select>
        <Select value={availableFilter} onValueChange={setAvailableFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">الكل</SelectItem>
            <SelectItem value="available">متاح الآن</SelectItem>
            <SelectItem value="approved">معتمد</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} مزوّد</p>

      {/* Provider Cards */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا يوجد مزوّدون مطابقون</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <Card
              key={p.user_id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedProvider(p)}
            >
              <CardContent className="py-4 px-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.full_name || "بدون اسم"}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_TYPE_LABELS[p.role_type || ""] || p.role_type || "—"} · {p.city || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <Badge
                      variant="outline"
                      className={
                        p.provider_status === "approved"
                          ? "bg-success/10 text-success border-success/30"
                          : p.provider_status === "pending"
                          ? "bg-warning/10 text-warning border-warning/30"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      }
                    >
                      {p.provider_status === "approved" ? "معتمد" : p.provider_status === "pending" ? "قيد المراجعة" : "معلّق"}
                    </Badge>
                    {p.available_now && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30">متاح</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {p.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> <span dir="ltr">{p.phone}</span>
                    </span>
                  )}
                  {p.experience_years != null && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {p.experience_years} سنة
                    </span>
                  )}
                  {p.radius_km && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> نطاق {p.radius_km} كم
                    </span>
                  )}
                  {!p.profile_completed && (
                    <span className="text-warning">الملف غير مكتمل</span>
                  )}
                </div>

                {p.specialties && p.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Stethoscope className="h-3 w-3 text-muted-foreground mt-0.5" />
                    {p.specialties.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Provider Details Drawer */}
      <ProviderDetailsDrawer
        provider={selectedProvider}
        open={!!selectedProvider}
        onOpenChange={(open) => { if (!open) setSelectedProvider(null); }}
        onApprove={handleApprove}
        onSuspend={handleSuspend}
        onSettlement={handleSettlement}
      />

      {/* Suspension Request Dialog */}
      {suspensionTarget && (
        <CSSuspensionDialog
          providerId={suspensionTarget.user_id}
          providerName={suspensionTarget.full_name || "بدون اسم"}
          open={!!suspensionTarget}
          onOpenChange={(open) => { if (!open) setSuspensionTarget(null); }}
          onSuccess={fetchProviders}
        />
      )}
    </div>
  );
};

export default CSProviderDirectory;
