import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Phone, MapPin, Briefcase, Navigation, Stethoscope,
  CheckCircle, XCircle, Wallet, Clock, Globe, Search, Loader2,
  CalendarCheck, UserCheck, Mail, Star, CheckCheck, Ban, KeyRound,
  FileText, ExternalLink, Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BookingDetailsDrawer, { type BookingRow } from "./BookingDetailsDrawer";
import CSAssignmentDialog from "@/components/cs/CSAssignmentDialog";

export interface ProviderProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  city: string | null;
  role_type: string | null;
  provider_status: string;
  available_now: boolean;
  profile_completed: boolean;
  experience_years: number | null;
  tools: string[] | null;
  specialties: string[] | null;
  languages: string[] | null;
  radius_km: number | null;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
  last_active_at: string | null;
  date_of_birth: string | null;
  created_at: string;
  hasProviderRole: boolean;
  balance: number;
  bio?: string | null;
  avatar_url?: string | null;
  license_file_url?: string | null;
  provider_number?: number | null;
  academic_cert_url?: string | null;
  experience_cert_url?: string | null;
  license_id?: string | null;
}

const PROVIDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-info/10 text-info border-info/30",
  CONFIRMED: "bg-primary/20 text-primary border-primary/30",
  ASSIGNED: "bg-warning/10 text-warning border-warning/30",
  ACCEPTED: "bg-success/10 text-success border-success/30",
  COMPLETED: "bg-success text-success-foreground",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/30",
};

const BOOKING_FILTER_STATUSES = ["ALL", "NEW", "ASSIGNED", "ACCEPTED", "COMPLETED", "CANCELLED", "REJECTED"];

interface Props {
  provider: ProviderProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (userId: string) => void;
  onSuspend: (userId: string) => void;
  onSettlement: (userId: string) => void;
  onReject?: (userId: string) => void;
}

const ProviderDetailsDrawer = ({ provider, open, onOpenChange, onApprove, onSuspend, onSettlement, onReject }: Props) => {
  const { t, formatCurrency, formatDate, formatDateShort, isRTL } = useLanguage();
  const { isAdmin: currentUserIsAdmin } = useAuth();
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Bookings tab state
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState("ALL");
  const [bookingSearch, setBookingSearch] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [assignBooking, setAssignBooking] = useState<BookingRow | null>(null);

  // Provider stats
  const [statsCompleted, setStatsCompleted] = useState(0);
  const [statsCancelled, setStatsCancelled] = useState(0);
  const [statsAvgRating, setStatsAvgRating] = useState<number | null>(null);
  const [statsRatingCount, setStatsRatingCount] = useState(0);

  // Fetch bookings when provider changes
  useEffect(() => {
    if (!provider || !open) {
      setBookings([]);
      return;
    }
    fetchProviderBookings(provider.user_id);
    fetchProviderStats(provider.user_id);
  }, [provider?.user_id, open]);

  const fetchProviderStats = async (providerId: string) => {
    const [bookingsRes, ratingsRes, clientCancelRes] = await Promise.all([
      supabase.from("bookings").select("id, status").eq("assigned_provider_id", providerId).in("status", ["COMPLETED", "CANCELLED", "REJECTED"]),
      supabase.from("provider_ratings" as any).select("rating").eq("provider_id", providerId),
      supabase.from("booking_history").select("booking_id").eq("action", "CANCELLED").eq("performer_role", "customer"),
    ]);
    const clientCancelledIds = new Set((clientCancelRes.data || []).map((h: any) => h.booking_id));
    let completed = 0, cancelled = 0;
    (bookingsRes.data || []).forEach((b: any) => {
      if (b.status === "COMPLETED") completed++;
      else if (!clientCancelledIds.has(b.id)) cancelled++;
    });
    setStatsCompleted(completed);
    setStatsCancelled(cancelled);
    const ratings = (ratingsRes.data || []) as any[];
    setStatsRatingCount(ratings.length);
    setStatsAvgRating(ratings.length > 0 ? ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length : null);
  };

  const fetchProviderBookings = async (providerId: string) => {
    setBookingsLoading(true);
    const [bookingsRes, contactsRes, servicesRes] = await Promise.all([
      supabase.from("bookings").select("*").eq("assigned_provider_id", providerId).order("scheduled_at", { ascending: false }),
      supabase.from("booking_contacts").select("*"),
      supabase.from("services").select("id, name"),
    ]);

    const contactMap: Record<string, any> = {};
    (contactsRes.data || []).forEach((c: any) => { contactMap[c.booking_id] = c; });

    const merged = (bookingsRes.data || []).map((b: any) => {
      const contact = contactMap[b.id];
      return {
        ...b,
        customer_name: contact?.customer_name || b.customer_display_name || "",
        customer_phone: contact?.customer_phone || "",
        client_address_text: contact?.client_address_text || null,
      };
    });
    setBookings(merged as BookingRow[]);

    const svcMap: Record<string, string> = {};
    (servicesRes.data || []).forEach((s: any) => { svcMap[s.id] = s.name; });
    setServiceNames(svcMap);

    // Provider name for details drawer
    const pMap: Record<string, string> = {};
    if (provider) {
      pMap[provider.user_id] = provider.full_name || t("admin.providers.no_name");
    }
    setProviderNames(pMap);

    setBookingsLoading(false);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (bookingFilter !== "ALL" && b.status !== bookingFilter) return false;
      if (bookingSearch) {
        const q = bookingSearch.toLowerCase();
        return (
          (b.customer_name || "").toLowerCase().includes(q) ||
          (b.customer_phone || "").includes(q) ||
          b.city.toLowerCase().includes(q) ||
          (b.booking_number || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, bookingFilter, bookingSearch]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    BOOKING_FILTER_STATUSES.forEach((s) => { counts[s] = 0; });
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status]++;
      counts["ALL"]++;
    });
    return counts;
  }, [bookings]);

  const handleAssignFromDetails = (booking: BookingRow) => {
    setSelectedBooking(null);
    setAssignBooking(booking);
  };

  if (!provider) return null;

  const age = provider.date_of_birth
    ? Math.floor((Date.now() - new Date(provider.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const roleTypeLabel = provider.role_type
    ? (t(`role_type.${provider.role_type}`) !== `role_type.${provider.role_type}` ? t(`role_type.${provider.role_type}`) : provider.role_type)
    : "—";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base">{provider.full_name || t("admin.providers.no_name")}</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="profile" className="text-xs py-2">
                {t("provider.details.tab.profile")}
              </TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs py-2 gap-1">
                <CalendarCheck className="h-3.5 w-3.5" />
                {t("provider.details.tab.bookings")} ({bookings.length})
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="space-y-5">
                {/* Status & Role */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={PROVIDER_STATUS_COLORS[provider.provider_status] || ""}>
                      {t(`provider_status.${provider.provider_status}`)}
                    </Badge>
                    {provider.available_now && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                        {t("admin.providers.available")}
                      </Badge>
                    )}
                    {!provider.profile_completed && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                        {t("provider.details.profile_incomplete")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{roleTypeLabel}</span>
                </div>

                {/* Basic Info */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("provider.details.basic_info")}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {provider.email && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span dir="ltr" className="text-xs">{provider.email}</span>
                      </div>
                    )}
                    {provider.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span dir="ltr">{provider.phone}</span>
                      </div>
                    )}
                    {provider.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {provider.city}
                      </div>
                    )}
                    {age != null && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {age} {t("admin.providers.years")}
                      </div>
                    )}
                    {provider.experience_years != null && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        {provider.experience_years} {t("admin.providers.years")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("provider.details.location")}</h4>
                  {provider.address_text && (
                    <div className="flex items-start gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      {provider.address_text}
                    </div>
                  )}
                  {provider.radius_km && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("provider.details.coverage_radius")}: {provider.radius_km} {t("provider.details.km")}
                    </div>
                  )}
                  {provider.lat && provider.lng && (
                    <p className="text-xs text-muted-foreground" dir="ltr">📍 {provider.lat}, {provider.lng}</p>
                  )}
                </div>

                {/* Specialties */}
                {provider.specialties && provider.specialties.length > 0 && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Stethoscope className="h-3 w-3" /> {t("provider.details.specialties")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools */}
                {provider.tools && provider.tools.length > 0 && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("provider.details.tools")}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.tools.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-xs">{tool}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {provider.languages && provider.languages.length > 0 && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {t("provider.details.languages")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.languages.map((l) => (
                        <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wallet */}
                {provider.hasProviderRole && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Wallet className="h-3 w-3" /> {t("provider.details.wallet")}
                    </h4>
                    <p className={`text-lg font-bold ${provider.balance < 0 ? "text-destructive" : "text-success"}`}>
                      {formatCurrency(provider.balance)}
                    </p>
                  </div>
                )}

                {/* Performance Stats */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    📊 الأداء والتقييم
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center rounded-lg bg-success/5 border border-success/20 p-2">
                      <CheckCheck className="h-4 w-4 text-success mx-auto mb-1" />
                      <p className="text-lg font-bold text-success">{statsCompleted}</p>
                      <p className="text-[10px] text-muted-foreground">مكتملة</p>
                    </div>
                    <div className="text-center rounded-lg bg-destructive/5 border border-destructive/20 p-2">
                      <Ban className="h-4 w-4 text-destructive mx-auto mb-1" />
                      <p className="text-lg font-bold text-destructive">{statsCancelled}</p>
                      <p className="text-[10px] text-muted-foreground">ملغاة/مرفوضة</p>
                    </div>
                    <div className="text-center rounded-lg bg-warning/5 border border-warning/20 p-2">
                      <Star className="h-4 w-4 text-warning fill-warning mx-auto mb-1" />
                      <p className="text-lg font-bold text-warning">{statsAvgRating ? statsAvgRating.toFixed(1) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {statsRatingCount > 0 ? `${statsRatingCount} تقييم` : "لا تقييمات"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificates Review */}
                {(provider.academic_cert_url || provider.experience_cert_url || provider.license_id) && (
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3" /> الشهادات والمستندات
                    </h4>
                    {provider.license_id && (
                      <div className="text-sm flex items-center gap-1.5">
                        <span className="text-muted-foreground">رقم الترخيص:</span>
                        <span className="font-mono font-medium">{provider.license_id}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {provider.academic_cert_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={async () => {
                            const { data } = await supabase.storage.from("provider-certificates").createSignedUrl(provider.academic_cert_url!, 300);
                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          }}
                        >
                          <FileText className="h-3 w-3" /> الشهادة العلمية
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      {provider.experience_cert_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={async () => {
                            const { data } = await supabase.storage.from("provider-certificates").createSignedUrl(provider.experience_cert_url!, 300);
                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          }}
                        >
                          <FileText className="h-3 w-3" /> شهادة الخبرة
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border p-3 space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("provider.details.activity")}</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>{t("provider.details.registered")}: {formatDate(provider.created_at)}</p>
                    {provider.last_active_at && (
                      <p>{t("provider.details.last_active")}: {formatDateShort(provider.last_active_at)}</p>
                    )}
                  </div>
                </div>

                {/* Admin: Set Password */}
                {currentUserIsAdmin && (
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> تعيين كلمة مرور جديدة
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      disabled={passwordLoading}
                      onClick={async () => {
                        const newPass = prompt("أدخل كلمة المرور الجديدة للمزود (6 أحرف على الأقل):");
                        if (!newPass || newPass.trim().length < 6) {
                          if (newPass) alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
                          return;
                        }
                        setPasswordLoading(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("admin-manage-admins", {
                            body: { action: "set_password", user_id: provider.user_id, new_password: newPass.trim() },
                          });
                          if (error) throw error;
                          if (data?.error) throw new Error(data.error);
                          alert("✅ تم تعيين كلمة المرور الجديدة بنجاح");
                        } catch (err: any) {
                          alert("❌ خطأ: " + (err.message || "حدث خطأ"));
                        } finally {
                          setPasswordLoading(false);
                        }
                      }}
                    >
                      {passwordLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
                      تعيين كلمة مرور جديدة
                    </Button>
                    <p className="text-[10px] text-muted-foreground">يمكنك تعيين كلمة مرور جديدة وإعطائها للمزود (للأدمن فقط)</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 flex-wrap">
                  {provider.provider_status === "pending" && (
                    <>
                      <Button size="sm" className="gap-1.5 flex-1" onClick={() => onApprove(provider.user_id)}>
                        <CheckCircle className="h-4 w-4" /> {t("provider.details.approve")}
                      </Button>
                      {onReject && (
                        <Button size="sm" variant="destructive" className="gap-1.5 flex-1" onClick={() => {
                          if (confirm("هل أنت متأكد من رفض وحذف هذا الطلب نهائياً؟")) {
                            onReject(provider.user_id);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" /> رفض وحذف
                        </Button>
                      )}
                    </>
                  )}
                  {provider.provider_status === "approved" && (
                    <Button size="sm" variant="destructive" className="gap-1.5 flex-1" onClick={() => onSuspend(provider.user_id)}>
                      <XCircle className="h-4 w-4" /> {t("provider.details.suspend")}
                    </Button>
                  )}
                  {provider.provider_status === "suspended" && (
                    <Button size="sm" className="gap-1.5 flex-1" onClick={() => onApprove(provider.user_id)}>
                      <CheckCircle className="h-4 w-4" /> {t("provider.details.reactivate")}
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[150px]">
                    <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                    <Input
                      placeholder={t("admin.bookings.search")}
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className={`${isRTL ? "pr-9" : "pl-9"}`}
                    />
                  </div>
                  <Select value={bookingFilter} onValueChange={setBookingFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_FILTER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === "ALL" ? t("admin.bookings.filter_all") : t(`status.${s}`)} ({statusCounts[s] || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status chips */}
                <div className="flex flex-wrap gap-1.5">
                  {BOOKING_FILTER_STATUSES.filter(s => s !== "ALL").map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className={`text-[10px] cursor-pointer ${bookingFilter === s ? BOOKING_STATUS_COLORS[s] || "" : "opacity-50"}`}
                      onClick={() => setBookingFilter(bookingFilter === s ? "ALL" : s)}
                    >
                      {t(`status.${s}`)} ({statusCounts[s] || 0})
                    </Badge>
                  ))}
                </div>

                {/* Bookings list */}
                {bookingsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">{t("admin.bookings.no_bookings")}</div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">{t("admin.bookings.col.number")}</TableHead>
                          <TableHead className="text-xs">{t("admin.bookings.col.service")}</TableHead>
                          <TableHead className="text-xs">{t("admin.bookings.col.customer")}</TableHead>
                          <TableHead className="text-xs">{t("admin.bookings.col.date")}</TableHead>
                          <TableHead className="text-xs">{t("admin.bookings.col.amount")}</TableHead>
                          <TableHead className="text-xs">{t("admin.bookings.col.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((b) => (
                          <TableRow
                            key={b.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => setSelectedBooking(b)}
                          >
                            <TableCell className="text-xs font-mono" dir="ltr">
                              {b.booking_number || b.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {serviceNames[b.service_id] || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {b.customer_name || b.customer_display_name || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDateShort(b.scheduled_at)}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {b.agreed_price != null ? (
                                <span className="text-success">{formatCurrency(b.agreed_price)}</span>
                              ) : formatCurrency(b.subtotal)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${BOOKING_STATUS_COLORS[b.status] || ""}`}>
                                {t(`status.${b.status}`)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Booking Details Drawer (opens on top) */}
      <BookingDetailsDrawer
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(o) => { if (!o) setSelectedBooking(null); }}
        serviceName={selectedBooking ? serviceNames[selectedBooking.service_id] || t("provider.dashboard.service") : ""}
        providerName={provider?.full_name || null}
        onStatusChange={() => {
          setSelectedBooking(null);
          if (provider) fetchProviderBookings(provider.user_id);
        }}
      />
    </>
  );
};

export default ProviderDetailsDrawer;
