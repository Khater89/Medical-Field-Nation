import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Search, TrendingUp, AlertTriangle, Wallet, DollarSign,
  ArrowDownCircle, ArrowUpCircle, CalendarDays,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProviderDebt {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  role_type: string | null;
  balance: number;
}

interface LedgerEntry {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  booking_id: string | null;
  booking_number?: string | null;
  cliq_reference?: string | null;
  // Whether this debt entry has been settled already
  is_settled?: boolean;
}

const FinanceTab = () => {
  const { t, formatCurrency, formatDateShort, isRTL } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderDebt[]>([]);
  const [search, setSearch] = useState("");
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);

  // Detail drawer
  const [selectedProvider, setSelectedProvider] = useState<ProviderDebt | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Per-booking settlement modal
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementEntry, setSettlementEntry] = useState<LedgerEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cliq" | "cash">("cliq");
  const [cliqReference, setCliqReference] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [settlementLoading, setSettlementLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "provider");
    const providerIds = (roles || []).map((r) => r.user_id);
    if (providerIds.length === 0) { setProviders([]); setLoading(false); return; }

    const { data: staffRoles } = await supabase.from("user_roles").select("user_id").in("role", ["admin", "cs"]);
    const staffIds = new Set((staffRoles || []).map((r) => r.user_id));
    const pureProviderIds = providerIds.filter((id) => !staffIds.has(id));
    if (pureProviderIds.length === 0) { setProviders([]); setLoading(false); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, city, role_type")
      .in("user_id", pureProviderIds);

    const enriched: ProviderDebt[] = [];
    let debt = 0;
    for (const p of (profiles || [])) {
      const { data: bal } = await supabase.rpc("get_provider_balance", { _provider_id: p.user_id });
      const balance = bal || 0;
      if (balance < 0) {
        enriched.push({ ...p, balance });
        debt += Math.abs(balance);
      }
    }
    enriched.sort((a, b) => a.balance - b.balance);
    setProviders(enriched);
    setTotalDebt(debt);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: completedToday } = await supabase
      .from("bookings")
      .select("agreed_price, provider_share, actual_duration_minutes")
      .eq("status", "COMPLETED")
      .gte("completed_at", todayStart.toISOString());

    let earnings = 0;
    for (const b of (completedToday || [])) {
      if (b.agreed_price != null && b.provider_share != null && b.actual_duration_minutes != null) {
        const hours = Math.max(1, Math.ceil(b.actual_duration_minutes / 60));
        const clientTotal = b.agreed_price + (b.agreed_price * 0.5 * Math.max(0, hours - 1));
        const providerTotal = b.provider_share + (b.provider_share * 0.5 * Math.max(0, hours - 1));
        earnings += (clientTotal - providerTotal);
      }
    }
    setTodayEarnings(earnings);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openProviderLedger = async (provider: ProviderDebt) => {
    setSelectedProvider(provider);
    setLedgerLoading(true);

    const { data: entries } = await supabase
      .from("provider_wallet_ledger")
      .select("*")
      .eq("provider_id", provider.user_id)
      .order("created_at", { ascending: false });

    const allEntries = entries || [];
    const bookingIds = allEntries.filter((e) => e.booking_id).map((e) => e.booking_id!);
    let bookingMap: Record<string, string> = {};
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, booking_number")
        .in("id", [...new Set(bookingIds)]);
      for (const b of (bookings || [])) {
        bookingMap[b.id] = b.booking_number || b.id.slice(0, 8);
      }
    }

    // Determine which platform_fee entries have been settled (have a matching settlement with same booking_id)
    const settlementBookingIds = new Set(
      allEntries
        .filter((e) => e.reason === "settlement" && e.booking_id)
        .map((e) => e.booking_id!)
    );

    setLedger(allEntries.map((e: any) => ({
      ...e,
      booking_number: e.booking_id ? bookingMap[e.booking_id] || null : null,
      is_settled: e.reason === "platform_fee" && e.booking_id ? settlementBookingIds.has(e.booking_id) : false,
    })));
    setLedgerLoading(false);
  };

  const openSettlementForEntry = (entry: LedgerEntry) => {
    setSettlementEntry(entry);
    setCliqReference("");
    setCashAmount(String(Math.abs(entry.amount)));
    setPaymentMethod("cliq");
    setSettlementOpen(true);
  };

  const entryAmount = settlementEntry ? Math.abs(settlementEntry.amount) : 0;

  const confirmSettlement = async () => {
    if (!selectedProvider || !settlementEntry) return;

    if (paymentMethod === "cliq" && !cliqReference.trim()) return;
    if (paymentMethod === "cash") {
      const parsed = parseFloat(cashAmount);
      if (isNaN(parsed) || parsed <= 0) return;
    }

    setSettlementLoading(true);

    const settlementAmount = paymentMethod === "cash" ? parseFloat(cashAmount) : entryAmount;
    const reference = paymentMethod === "cliq" ? cliqReference.trim() : `CASH-${Date.now()}`;

    const { error } = await supabase.from("provider_wallet_ledger").insert({
      provider_id: selectedProvider.user_id,
      amount: settlementAmount,
      reason: "settlement",
      booking_id: settlementEntry.booking_id,
      cliq_reference: reference,
      settled_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      const methodLabel = paymentMethod === "cliq" ? `CliQ: ${cliqReference.trim()}` : `كاش: ${formatCurrency(settlementAmount)}`;
      const bookingNum = settlementEntry.booking_number || "—";
      await supabase.from("staff_notifications").insert({
        title: `💰 تسوية: ${selectedProvider.full_name || "مزوّد"} — طلب ${bookingNum}`,
        body: `تمت تسوية ${formatCurrency(settlementAmount)} — ${methodLabel}\nرقم الطلب: ${bookingNum}`,
        target_role: "admin",
        provider_id: selectedProvider.user_id,
        booking_id: settlementEntry.booking_id,
      });

      // WhatsApp notification via outbox
      const providerPhone = selectedProvider.phone || "";
      if (providerPhone) {
        const whatsappMessage = `مرحباً ${selectedProvider.full_name || "مزود"}، تم تسجيل تسوية مالية في حسابك بقيمة ${settlementAmount} د.أ عبر ${methodLabel} — طلب رقم ${bookingNum}. فريق إدارة Medical Field Nation.`;
        await supabase.from("booking_outbox").insert({
          booking_id: settlementEntry.booking_id || "00000000-0000-0000-0000-000000000000",
          destination: "webhook",
          payload: {
            event: "provider_settlement",
            provider_id: selectedProvider.user_id,
            provider_name: selectedProvider.full_name,
            provider_phone: providerPhone,
            amount: settlementAmount,
            payment_method: methodLabel,
            booking_number: bookingNum,
            message: whatsappMessage,
          },
        } as any);
      }

      toast({ title: t("provider.details.settlement_success") });
      setSettlementOpen(false);
      setSettlementEntry(null);
      const updatedProvider = { ...selectedProvider, balance: selectedProvider.balance + settlementAmount };
      setSelectedProvider(updatedProvider);
      openProviderLedger(updatedProvider);
      fetchData();
    }
    setSettlementLoading(false);
  };

  const filtered = providers.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.full_name || "").toLowerCase().includes(q)
      || (p.phone || "").includes(q)
      || (p.city || "").toLowerCase().includes(q);
  });

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">{t("finance.today_earnings")}</p>
                <p className="text-xl font-bold text-success">{formatCurrency(todayEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">{t("finance.total_debt")}</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(totalDebt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t("finance.providers_with_debt")}</p>
                <p className="text-xl font-bold text-primary">{providers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">{t("finance.title")}</h2>
        <div className="relative ms-auto">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={t("admin.providers.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${isRTL ? "pr-9" : "pl-9"} w-[200px]`}
          />
        </div>
      </div>

      {/* Provider Debt Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا يوجد مزوّدون مديونون حالياً
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t("admin.providers.col.name")}</TableHead>
                <TableHead>{t("admin.providers.col.phone")}</TableHead>
                <TableHead>{t("admin.providers.col.city")}</TableHead>
                <TableHead>{t("admin.providers.col.type")}</TableHead>
                <TableHead>{t("finance.debt_amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.user_id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => openProviderLedger(p)}
                >
                  <TableCell className="font-medium text-sm">{p.full_name || "—"}</TableCell>
                  <TableCell className="text-xs" dir="ltr">{p.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{p.city || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {t(`role_type.${p.role_type || ""}`) !== `role_type.${p.role_type || ""}` ? t(`role_type.${p.role_type}`) : p.role_type || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-bold text-destructive">
                      {formatCurrency(p.balance)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Provider Ledger Drawer */}
      <Sheet open={!!selectedProvider} onOpenChange={(open) => { if (!open) setSelectedProvider(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{selectedProvider?.full_name || "—"}</SheetTitle>
            <SheetDescription>{t("finance.ledger_title")}</SheetDescription>
          </SheetHeader>

          {selectedProvider && (
            <div className="space-y-4">
              {/* Balance summary */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium">{t("finance.current_balance")}</span>
                  <span className="text-lg font-bold text-destructive">
                    {formatCurrency(selectedProvider.balance)}
                  </span>
                </CardContent>
              </Card>

              {/* Ledger entries with per-booking settle buttons */}
              {ledgerLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("provider.wallet.no_transactions")}</p>
              ) : (
                <div className="space-y-2">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      {entry.amount < 0 ? (
                        <ArrowDownCircle className="h-5 w-5 text-destructive shrink-0" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-success shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {entry.reason === "platform_fee" ? t("finance.reason.platform_fee") :
                             entry.reason === "settlement" ? t("provider.wallet.settlement") :
                             entry.reason}
                          </Badge>
                          {entry.booking_number && (
                            <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{entry.booking_number}</span>
                          )}
                          {entry.cliq_reference && (
                            <span className="text-[10px] text-muted-foreground" dir="ltr">
                              {entry.cliq_reference.startsWith("CASH-") ? "💵 كاش" : `💳 CliQ: ${entry.cliq_reference}`}
                            </span>
                          )}
                          {entry.reason === "platform_fee" && entry.is_settled && (
                            <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/30">✓ تمت التسوية</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <CalendarDays className="h-3 w-3 inline me-1" />
                          {formatDateShort(entry.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${entry.amount < 0 ? "text-destructive" : "text-success"}`}>
                          {entry.amount > 0 ? "+" : ""}{formatCurrency(entry.amount)}
                        </span>
                        {/* Per-booking settle button for unsettled platform_fee entries */}
                        {entry.reason === "platform_fee" && !entry.is_settled && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1 px-2"
                            onClick={(e) => { e.stopPropagation(); openSettlementForEntry(entry); }}
                          >
                            <DollarSign className="h-3 w-3" /> تسوية
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Per-Booking Settlement Modal */}
      <Dialog open={settlementOpen} onOpenChange={(open) => { if (!open) { setSettlementOpen(false); setSettlementEntry(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("provider.details.settlement")}</DialogTitle>
            <DialogDescription>
              {selectedProvider?.full_name || "—"} — طلب {settlementEntry?.booking_number || "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Booking info */}
            {settlementEntry?.booking_number && (
              <div className="rounded-md bg-muted/50 border border-border p-3 text-sm">
                <p className="font-medium">رقم الطلب: <span dir="ltr" className="font-mono">{settlementEntry.booking_number}</span></p>
              </div>
            )}

            {/* Amount due for this booking */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">المبلغ المستحق لهذا الطلب</Label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm font-bold text-destructive">
                {formatCurrency(entryAmount)}
              </div>
            </div>

            {/* CliQ reference field - only CliQ payment supported */}
            <div className="space-y-2">
              <Label htmlFor="cliq-ref" className="text-sm font-medium">
                رقم حوالة CliQ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cliq-ref"
                placeholder="أدخل رقم حوالة CliQ"
                value={cliqReference}
                onChange={(e) => setCliqReference(e.target.value)}
                dir="ltr"
              />
              <p className="text-[10px] text-muted-foreground">
                الدفع للمنصة حصرياً عبر CliQ
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSettlementOpen(false); setSettlementEntry(null); }}>
              إلغاء
            </Button>
            <Button
              onClick={confirmSettlement}
              disabled={
                settlementLoading || entryAmount <= 0 ||
                (paymentMethod === "cliq" && !cliqReference.trim()) ||
                (paymentMethod === "cash" && (!cashAmount || parseFloat(cashAmount) <= 0 || parseFloat(cashAmount) > entryAmount))
              }
              className="gap-1.5"
            >
              {settlementLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد التسوية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceTab;
