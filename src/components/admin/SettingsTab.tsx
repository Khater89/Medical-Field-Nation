import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Save, Percent, Wallet, AlertTriangle, Phone, Trash2, ShieldCheck, UserPlus, UserMinus, Mail } from "lucide-react";

interface AdminUser {
  user_id: string;
  email: string;
  full_name?: string | null;
  created_at?: string | null;
}

const AdminsSection = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "list" },
    });
    if (data?.admins) setAdmins(data.admins);
    if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    setLoading(false);
  }, [toast, t]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "invite_admin", email: inviteEmail.trim() },
    });
    setInviting(false);
    if (error || data?.error) {
      toast({ title: t("common.error"), description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.admins.invited") });
      setInviteEmail("");
      fetchAdmins();
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "remove_admin", user_id: userId },
    });
    setRemovingId(null);
    if (error || data?.error) {
      toast({ title: t("common.error"), description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.admins.removed") });
      fetchAdmins();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t("settings.admins.title")}
        </CardTitle>
        <CardDescription>{t("settings.admins.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite */}
        <div className="flex gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("settings.admins.email_placeholder")}
            className="flex-1"
            dir="ltr"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} size="sm" className="gap-1.5">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {t("settings.admins.invite")}
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">{t("common.no_data")}</p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div key={admin.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate" dir="ltr">{admin.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleRemove(admin.user_id)}
                  disabled={removingId === admin.user_id || admins.length <= 1}
                  title={admins.length <= 1 ? t("settings.admins.last_admin") : t("settings.admins.remove")}
                >
                  {removingId === admin.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CSAgentsSection = () => {
  const { toast } = useToast();
  const { t, formatDate } = useLanguage();
  const [agents, setAgents] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Create CS account
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "list", role: "cs" },
    });
    if (data?.admins) setAgents(data.admins);
    if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    setLoading(false);
  }, [toast, t]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "invite_admin", role: "cs", email: inviteEmail.trim() },
    });
    setInviting(false);
    if (error || data?.error) {
      toast({ title: t("common.error"), description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.cs.invited") });
      setInviteEmail("");
      fetchAgents();
    }
  };

  const handleCreateCS = async () => {
    if (!createEmail.trim() || !createPassword.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: {
        action: "create_cs",
        email: createEmail.trim(),
        password: createPassword.trim(),
        full_name: createName.trim(),
      },
    });
    setCreating(false);
    if (error || data?.error) {
      toast({ title: t("common.error"), description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.cs.created") });
      setCreateEmail("");
      setCreatePassword("");
      setCreateName("");
      setShowCreateForm(false);
      fetchAgents();
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
      body: { action: "remove_admin", role: "cs", user_id: userId },
    });
    setRemovingId(null);
    if (error || data?.error) {
      toast({ title: t("common.error"), description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.cs.removed") });
      fetchAgents();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-5 w-5 text-primary" />
          {t("settings.cs.title")}
        </CardTitle>
        <CardDescription>{t("settings.cs.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite existing user */}
        <div className="flex gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("settings.cs.email_placeholder")}
            className="flex-1"
            dir="ltr"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} size="sm" className="gap-1.5">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {t("settings.cs.invite")}
          </Button>
        </div>

        {/* Create new CS account */}
        <div className="border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <UserPlus className="h-4 w-4" />
            {t("settings.cs.create_new")}
          </Button>

          {showCreateForm && (
            <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20 space-y-3">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t("settings.cs.name_placeholder")}
              />
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder={t("settings.cs.email_placeholder")}
                dir="ltr"
              />
              <Input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder={t("settings.cs.password_placeholder")}
                dir="ltr"
              />
              <Button
                onClick={handleCreateCS}
                disabled={creating || !createEmail.trim() || !createPassword.trim()}
                size="sm"
                className="gap-1.5 w-full"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {t("settings.cs.create_account")}
              </Button>
            </div>
          )}
        </div>

        {/* Agents List */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">{t("common.no_data")}</p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="min-w-0 space-y-0.5">
                  {agent.full_name && (
                    <p className="text-sm font-medium truncate">{agent.full_name}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate" dir="ltr">{agent.email}</span>
                  </div>
                  {agent.created_at && (
                    <p className="text-[10px] text-muted-foreground">
                      {t("settings.cs.joined")}: {formatDate(agent.created_at)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleRemove(agent.user_id)}
                  disabled={removingId === agent.user_id}
                >
                  {removingId === agent.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SettingsTab = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    platform_fee_percent: 10,
    deposit_percent: 20,
    provider_debt_limit: -20,
    coordinator_phone: "",
    coordinator_phone_2: "",
  });

  // Clear bookings state
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearCounts, setClearCounts] = useState<Record<string, number> | null>(null);
  const [clearCountsLoading, setClearCountsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (data) {
      setSettings({
        platform_fee_percent: data.platform_fee_percent,
        deposit_percent: data.deposit_percent,
        provider_debt_limit: data.provider_debt_limit,
        coordinator_phone: (data as any).coordinator_phone || "",
        coordinator_phone_2: (data as any).coordinator_phone_2 || "",
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({
        platform_fee_percent: settings.platform_fee_percent,
        deposit_percent: settings.deposit_percent,
        provider_debt_limit: settings.provider_debt_limit,
        coordinator_phone: settings.coordinator_phone.trim() || null,
        coordinator_phone_2: settings.coordinator_phone_2.trim() || null,
      } as any)
      .eq("id", 1);

    setSaving(false);
    if (error) {
      toast({ title: t("settings.save_error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.saved") });
    }
  };

  const openClearDialog = async () => {
    setClearDialogOpen(true);
    setClearCountsLoading(true);
    setConfirmText("");
    setClearCounts(null);

    try {
      const res = await supabase.functions.invoke("admin-clear-all-bookings", {
        body: { action: "count" },
      });
      if (res.error) throw res.error;
      setClearCounts(res.data.counts);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
      setClearDialogOpen(false);
    } finally {
      setClearCountsLoading(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await supabase.functions.invoke("admin-clear-all-bookings", {
        body: { action: "delete" },
      });
      if (res.error) throw res.error;

      const deleted = res.data.deleted;
      toast({
        title: t("settings.clear_success"),
        description: `${t("settings.clear_deleted_bookings")}: ${deleted.bookings}, ${t("settings.clear_deleted_history")}: ${deleted.booking_history}`,
      });
      setClearDialogOpen(false);
      setConfirmText("");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const CONFIRM_PHRASE = "DELETE ALL BOOKINGS";
  const canDelete = confirmText === CONFIRM_PHRASE;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">{t("settings.title")}</h2>

      {/* Admins Section */}
      <AdminsSection />
      <CSAgentsSection />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-5 w-5 text-primary" />
            نسبة عمولة المنصة
          </CardTitle>
          <CardDescription>النسبة المئوية التي تأخذها المنصة من كل حجز</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={settings.platform_fee_percent}
              onChange={(e) => setSettings({ ...settings, platform_fee_percent: parseFloat(e.target.value) || 0 })}
              className="w-24"
              dir="ltr"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" />
            نسبة العربون
          </CardTitle>
          <CardDescription>النسبة المئوية المطلوبة كعربون عند الدفع بالعربون</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={settings.deposit_percent}
              onChange={(e) => setSettings({ ...settings, deposit_percent: parseFloat(e.target.value) || 0 })}
              className="w-24"
              dir="ltr"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" />
            حد دين مقدم الخدمة
          </CardTitle>
          <CardDescription>الحد الأدنى لرصيد المحفظة قبل منع تعيين حجوزات جديدة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              max="0"
              step="1"
              value={settings.provider_debt_limit}
              onChange={(e) => setSettings({ ...settings, provider_debt_limit: parseFloat(e.target.value) || 0 })}
              className="w-24"
              dir="ltr"
            />
            <span className="text-sm text-muted-foreground">د.أ</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5 text-primary" />
            {t("settings.coordinator_phone")}
          </CardTitle>
          <CardDescription>{t("settings.coordinator_phone_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">المنسق الأول</label>
            <Input
              type="tel"
              value={settings.coordinator_phone}
              onChange={(e) => setSettings({ ...settings, coordinator_phone: e.target.value })}
              placeholder="07XXXXXXXX"
              className="w-48 mt-1"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">المنسق الثاني</label>
            <Input
              type="tel"
              value={settings.coordinator_phone_2}
              onChange={(e) => setSettings({ ...settings, coordinator_phone_2: e.target.value })}
              placeholder="07XXXXXXXX"
              className="w-48 mt-1"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="gap-2" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t("settings.save")}
      </Button>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-destructive/20">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-5 w-5" />
              {t("settings.clear_bookings_title")}
            </CardTitle>
            <CardDescription className="text-destructive/80">
              {t("settings.clear_bookings_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="gap-2" onClick={openClearDialog}>
              <Trash2 className="h-4 w-4" />
              {t("settings.clear_bookings_btn")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("settings.clear_confirm_title")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.clear_confirm_desc")}
            </DialogDescription>
          </DialogHeader>

          {clearCountsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-destructive" />
            </div>
          ) : clearCounts ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1 text-sm">
                <p>{t("settings.clear_count_bookings")}: <strong>{clearCounts.bookings}</strong></p>
                <p>{t("settings.clear_count_history")}: <strong>{clearCounts.booking_history}</strong></p>
                <p>{t("settings.clear_count_contacts")}: <strong>{clearCounts.booking_contacts}</strong></p>
                <p>{t("settings.clear_count_outbox")}: <strong>{clearCounts.booking_outbox}</strong></p>
                <p>{t("settings.clear_count_notifications")}: <strong>{clearCounts.notifications_log}</strong></p>
                <p>{t("settings.clear_count_wallet")}: <strong>{clearCounts.provider_wallet_ledger}</strong></p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("settings.clear_type_confirm")} <code className="bg-muted px-1.5 py-0.5 rounded text-destructive font-bold">{CONFIRM_PHRASE}</code>
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  dir="ltr"
                  className="font-mono"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete || clearing}
              onClick={handleClearAll}
            >
              {clearing ? (
                <><Loader2 className="h-4 w-4 animate-spin me-1" />{t("settings.clear_deleting")}</>
              ) : (
                <><Trash2 className="h-4 w-4 me-1" />{t("settings.clear_confirm_btn")}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsTab;
