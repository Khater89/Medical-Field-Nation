import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarCheck, TrendingUp, Users, Clock, CheckCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalBookings: number;
  todayBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  activeProviders: number;
  totalRevenue: number;
  todayRevenue: number;
  inProgressBookings: number;
}

const RESET_PASSWORD = "MFN@2026#Reset";

const AnalyticsCards = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [resetPass, setResetPass] = useState("");
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [bookingsRes, providersRes, walletRes] = await Promise.all([
      supabase.from("bookings").select("status, created_at, calculated_total, agreed_price"),
      supabase.from("profiles").select("user_id, provider_status").eq("provider_status", "approved"),
      supabase.from("provider_wallet_ledger").select("amount, reason").eq("reason", "platform_fee"),
    ]);

    const bookings = bookingsRes.data || [];
    const providers = providersRes.data || [];
    const walletEntries = walletRes.data || [];

    const totalRevenue = walletEntries.reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const todayBookings = bookings.filter(b => b.created_at >= todayISO);
    const completedBookings = bookings.filter(b => b.status === "COMPLETED");
    const todayCompleted = completedBookings.filter(b => b.created_at >= todayISO);
    const todayRevenue = todayCompleted.reduce((sum, b) => {
      const price = b.calculated_total || b.agreed_price || 0;
      return sum + (price * 0.1);
    }, 0);

    setStats({
      totalBookings: bookings.length,
      todayBookings: todayBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: bookings.filter(b => b.status === "CANCELLED").length,
      activeProviders: providers.length,
      totalRevenue,
      todayRevenue,
      inProgressBookings: bookings.filter(b => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(b.status)).length,
    });
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const handleReset = async () => {
    if (resetPass !== RESET_PASSWORD) {
      toast({ title: "خطأ", description: "كلمة المرور غير صحيحة", variant: "destructive" });
      return;
    }
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("admin-clear-all-bookings", {
      body: { action: "delete" },
    });
    setResetting(false);
    setShowReset(false);
    setResetPass("");
    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم مسح جميع البيانات بنجاح" });
      fetchStats();
    }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!stats) return null;

  const cards = [
    { label: "إجمالي الطلبات", value: stats.totalBookings, icon: CalendarCheck, color: "text-primary" },
    { label: "طلبات اليوم", value: stats.todayBookings, icon: Clock, color: "text-info" },
    { label: "قيد التنفيذ", value: stats.inProgressBookings, icon: TrendingUp, color: "text-warning" },
    { label: "مكتملة", value: stats.completedBookings, icon: CheckCircle, color: "text-success" },
    { label: "ملغاة", value: stats.cancelledBookings, icon: XCircle, color: "text-destructive" },
    { label: "مزودون معتمدون", value: stats.activeProviders, icon: Users, color: "text-chart-4" },
    { label: "إيرادات المنصة", value: `${stats.totalRevenue.toFixed(0)} د.أ`, icon: TrendingUp, color: "text-success" },
    { label: "إيرادات اليوم", value: `${stats.todayRevenue.toFixed(0)} د.أ`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground">نظرة عامة</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-destructive hover:text-destructive gap-1.5"
          onClick={() => setShowReset(true)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          إعادة تعيين
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border">
            <CardContent className="py-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showReset} onOpenChange={(o) => { setShowReset(o); if (!o) setResetPass(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">إعادة تعيين البيانات</DialogTitle>
            <DialogDescription>
              سيتم مسح جميع الحجوزات والسجلات المرتبطة بها. أدخل كلمة مرور الإدارة للمتابعة.
            </DialogDescription>
          </DialogHeader>
          <PasswordInput
            placeholder="كلمة مرور الإدارة"
            value={resetPass}
            onChange={(e) => setResetPass(e.target.value)}
            dir="ltr"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowReset(false); setResetPass(""); }}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetting || !resetPass}>
              {resetting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد المسح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AnalyticsCards;
