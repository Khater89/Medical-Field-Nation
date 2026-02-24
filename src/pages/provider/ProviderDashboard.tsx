import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet, LogOut, Loader2, CheckCircle, XCircle,
  CalendarDays, MapPin, ClipboardList, Phone,
  MessageCircle, ShieldCheck, Eye, Lock, User, X,
  History, Play, Square, KeyRound, Clock,
} from "lucide-react";
import mfnLogo from "@/assets/mfn-logo.png";

/* ── Types ── */

interface ProviderOrder {
  id: string;
  booking_number: string | null;
  service_id: string;
  city: string;
  scheduled_at: string;
  status: string;
  provider_payout: number;
  subtotal: number;
  agreed_price: number | null;
  assigned_provider_id: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  created_at: string;
  customer_display_name: string | null;
  customer_phone: string | null;
  client_address_text: string | null;
  client_lat: number | null;
  client_lng: number | null;
  notes: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  actual_duration_minutes: number | null;
  calculated_total: number | null;
  otp_code: string | null;
}

interface LedgerEntry {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  booking_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-warning/10 text-warning border-warning/30",
  ACCEPTED: "bg-info/10 text-info border-info/30",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/30",
  COMPLETED: "bg-success/10 text-success border-success/30",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/30",
};

const SPECIALTY_OPTIONS = [
  "باطني", "أطفال", "جروح", "قسطرة", "حقن وريدي",
  "علاج طبيعي", "رعاية مسنين", "تمريض منزلي",
  "قياس ضغط وسكر", "تحاليل منزلية",
];

const TOOL_SUGGESTIONS = ["جهاز ضغط", "سماعة طبية", "جهاز سكر", "أدوات تضميد", "جهاز أكسجين", "حقن وريدي"];

/* ── Pricing helper ── */
function calculateEscalatingPrice(basePrice: number, durationMinutes: number): number {
  const hours = Math.max(1, Math.ceil(durationMinutes / 60));
  // Total = Base + (Base × 0.5 × max(0, Hours - 1))
  return basePrice + (basePrice * 0.5 * Math.max(0, hours - 1));
}

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/* ── Component ── */

const ProviderDashboard = () => {
  const { user, profile, signOut, refreshUserData } = useAuth();
  const { t, formatCurrency, formatDateShort, formatDate } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<ProviderOrder[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [coordinatorPhone, setCoordinatorPhone] = useState<string | null>(null);
  const [coordinatorPhone2, setCoordinatorPhone2] = useState<string | null>(null);
  const [completeDialogOrder, setCompleteDialogOrder] = useState<string | null>(null);
  const [closeOutNote, setCloseOutNote] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // OTP dialog state
  const [otpDialogOrder, setOtpDialogOrder] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  // Profile editing state
  const [availableNow, setAvailableNow] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [toolInput, setToolInput] = useState("");
  const [radiusKm, setRadiusKm] = useState(20);
  const [addressText, setAddressText] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setAvailableNow(profile.available_now || false);
      setSpecialties(profile.specialties || []);
      setTools(profile.tools || []);
      setRadiusKm(profile.radius_km || 20);
      setAddressText(profile.address_text || "");
    }
  }, [profile]);

  /* ── Data fetching ── */

  const fetchData = async () => {
    if (!user) return;

    supabase.from("profiles").update({ last_active_at: new Date().toISOString() } as any).eq("user_id", user.id);

    const { data: svcData } = await supabase.from("services").select("id, name");
    const svcMap: Record<string, string> = {};
    (svcData || []).forEach((s: any) => { svcMap[s.id] = s.name; });
    setServiceNames(svcMap);

    const { data: ordersData } = await supabase.rpc("get_provider_bookings" as any);
    setOrders((ordersData as unknown as ProviderOrder[]) || []);

    const [ledgerRes, balanceRes, settingsRes] = await Promise.all([
      supabase.from("provider_wallet_ledger").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
      supabase.rpc("get_provider_balance", { _provider_id: user.id }),
      supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setLedger((ledgerRes.data as LedgerEntry[]) || []);
    setBalance(balanceRes.data || 0);
    if (settingsRes.data) {
      setCoordinatorPhone((settingsRes.data as any).coordinator_phone || null);
      setCoordinatorPhone2((settingsRes.data as any).coordinator_phone_2 || null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const isProfileReady = profile?.provider_status === "approved" && profile?.profile_completed;

  /* ── Order Actions ── */

  const logHistory = async (bookingId: string, action: string, note?: string) => {
    if (!user) return;
    await (supabase as any).from("booking_history").insert({
      booking_id: bookingId, action, performed_by: user.id, performer_role: "provider", note,
    });
  };

  const acceptOrder = async (id: string) => {
    if (!user) return;
    setActionLoading(id);
    try {
      const now = new Date().toISOString();
      const { data: updated, error } = await supabase.from("bookings").update({
        accepted_at: now,
        status: "ACCEPTED",
      } as any).eq("id", id).eq("assigned_provider_id", user.id).eq("status", "ASSIGNED").select().maybeSingle();

      if (error) throw error;
      if (!updated) {
        const { data: check } = await supabase.rpc("get_provider_bookings" as any);
        const booking = (check as unknown as ProviderOrder[])?.find((b) => b.id === id);
        if (!booking) {
          throw new Error("الطلب غير مُسند إليك أو غير موجود");
        } else if (booking.status !== "ASSIGNED") {
          throw new Error(`تم تغيير حالة الطلب مسبقاً إلى: ${booking.status}`);
        } else {
          throw new Error("لم يتم تحديث الطلب — يرجى المحاولة مرة أخرى");
        }
      }

      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "ACCEPTED", accepted_at: now } : o));

      await logHistory(id, "ACCEPTED", "تم قبول الطلب من قبل المزود");

      // Refresh balance (debt was recorded by trigger)
      const balRes = await supabase.rpc("get_provider_balance", { _provider_id: user.id });
      setBalance(balRes.data || 0);
      toast({ title: t("provider.dashboard.accepted_toast") });

      const { data: ordersData } = await supabase.rpc("get_provider_bookings" as any);
      if (ordersData) setOrders(ordersData as unknown as ProviderOrder[]);

      const { data: histData } = await (supabase as any).from("booking_history").select("*").eq("booking_id", id).order("created_at", { ascending: true });
      setHistoryMap((prev) => ({ ...prev, [id]: histData || [] }));
    } catch (err: any) {
      console.error("Accept error:", err);
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const rejectOrder = async (id: string) => {
    if (!confirm(t("provider.dashboard.reject_confirm"))) return;
    const rejectReason = prompt(t("provider.reject.reason_prompt") || "سبب الرفض:");
    if (!rejectReason || !rejectReason.trim()) return;
    if (!user) return;
    setActionLoading(id);
    try {
      await logHistory(id, "REJECTED", `رفض المزود: ${rejectReason.trim()}`);

      const now = new Date().toISOString();
      const { data: updated, error } = await supabase.from("bookings").update({
        status: "REJECTED",
        rejected_at: now,
        rejected_by: user.id,
        reject_reason: rejectReason.trim(),
      } as any).eq("id", id).eq("assigned_provider_id", user.id).eq("status", "ASSIGNED").select().maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("لم يتم تحديث الطلب — قد يكون مرفوضاً بالفعل");

      // Send notification to admin/CS about rejection
      const order = orders.find((o) => o.id === id);
      await supabase.from("staff_notifications" as any).insert({
        target_role: "admin",
        title: `🚨 رفض إسناد: ${order?.booking_number || id.slice(0, 8)}`,
        body: `المزود ${profile?.full_name || ""} رفض الطلب. السبب: ${rejectReason.trim()}`,
        booking_id: id,
        provider_id: user.id,
      });

      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "REJECTED" } : o));

      toast({ title: t("provider.dashboard.rejected_toast") });

      const { data: ordersData } = await supabase.rpc("get_provider_bookings" as any);
      if (ordersData) setOrders(ordersData as unknown as ProviderOrder[]);
    } catch (err: any) {
      console.error("Reject error:", err);
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  /* ── Check-in ── */
  const checkIn = async (id: string) => {
    if (!user) return;
    setActionLoading(id);
    try {
      const now = new Date().toISOString();
      const otp = generateOTP();
      const { data: updated, error } = await supabase.from("bookings").update({
        check_in_at: now,
        status: "IN_PROGRESS",
        otp_code: otp,
      } as any).eq("id", id).eq("assigned_provider_id", user.id).eq("status", "ACCEPTED").select().maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("لم يتم تحديث الطلب");

      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "IN_PROGRESS", check_in_at: now, otp_code: otp } : o));

      await logHistory(id, "CHECK_IN", "تم تسجيل بدء الخدمة");
      toast({ title: t("provider.checkin.success") });

      const { data: ordersData } = await supabase.rpc("get_provider_bookings" as any);
      if (ordersData) setOrders(ordersData as unknown as ProviderOrder[]);

      const { data: histData } = await (supabase as any).from("booking_history").select("*").eq("booking_id", id).order("created_at", { ascending: true });
      setHistoryMap((prev) => ({ ...prev, [id]: histData || [] }));
    } catch (err: any) {
      console.error("Check-in error:", err);
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  /* ── Check-out (with OTP verification) ── */
  const initiateCheckOut = (id: string) => {
    setOtpDialogOrder(id);
    setOtpInput("");
    setOtpError("");
  };

  const verifyOtpAndCheckOut = async () => {
    const id = otpDialogOrder;
    if (!id || !user) return;

    const order = orders.find((o) => o.id === id);
    if (!order) return;

    // Verify OTP
    if (otpInput.trim() !== order.otp_code) {
      setOtpError(t("provider.otp.invalid"));
      return;
    }

    setOtpDialogOrder(null);
    setActionLoading(id);

    try {
      const now = new Date().toISOString();
      const checkInTime = new Date(order.check_in_at!);
      const checkOutTime = new Date(now);
      const durationMs = checkOutTime.getTime() - checkInTime.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

      // Calculate escalating price
      const basePrice = order.agreed_price ?? order.subtotal;
      const calculatedTotal = calculateEscalatingPrice(basePrice, durationMinutes);

      const { data: updated, error } = await supabase.from("bookings").update({
        check_out_at: now,
        actual_duration_minutes: durationMinutes,
        calculated_total: calculatedTotal,
      } as any).eq("id", id).eq("assigned_provider_id", user.id).eq("status", "IN_PROGRESS").select().maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("لم يتم تحديث الطلب");

      setOrders((prev) => prev.map((o) => o.id === id ? {
        ...o, check_out_at: now, actual_duration_minutes: durationMinutes, calculated_total: calculatedTotal,
      } : o));

      const hours = Math.ceil(durationMinutes / 60);
      await logHistory(id, "CHECK_OUT", `تم إنهاء الخدمة — المدة: ${hours} ساعة — الإجمالي: ${calculatedTotal} د.أ`);
      toast({ title: t("provider.checkout.success"), description: `${t("provider.checkout.duration")}: ${hours} ${t("form.hours.plural")} — ${t("provider.checkout.total")}: ${formatCurrency(calculatedTotal)}` });

      // Now open the complete dialog for close-out note
      setCompleteDialogOrder(id);

      const { data: ordersData } = await supabase.rpc("get_provider_bookings" as any);
      if (ordersData) setOrders(ordersData as unknown as ProviderOrder[]);

      const { data: histData } = await (supabase as any).from("booking_history").select("*").eq("booking_id", id).order("created_at", { ascending: true });
      setHistoryMap((prev) => ({ ...prev, [id]: histData || [] }));
    } catch (err: any) {
      console.error("Check-out error:", err);
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  /* ── Complete (after check-out) ── */
  const confirmComplete = async () => {
    const id = completeDialogOrder;
    if (!id || !user) return;
    if (!closeOutNote.trim() || closeOutNote.trim().length < 5) {
      toast({ title: "مطلوب", description: "يرجى إدخال ملاحظة الإغلاق (5 أحرف على الأقل)", variant: "destructive" });
      return;
    }
    setCompleteDialogOrder(null);
    setActionLoading(id);
    try {
      const now = new Date().toISOString();
      const order = orders.find((o) => o.id === id);

      const { data: updated, error } = await supabase.from("bookings").update({
        status: "COMPLETED",
        completed_at: now,
        completed_by: user.id,
        close_out_note: closeOutNote.trim(),
        close_out_at: now,
      } as any).eq("id", id).eq("assigned_provider_id", user.id).select().maybeSingle();

      if (error) throw error;
      if (!updated) throw new Error("لم يتم تحديث الطلب — تأكد أنه مقبول أولاً");

      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "COMPLETED", completed_at: now } : o));

      // Debt is now auto-recorded by database trigger (record_completion_debt)

      await logHistory(id, "COMPLETED", closeOutNote.trim());
      setCloseOutNote("");
      toast({ title: t("provider.dashboard.completed_toast") });

      const { data: ordersData } = await supabase.rpc("get_provider_bookings" as any);
      if (ordersData) setOrders(ordersData as unknown as ProviderOrder[]);

      // Refresh balance
      const balanceRes = await supabase.rpc("get_provider_balance", { _provider_id: user.id });
      setBalance(balanceRes.data || 0);

      const { data: histData } = await (supabase as any).from("booking_history").select("*").eq("booking_id", id).order("created_at", { ascending: true });
      setHistoryMap((prev) => ({ ...prev, [id]: histData || [] }));
    } catch (err: any) {
      console.error("Complete error:", err);
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  // History state
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({});

  const loadHistory = async (bookingId: string) => {
    const { data } = await (supabase as any).from("booking_history").select("*").eq("booking_id", bookingId).order("created_at", { ascending: true });
    setHistoryMap((prev) => ({ ...prev, [bookingId]: data || [] }));
  };

  useEffect(() => {
    if (orders.length > 0) {
      orders.forEach((o) => loadHistory(o.id));
    }
  }, [orders.length]);

  /* ── Profile Save ── */

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase.from("profiles").update({
      available_now: availableNow,
      specialties: specialties.length > 0 ? specialties : null,
      tools: tools.length > 0 ? tools : null,
      radius_km: radiusKm,
      address_text: addressText.trim(),
    } as any).eq("user_id", user.id);

    setProfileSaving(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      await refreshUserData();
      toast({ title: t("provider.dashboard.profile_saved") });
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  /* ── Guards ── */

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isProfileReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10 space-y-4">
            <p className="text-sm text-muted-foreground">
              {profile?.provider_status !== "approved"
                ? t("provider.dashboard.pending_review")
                : t("provider.dashboard.complete_profile")}
            </p>
            {profile?.provider_status === "approved" && !profile?.profile_completed && (
              <Link to="/provider/onboarding"><Button>{t("provider.dashboard.go_complete_profile")}</Button></Link>
            )}
            <div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 mt-2">
                <LogOut className="h-4 w-4" /> {t("action.logout")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOrders = statusFilter === "ALL" ? orders : orders.filter((o) => o.status === statusFilter);
  const isAccepted = (o: ProviderOrder) => !!o.accepted_at;

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const addTool = (toolName: string) => {
    const trimmed = toolName.trim();
    if (trimmed && !tools.includes(trimmed)) setTools([...tools, trimmed]);
    setToolInput("");
  };

  // Helper: format elapsed time
  const formatElapsed = (checkInAt: string) => {
    const ms = Date.now() - new Date(checkInAt).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  };

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={mfnLogo} alt="MFN" className="h-8" />
            <div>
              <p className="text-[10px] font-semibold text-primary tracking-wide">{t("app.brand_name")}</p>
              <h1 className="text-sm font-bold text-foreground">{t("provider.dashboard.title")}</h1>
              <p className="text-[10px] text-muted-foreground">{profile?.full_name || user?.email}</p>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
            <LogOut className="h-4 w-4" /> {t("action.logout")}
          </Button>
        </div>
      </header>

      <main className="container py-6 px-4">
        {/* Balance Card */}
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("provider.dashboard.wallet_balance")}</p>
              <p className={`text-2xl font-bold ${balance < 0 ? "text-destructive" : "text-success"}`}>{formatCurrency(balance)}</p>
            </div>
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders" className="gap-1.5 text-xs">
              <ClipboardList className="h-4 w-4" /> {t("provider.dashboard.tab.orders")} ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5 text-xs">
              <User className="h-4 w-4" /> {t("provider.dashboard.tab.profile")}
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-1.5 text-xs">
              <Wallet className="h-4 w-4" /> {t("provider.dashboard.tab.wallet")}
            </TabsTrigger>
          </TabsList>

          {/* ═══ Orders Tab ═══ */}
          <TabsContent value="orders" className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {["ALL", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  className="text-xs h-7"
                  onClick={() => setStatusFilter(s)}
                >
                  {t(`provider.status.${s}`)}
                  {s !== "ALL" && ` (${orders.filter((o) => o.status === s).length})`}
                </Button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">{t("provider.dashboard.no_orders")}</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {filteredOrders.map((o) => {
                  const accepted = isAccepted(o);
                  const isExpanded = expandedOrder === o.id;
                  const isInProgress = o.status === "IN_PROGRESS";
                  const hasCheckedOut = !!o.check_out_at;

                  return (
                  <Card
                    key={o.id}
                    className={`transition-all ${accepted ? "cursor-pointer hover:shadow-md" : ""} ${isInProgress ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
                    onClick={() => {
                      if (accepted) setExpandedOrder(isExpanded ? null : o.id);
                    }}
                  >
                    <CardContent className="py-4 px-4 space-y-2">
                      {/* Header row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{serviceNames[o.service_id] || t("provider.dashboard.service")}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.customer_display_name || t("provider.dashboard.customer")}
                            {o.booking_number && <span className="ms-1" dir="ltr">({o.booking_number})</span>}
                          </p>
                        </div>
                        <Badge variant="outline" className={STATUS_COLORS[o.status] || ""}>
                          {t(`provider.status.${o.status}`) || o.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateShort(o.scheduled_at)}
                        </span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{o.city}</span>
                        <span className="font-semibold text-primary">
                          {o.calculated_total != null ? formatCurrency(o.calculated_total) : o.agreed_price != null ? formatCurrency(o.agreed_price) : formatCurrency(o.provider_payout)}
                        </span>
                      </div>

                      {/* In-progress timer badge */}
                      {isInProgress && o.check_in_at && !hasCheckedOut && (
                        <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary rounded-lg p-2">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          <span>{t("provider.checkin.elapsed")}: <strong dir="ltr">{formatElapsed(o.check_in_at)}</strong></span>
                        </div>
                      )}

                      {/* Checked-out invoice summary */}
                      {hasCheckedOut && o.calculated_total != null && (
                        <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
                          <p className="text-xs font-bold text-success flex items-center gap-1">📋 {t("invoice.title")}</p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <span className="text-muted-foreground">{t("invoice.duration")}:</span>
                            <span className="font-medium">{Math.ceil((o.actual_duration_minutes || 0) / 60)} {t("form.hours.plural")}</span>
                            <span className="text-muted-foreground">{t("invoice.base_price")}:</span>
                            <span className="font-medium">{formatCurrency(o.agreed_price ?? o.subtotal)}</span>
                            {Math.ceil((o.actual_duration_minutes || 0) / 60) > 1 && (
                              <>
                                <span className="text-muted-foreground">{t("invoice.extra_hours")}:</span>
                                <span className="font-medium">{Math.ceil((o.actual_duration_minutes || 0) / 60) - 1} × 50%</span>
                              </>
                            )}
                            <span className="text-muted-foreground border-t border-border pt-1">{t("invoice.client_total")}:</span>
                            <span className="font-bold text-success border-t border-border pt-1">{formatCurrency(o.calculated_total)}</span>
                          </div>
                        </div>
                      )}

                      {/* Before acceptance: locked message + action buttons */}
                      {!accepted && o.status === "ASSIGNED" && (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                            <Lock className="h-3.5 w-3.5" />
                            {t("provider.dashboard.press_accept")}
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="gap-1 h-7 text-xs flex-1 bg-success hover:bg-success/90"
                              onClick={() => acceptOrder(o.id)}
                              disabled={actionLoading === o.id}
                            >
                              {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                              {t("provider.dashboard.accept")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1 h-7 text-xs"
                              onClick={() => rejectOrder(o.id)}
                              disabled={actionLoading === o.id}
                            >
                              <XCircle className="h-3 w-3" /> {t("provider.dashboard.reject")}
                            </Button>
                          </div>
                        </>
                      )}

                      {/* After acceptance: show hint to click */}
                      {accepted && !isExpanded && (o.status === "ACCEPTED" || o.status === "IN_PROGRESS" || o.status === "COMPLETED") && (
                        <p className="text-xs text-muted-foreground text-center">اضغط لعرض التفاصيل ▼</p>
                      )}

                      {/* Expanded details for accepted orders */}
                      {accepted && isExpanded && (
                        <div className="space-y-3 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                          {/* Contact Details */}
                          <div className="rounded-lg border border-success/20 bg-success/5 p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                              <ShieldCheck className="h-3.5 w-3.5" /> {t("provider.dashboard.contact_info")}
                            </div>
                            {coordinatorPhone && (
                              <p className="text-sm flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{t("provider.dashboard.coordinator_phone")} 1:</span>
                                <span dir="ltr" className="font-medium">{coordinatorPhone}</span>
                              </p>
                            )}
                            {coordinatorPhone2 && (
                              <p className="text-sm flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{t("provider.dashboard.coordinator_phone")} 2:</span>
                                <span dir="ltr" className="font-medium">{coordinatorPhone2}</span>
                              </p>
                            )}
                            {o.client_address_text && (
                              <p className="text-sm flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-muted-foreground" /> {o.client_address_text}
                              </p>
                            )}
                            {o.notes && <p className="text-xs bg-muted rounded p-2 mt-1">{o.notes}</p>}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 flex-wrap">
                            {/* Check-in button: only for ACCEPTED, no check_in yet */}
                            {o.status === "ACCEPTED" && !o.check_in_at && (
                              <Button size="sm" className="gap-1 h-8 text-xs flex-1 bg-primary hover:bg-primary/90" onClick={() => checkIn(o.id)} disabled={actionLoading === o.id}>
                                {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                {t("provider.checkin.btn")}
                              </Button>
                            )}

                            {/* Check-out button: only for IN_PROGRESS, no check_out yet */}
                            {isInProgress && !hasCheckedOut && (
                              <Button size="sm" variant="destructive" className="gap-1 h-8 text-xs flex-1" onClick={() => initiateCheckOut(o.id)} disabled={actionLoading === o.id}>
                                {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
                                {t("provider.checkout.btn")}
                              </Button>
                            )}

                            {/* Complete button: after check-out, still IN_PROGRESS */}
                            {isInProgress && hasCheckedOut && (
                              <Button size="sm" className="gap-1 h-8 text-xs flex-1" onClick={() => setCompleteDialogOrder(o.id)} disabled={actionLoading === o.id}>
                                {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                {t("provider.dashboard.complete")}
                              </Button>
                            )}

                            {/* Legacy: complete for ACCEPTED orders that checked in before this feature (fallback) */}
                            {o.status === "ACCEPTED" && o.check_in_at && (
                              <Button size="sm" className="gap-1 h-7 text-xs flex-1" onClick={() => setCompleteDialogOrder(o.id)} disabled={actionLoading === o.id}>
                                {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />} {t("provider.dashboard.complete")}
                              </Button>
                            )}

                            {coordinatorPhone && (
                              <a
                                href={`https://wa.me/${coordinatorPhone.replace(/^0/, "962")}?text=${encodeURIComponent(`مرحباً، أنا مقدم الخدمة من MFN بخصوص الطلب ${o.booking_number || o.id.slice(0, 8)}.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs">
                                  <MessageCircle className="h-3 w-3" /> {t("provider.dashboard.whatsapp_coordinator")}
                                </Button>
                              </a>
                            )}
                          </div>

                          {/* OTP display for client */}
                          {isInProgress && o.otp_code && !hasCheckedOut && (
                            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-center">
                              <p className="text-xs text-warning font-medium mb-1">{t("provider.otp.client_code")}</p>
                              <p className="text-2xl font-bold tracking-[0.3em] text-warning" dir="ltr">{o.otp_code}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{t("provider.otp.show_client")}</p>
                            </div>
                          )}

                          {/* History timeline */}
                          {(historyMap[o.id] || []).length > 0 && (
                            <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                              <h5 className="text-xs font-bold text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> سجل الطلب</h5>
                              {(historyMap[o.id] || []).map((h: any) => (
                                <div key={h.id} className="flex items-start gap-2 text-xs">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                    h.action === "ACCEPTED" ? "bg-success" :
                                    h.action === "CHECK_IN" ? "bg-primary" :
                                    h.action === "CHECK_OUT" ? "bg-warning" :
                                    h.action === "CANCELLED" ? "bg-destructive" :
                                    h.action === "COMPLETED" ? "bg-primary" : "bg-warning"
                                  }`} />
                                  <div>
                                    <span className="font-medium">{
                                      h.action === "ACCEPTED" ? "✅ قبول" :
                                      h.action === "CHECK_IN" ? "▶️ بدء الخدمة" :
                                      h.action === "CHECK_OUT" ? "⏹ إنهاء الخدمة" :
                                      h.action === "COMPLETED" ? "✅ إكمال" :
                                      h.action === "CANCELLED" ? "❌ إلغاء" :
                                      h.action === "REJECTED" ? "↩️ رفض" : h.action
                                    }</span>
                                    {h.note && <span className="text-muted-foreground ms-1">— {h.note}</span>}
                                    <p className="text-[10px] text-muted-foreground" dir="ltr">{new Date(h.created_at).toLocaleString("ar-JO")}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ Profile Tab ═══ */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardContent className="py-4 space-y-2">
                <h3 className="text-sm font-bold">{t("provider.details.basic_info")}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{t("booking.details.client_name")}:</span> {profile?.full_name}</div>
                  <div><span className="text-muted-foreground">{t("booking.details.client_phone")}:</span> <span dir="ltr">{profile?.phone}</span></div>
                  <div><span className="text-muted-foreground">{t("booking.details.client_city")}:</span> {profile?.city}</div>
                  <div><span className="text-muted-foreground">{t("admin.providers.col.type")}:</span> {profile?.role_type ? t(`role_type.${profile.role_type}`) : "—"}</div>
                  {profile?.date_of_birth && (
                    <div><span className="text-muted-foreground">{t("provider.details.registered")}:</span> {profile.date_of_birth}</div>
                  )}
                  <div><span className="text-muted-foreground">{t("admin.providers.col.experience")}:</span> {profile?.experience_years || 0} {t("admin.providers.years")}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{t("provider.profile.availability")}</h3>
                    {coordinatorPhone && (
                      <a href={`tel:${coordinatorPhone}`} title={t("provider.dashboard.coordinator_phone")}>
                        <Phone className="h-4 w-4 text-success hover:text-primary transition-colors cursor-pointer" />
                      </a>
                    )}
                  </div>
                  <Switch checked={availableNow} onCheckedChange={setAvailableNow} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("provider.profile.radius")} ({t("provider.details.km")})</label>
                  <Input
                    type="number" min={1} max={100} value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-24 mt-1" dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("provider.profile.address")}</label>
                  <Input
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder={t("provider.profile.address_placeholder")} className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 space-y-4">
                <h3 className="text-sm font-bold">{t("provider.profile.specialties")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTY_OPTIONS.map((s) => (
                    <Badge
                      key={s}
                      variant={specialties.includes(s) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleSpecialty(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>

                <h3 className="text-sm font-bold mt-4">{t("provider.profile.tools")}</h3>
                <div className="flex gap-2">
                  <Input
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    placeholder={t("provider.profile.add_tool")}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTool(toolInput); } }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTool(toolInput)}>+</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TOOL_SUGGESTIONS.filter((ts) => !tools.includes(ts)).slice(0, 3).map((ts) => (
                    <Badge key={ts} variant="outline" className="cursor-pointer hover:bg-accent text-xs" onClick={() => addTool(ts)}>
                      + {ts}
                    </Badge>
                  ))}
                </div>
                {tools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tools.map((toolItem) => (
                      <Badge key={toolItem} variant="secondary" className="gap-1 text-xs">
                        {toolItem} <X className="h-3 w-3 cursor-pointer" onClick={() => setTools(tools.filter((x) => x !== toolItem))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button className="w-full gap-2" onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {t("provider.profile.save")}
            </Button>
          </TabsContent>

          {/* ═══ Wallet Tab ═══ */}
          <TabsContent value="wallet" className="space-y-4">
            {/* Wallet Summary Card */}
            <Card className={`border ${balance < 0 ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("finance.current_balance")}</span>
                  <span className={`text-xl font-bold ${balance < 0 ? "text-destructive" : "text-success"}`}>{formatCurrency(balance)}</span>
                </div>
                {balance < 0 && (
                  <div className="rounded-lg bg-destructive/10 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-destructive">{t("provider.wallet.debt_notice")}</p>
                    <p className="text-xs text-muted-foreground">{t("provider.wallet.debt_instructions")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <h3 className="text-sm font-bold">{t("provider.wallet.history")}</h3>
            {ledger.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">{t("provider.wallet.no_transactions")}</CardContent></Card>
            ) : (
              <div className="grid gap-2">
                {ledger.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div>
                        <p className="text-sm font-medium">
                          {entry.reason === "platform_fee" ? t("finance.reason.platform_fee") :
                           entry.reason === "commission" ? t("provider.wallet.commission") :
                           entry.reason === "settlement" ? t("provider.wallet.settlement") :
                           entry.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                      </div>
                      <span className={`font-bold text-sm ${entry.amount < 0 ? "text-destructive" : "text-success"}`}>
                        {entry.amount > 0 ? "+" : ""}{formatCurrency(entry.amount)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Complete Confirmation Dialog with Close-Out Note */}
      <AlertDialog open={!!completeDialogOrder} onOpenChange={(open) => { if (!open) { setCompleteDialogOrder(null); setCloseOutNote(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إكمال الطلب</AlertDialogTitle>
            <AlertDialogDescription>يرجى كتابة ملاحظة الإغلاق (Close-out Note) ثم الضغط على "إكمال".</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="اكتب ملاحظة الإغلاق هنا... (5 أحرف على الأقل)"
            value={closeOutNote}
            onChange={(e) => setCloseOutNote(e.target.value)}
            className="min-h-[80px]"
          />
          {closeOutNote.trim().length > 0 && closeOutNote.trim().length < 5 && (
            <p className="text-xs text-destructive">يجب أن تكون الملاحظة 5 أحرف على الأقل</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>رجوع</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete} disabled={closeOutNote.trim().length < 5}>إكمال الطلب ✅</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* OTP Verification Dialog */}
      <AlertDialog open={!!otpDialogOrder} onOpenChange={(open) => { if (!open) { setOtpDialogOrder(null); setOtpInput(""); setOtpError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-warning" />
              {t("provider.otp.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("provider.otp.desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={otpInput}
            onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setOtpError(""); }}
            placeholder="____"
            className="text-center text-2xl tracking-[0.5em] font-bold"
            dir="ltr"
            maxLength={4}
          />
          {otpError && <p className="text-xs text-destructive text-center">{otpError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={verifyOtpAndCheckOut} disabled={otpInput.length !== 4}>
              {t("provider.otp.verify")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProviderDashboard;
