import { useState, useEffect, useCallback, useRef } from "react";
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
  History, Play, Square, KeyRound, Clock, Camera, Edit2,
  AlertTriangle, Timer,
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
  if (durationMinutes <= 60) return basePrice;
  const extraMinutes = durationMinutes - 60;
  const segments = Math.ceil(extraMinutes / 15);
  return basePrice + (segments * basePrice * 0.08);
}

// Live timer hook for IN_PROGRESS orders
function useLiveTimer(checkInAt: string | null, isActive: boolean) {
  const [elapsed, setElapsed] = useState({ hours: 0, mins: 0, secs: 0, totalMinutes: 0 });

  useEffect(() => {
    if (!checkInAt || !isActive) return;
    const update = () => {
      const ms = Date.now() - new Date(checkInAt).getTime();
      const totalSecs = Math.max(0, Math.floor(ms / 1000));
      setElapsed({
        hours: Math.floor(totalSecs / 3600),
        mins: Math.floor((totalSecs % 3600) / 60),
        secs: totalSecs % 60,
        totalMinutes: Math.floor(totalSecs / 60),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [checkInAt, isActive]);

  return elapsed;
}

// OTP is now generated server-side in provider-checkin edge function

function formatCurrencyFn(n: number) {
  return `${n.toFixed(2)} JOD`;
}

/* ── Countdown hook for scheduled time ── */
function useCountdown(scheduledAt: string | null, isActive: boolean) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, mins: 0, secs: 0, totalMs: 0, isPast: false });

  useEffect(() => {
    if (!scheduledAt || !isActive) return;
    const update = () => {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, mins: 0, secs: 0, totalMs: 0, isPast: true });
      } else {
        const totalSecs = Math.floor(diff / 1000);
        setRemaining({
          days: Math.floor(totalSecs / 86400),
          hours: Math.floor((totalSecs % 86400) / 3600),
          mins: Math.floor((totalSecs % 3600) / 60),
          secs: totalSecs % 60,
          totalMs: diff,
          isPast: false,
        });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt, isActive]);

  return remaining;
}

/* ── CountdownBadge (top-level) ── */
const CountdownBadge = ({ scheduledAt }: { scheduledAt: string }) => {
  const isActive = true;
  const cd = useCountdown(scheduledAt, isActive);

  if (cd.isPast) {
    return (
      <div className="rounded-lg p-2.5 bg-warning/10 border border-warning/30 flex items-center gap-2">
        <Clock className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium text-warning">حان موعد الطلب — يرجى التوجه للعميل</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-2.5 bg-info/10 border border-info/30">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-info" />
        <span className="text-xs font-medium text-info">الوقت المتبقي للموعد</span>
      </div>
      <div className="flex items-center justify-center gap-3 text-center" dir="ltr">
        {cd.days > 0 && (
          <div className="bg-background/60 rounded px-2 py-1">
            <p className="text-lg font-mono font-bold text-info">{cd.days}</p>
            <p className="text-[9px] text-muted-foreground">يوم</p>
          </div>
        )}
        <div className="bg-background/60 rounded px-2 py-1">
          <p className="text-lg font-mono font-bold text-info">{String(cd.hours).padStart(2, "0")}</p>
          <p className="text-[9px] text-muted-foreground">ساعة</p>
        </div>
        <div className="bg-background/60 rounded px-2 py-1">
          <p className="text-lg font-mono font-bold text-info">{String(cd.mins).padStart(2, "0")}</p>
          <p className="text-[9px] text-muted-foreground">دقيقة</p>
        </div>
        <div className="bg-background/60 rounded px-2 py-1">
          <p className="text-lg font-mono font-bold text-info">{String(cd.secs).padStart(2, "0")}</p>
          <p className="text-[9px] text-muted-foreground">ثانية</p>
        </div>
      </div>
    </div>
  );
};

/* ── LiveTimerBadge (top-level to avoid hook ordering issues) ── */
const LiveTimerBadge = ({ order, t, toast, overtimeWarningShown }: {
  order: ProviderOrder;
  t: (k: string) => string;
  toast: (opts: any) => void;
  overtimeWarningShown: React.MutableRefObject<Set<string>>;
}) => {
  const isActive = order.status === "IN_PROGRESS" && !!order.check_in_at && !order.check_out_at;
  const timer = useLiveTimer(order.check_in_at, isActive);
  const basePrice = order.agreed_price ?? order.subtotal;
  const currentBill = calculateEscalatingPrice(basePrice, timer.totalMinutes);
  const isOvertime = timer.totalMinutes >= 60;

  useEffect(() => {
    if (isOvertime && isActive && !overtimeWarningShown.current.has(order.id)) {
      overtimeWarningShown.current.add(order.id);
      toast({
        title: "⚠️ تنبيه: تجاوز الساعة الأولى",
        description: `الطلب ${order.booking_number || ""} تجاوز 60 دقيقة — سيتم احتساب رسوم إضافية (8% لكل 15 دقيقة).`,
        variant: "destructive",
      });
    }
  }, [isOvertime, isActive, order.id, order.booking_number, toast, overtimeWarningShown]);

  if (!isActive) return null;

  const extraSegments = timer.totalMinutes > 60 ? Math.ceil((timer.totalMinutes - 60) / 15) : 0;

  return (
    <div className={`rounded-lg p-3 space-y-2 ${isOvertime ? "bg-destructive/10 border border-destructive/30" : "bg-primary/10 border border-primary/30"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className={`h-4 w-4 ${isOvertime ? "text-destructive animate-pulse" : "text-primary animate-pulse"}`} />
          <span className={`text-lg font-mono font-bold tracking-wider ${isOvertime ? "text-destructive" : "text-primary"}`} dir="ltr">
            {String(timer.hours).padStart(2, "0")}:{String(timer.mins).padStart(2, "0")}:{String(timer.secs).padStart(2, "0")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">{t("invoice.current_bill")}</p>
          <p className={`text-lg font-bold ${isOvertime ? "text-destructive" : "text-primary"}`}>{formatCurrencyFn(currentBill)}</p>
        </div>
      </div>
      {isOvertime && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>وقت إضافي: {extraSegments} فترة × 8% = +{formatCurrencyFn(extraSegments * basePrice * 0.08)}</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
        <div className="text-center bg-background/50 rounded p-1">
          <p>{t("invoice.base_price")}</p>
          <p className="font-bold text-foreground">{formatCurrencyFn(basePrice)}</p>
        </div>
        <div className="text-center bg-background/50 rounded p-1">
          <p>الوقت الأساسي</p>
          <p className="font-bold text-foreground">60 دقيقة</p>
        </div>
        <div className="text-center bg-background/50 rounded p-1">
          <p>فترات إضافية</p>
          <p className="font-bold text-foreground">{extraSegments}</p>
        </div>
      </div>
    </div>
  );
};

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

  // Provider agreement state
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState(false);

  // Debt limit
  const [debtLimit, setDebtLimit] = useState(-20);
  const [isOnHold, setIsOnHold] = useState(false);

  // Profile editing state
  const [availableNow, setAvailableNow] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [toolInput, setToolInput] = useState("");
  const [radiusKm, setRadiusKm] = useState(20);
  const [addressText, setAddressText] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Editable personal fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editBio, setEditBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setAvailableNow(profile.available_now || false);
      setSpecialties(profile.specialties || []);
      setTools(profile.tools || []);
      setRadiusKm(profile.radius_km || 20);
      setAddressText(profile.address_text || "");
      setAgreementAccepted(!!(profile as any).provider_agreement_accepted_at);
      setShowAgreement(!(profile as any).provider_agreement_accepted_at);
      // Editable personal fields
      setEditName(profile.full_name || "");
      setEditPhone(profile.phone || "");
      setEditCity(profile.city || "");
      setEditBio((profile as any).bio || "");
      setAvatarUrl((profile as any).avatar_url || null);
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
    const bal = balanceRes.data || 0;
    setBalance(bal);
    if (settingsRes.data) {
      setCoordinatorPhone((settingsRes.data as any).coordinator_phone || null);
      setCoordinatorPhone2((settingsRes.data as any).coordinator_phone_2 || null);
      const limit = (settingsRes.data as any).provider_debt_limit ?? -20;
      setDebtLimit(limit);
      setIsOnHold(bal < limit);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const isProfileReady = profile?.provider_status === "approved" && profile?.profile_completed;

  /* ── Provider Agreement Acceptance ── */
  const acceptAgreement = async () => {
    if (!user) return;
    setAgreementLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("profiles").update({
      provider_agreement_accepted_at: now,
    } as any).eq("user_id", user.id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setAgreementAccepted(true);
      setShowAgreement(false);
      toast({ title: "تم قبول الاتفاقية ✅" });
    }
    setAgreementLoading(false);
  };

  /* ── Order Actions ── */

  const logHistory = async (bookingId: string, action: string, note?: string) => {
    if (!user) return;
    await (supabase as any).from("booking_history").insert({
      booking_id: bookingId, action, performed_by: user.id, performer_role: "provider", note,
    });
  };

  const acceptOrder = async (id: string) => {
    if (!user) return;
    // Debt hold check
    if (isOnHold) {
      toast({ title: "لا يمكن قبول الطلب", description: "لديك مستحقات مالية غير مسددة. يرجى تسوية الرصيد أولاً.", variant: "destructive" });
      return;
    }
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
    // Only allow rejection in ASSIGNED status (before acceptance)
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== "ASSIGNED") {
      toast({ title: "لا يمكن رفض الطلب بعد القبول", description: "يرجى التواصل مع منسق المنصة للإلغاء", variant: "destructive" });
      return;
    }
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
      // Generate OTP server-side via edge function (provider never sees it)
      const { data: checkinResult, error: fnError } = await supabase.functions.invoke("provider-checkin", {
        body: { booking_id: id },
      });
      if (fnError) throw fnError;
      if (checkinResult?.error) throw new Error(checkinResult.error);

      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "IN_PROGRESS", check_in_at: now } : o));

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

    // Verify OTP server-side (provider doesn't have the code)
    const { data: verifyResult, error: verifyError } = await supabase.functions.invoke("verify-otp", {
      body: { booking_id: id, otp: otpInput.trim() },
    });
    if (verifyError || verifyResult?.error) {
      setOtpError(verifyResult?.error || t("provider.otp.invalid"));
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

      const extraSegs = durationMinutes > 60 ? Math.ceil((durationMinutes - 60) / 15) : 0;
      const surchargeNote = extraSegs > 0 ? ` — فترات إضافية: ${extraSegs} × 8%` : "";
      await logHistory(id, "CHECK_OUT", `تم إنهاء الخدمة — المدة: ${durationMinutes} دقيقة${surchargeNote} — الإجمالي: ${calculatedTotal} د.أ`);
      toast({ title: t("provider.checkout.success"), description: `المدة: ${durationMinutes} دقيقة — الإجمالي: ${formatCurrency(calculatedTotal)}` });

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

  /* ── Avatar Upload ── */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الملف كبير جداً (الحد الأقصى 5MB)", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profile-avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("profile-avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("user_id", user.id);
      setAvatarUrl(publicUrl);
      await refreshUserData();
      toast({ title: "تم تحديث الصورة الشخصية ✅" });
    }
    setAvatarUploading(false);
  };

  /* ── Profile Save ── */

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: editName.trim(),
      phone: editPhone.trim(),
      city: editCity.trim(),
      bio: editBio.trim() || null,
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

  // Track overtime warning shown per order
  const overtimeWarningShown = useRef<Set<string>>(new Set());

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
        {/* Provider Agreement Overlay */}
        {showAgreement && !agreementAccepted && (
          <div className="mb-6">
            <Card className="border-2 border-warning/50 bg-warning/5">
              <CardContent className="py-6 space-y-4">
                <div className="flex items-center gap-2 text-warning">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="font-bold text-sm">اتفاقية مقدم الخدمة</h3>
                </div>
                <p className="text-sm leading-relaxed">
                  أنا مزود مستقل ومرخّص (إن وجد) وأتحمل كامل المسؤولية المهنية والقانونية عن الخدمة المقدمة، وأوافق على تعويض المنصة عن أي مطالبات ناتجة عن عملي.
                </p>
                <Button
                  className="w-full gap-2"
                  onClick={acceptAgreement}
                  disabled={agreementLoading}
                >
                  {agreementLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  أوافق على الاتفاقية
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Debt Hold Banner */}
        {isOnHold && (
          <div className="mb-6 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-destructive">حسابك معلّق</p>
              <p className="text-xs text-muted-foreground">لديك مستحقات مالية تتجاوز الحد المسموح ({formatCurrency(debtLimit)}). لا يمكنك قبول طلبات جديدة حتى تتم التسوية.</p>
            </div>
          </div>
        )}

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
                    className={`transition-all cursor-pointer hover:shadow-md ${isInProgress ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
                    onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
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

                      {/* Live timer with dynamic pricing */}
                      {isInProgress && o.check_in_at && !hasCheckedOut && (
                        <LiveTimerBadge order={o} t={t} toast={toast} overtimeWarningShown={overtimeWarningShown} />
                      )}

                      {/* Checked-out invoice summary */}
                      {hasCheckedOut && o.calculated_total != null && (() => {
                        const duration = o.actual_duration_minutes || 0;
                        const base = o.agreed_price ?? o.subtotal;
                        const extraMins = Math.max(0, duration - 60);
                        const extraSegments = extraMins > 0 ? Math.ceil(extraMins / 15) : 0;
                        const surcharge = extraSegments * base * 0.08;
                        return (
                          <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
                            <p className="text-xs font-bold text-success flex items-center gap-1">📋 {t("invoice.title")}</p>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <span className="text-muted-foreground">{t("invoice.duration")}:</span>
                              <span className="font-medium">{duration} {t("form.minutes") || "دقيقة"}</span>
                              <span className="text-muted-foreground">{t("invoice.base_price")}:</span>
                              <span className="font-medium">{formatCurrency(base)}</span>
                              {extraSegments > 0 && (
                                <>
                                  <span className="text-muted-foreground">رسوم إضافية:</span>
                                  <span className="font-medium text-destructive">{extraSegments} × 8% = +{formatCurrency(surcharge)}</span>
                                </>
                              )}
                              <span className="text-muted-foreground border-t border-border pt-1">{t("invoice.client_total")}:</span>
                              <span className="font-bold text-success border-t border-border pt-1">{formatCurrency(o.calculated_total)}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Expand hint for collapsed cards */}
                      {!isExpanded && (
                        <p className="text-xs text-muted-foreground text-center">اضغط لعرض التفاصيل ▼</p>
                      )}

                      {/* ═══ Expanded details for ASSIGNED (pre-acceptance) ═══ */}
                      {isExpanded && o.status === "ASSIGNED" && (
                        <div className="space-y-3 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                          {/* Order details without phone */}
                          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                            <h5 className="text-xs font-bold flex items-center gap-1.5">
                              <ClipboardList className="h-3.5 w-3.5" /> تفاصيل الطلب
                            </h5>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                              <span className="text-muted-foreground">الخدمة:</span>
                              <span className="font-medium">{serviceNames[o.service_id] || o.service_id}</span>
                              <span className="text-muted-foreground">العميل:</span>
                              <span className="font-medium">{o.customer_display_name || "—"}</span>
                              <span className="text-muted-foreground">المدينة:</span>
                              <span className="font-medium">{o.city}</span>
                              <span className="text-muted-foreground">الموعد:</span>
                              <span className="font-medium">{formatDate(o.scheduled_at)}</span>
                              <span className="text-muted-foreground">السعر:</span>
                              <span className="font-medium text-primary">{o.agreed_price != null ? formatCurrency(o.agreed_price) : formatCurrency(o.subtotal)}</span>
                            </div>
                            {/* Phone hidden notice */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded p-2 mt-1">
                              <Lock className="h-3 w-3" />
                              رقم التواصل مع العميل سيظهر بعد قبول الطلب
                            </div>
                          </div>

                          {/* Accept/Reject buttons */}
                          {isOnHold ? (
                            <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
                              <Lock className="h-3.5 w-3.5" />
                              لا يمكنك قبول طلبات جديدة — لديك مستحقات مالية غير مسددة
                            </div>
                          ) : !agreementAccepted ? (
                            <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 rounded-lg p-2.5">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              يرجى قبول اتفاقية مقدم الخدمة أولاً
                            </div>
                          ) : null}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="gap-1 h-7 text-xs flex-1 bg-success hover:bg-success/90"
                              onClick={() => acceptOrder(o.id)}
                              disabled={actionLoading === o.id || isOnHold || !agreementAccepted}
                            >
                              {actionLoading === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
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

                          {/* History timeline */}
                          {(historyMap[o.id] || []).length > 0 && (
                            <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                              <h5 className="text-xs font-bold text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> سجل الطلب</h5>
                              {(historyMap[o.id] || []).map((h: any) => (
                                <div key={h.id} className="flex items-start gap-2 text-xs">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                    h.action === "ACCEPTED" ? "bg-success" :
                                    h.action === "CHECK_IN" ? "bg-primary" :
                                    h.action === "COMPLETED" ? "bg-primary" : "bg-warning"
                                  }`} />
                                  <div>
                                    <span className="font-medium">{
                                      h.action === "ASSIGNED" ? "📋 إسناد" :
                                      h.action === "ACCEPTED" ? "✅ قبول" : h.action
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

                      {/* Expanded details for accepted orders */}
                      {accepted && isExpanded && (
                        <div className="space-y-3 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                          {/* Countdown timer for ACCEPTED orders (before check-in) */}
                          {o.status === "ACCEPTED" && !o.check_in_at && (
                            <CountdownBadge scheduledAt={o.scheduled_at} />
                          )}

                          {/* Contact Details with phone */}
                          <div className="rounded-lg border border-success/20 bg-success/5 p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                              <ShieldCheck className="h-3.5 w-3.5" /> {t("provider.dashboard.contact_info")}
                            </div>
                            {/* Customer phone - now visible after acceptance */}
                            {o.customer_phone && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Phone className="h-3 w-3 text-success" />
                                <span className="text-xs text-muted-foreground">رقم العميل:</span>
                                <a href={`tel:${o.customer_phone}`} dir="ltr" className="font-medium text-success hover:underline">{o.customer_phone}</a>
                                <a
                                  href={`https://wa.me/${o.customer_phone.replace(/^0/, "962")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-success hover:text-success/80"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            )}
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

                          {/* Notice: cannot cancel after acceptance */}
                          {(o.status === "ACCEPTED" || o.status === "IN_PROGRESS") && (
                            <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 rounded-lg p-2.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              لا يمكن رفض الطلب بعد القبول. للإلغاء يرجى التواصل مع منسق المنصة.
                            </div>
                          )}

                          {/* OTP is now sent to client via WhatsApp — provider cannot see it */}
                          {isInProgress && !hasCheckedOut && (
                            <div className="rounded-lg border border-info/30 bg-info/10 p-3 text-center">
                              <p className="text-xs text-info font-medium mb-1">🔐 {t("provider.otp.sent_to_client")}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{t("provider.otp.ask_client")}</p>
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
            {/* Avatar & Personal Info */}
            <Card>
              <CardContent className="py-6 space-y-5">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-2 border-primary/30 overflow-hidden bg-muted flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
                      {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={avatarUploading}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">اضغط لتغيير الصورة الشخصية</p>
                </div>

                {/* Editable Personal Fields */}
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Edit2 className="h-3.5 w-3.5" /> {t("provider.details.basic_info")}
                </h3>
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("booking.details.client_name")}</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("booking.details.client_phone")}</label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("booking.details.client_city")}</label>
                      <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">نبذة مهنية</label>
                    <Textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="اكتب نبذة مختصرة عن خبرتك..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <span className="text-xs text-muted-foreground">{t("admin.providers.col.type")}</span>
                      <p className="font-medium">{profile?.role_type ? t(`role_type.${profile.role_type}`) : "—"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <span className="text-xs text-muted-foreground">{t("admin.providers.col.experience")}</span>
                      <p className="font-medium">{profile?.experience_years || 0} {t("admin.providers.years")}</p>
                    </div>
                  </div>
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
