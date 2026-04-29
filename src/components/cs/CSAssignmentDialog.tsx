import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck, Loader2, AlertTriangle, Search,
  MapPin, Star, Sparkles, Filter, X, Zap,
} from "lucide-react";

/* ── Types ── */

interface BookingRow {
  id: string;
  booking_number: string | null;
  customer_name?: string | null;
  customer_display_name?: string | null;
  city: string;
  client_lat: number | null;
  client_lng: number | null;
  subtotal: number;
  scheduled_at: string;
}

interface NearestProvider {
  provider_id: string;
  full_name: string;
  city: string;
  distance_km: number;
  available_now: boolean;
  phone: string;
  role_type: string;
  experience_years: number;
}

interface ProviderRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  role_type: string | null;
  provider_status: string;
  available_now: boolean;
  profile_completed: boolean;
  experience_years: number | null;
  specialties: string[] | null;
  radius_km: number | null;
  lat: number | null;
  lng: number | null;
  provider_number?: number | null;
}

const ROLE_TYPE_LABELS: Record<string, string> = {
  doctor: "طبيب",
  nurse: "ممرض/ة",
  caregiver: "مقدم رعاية",
  physiotherapist: "أخصائي علاج طبيعي",
  midwife: "قابلة قانونية",
};

// Smart category → role mapping (strict filtering)
const CATEGORY_ROLE_MAP: Record<string, string[]> = {
  medical: ["doctor"],
  nursing: ["nurse", "caregiver", "midwife"],
  packages: ["doctor", "nurse", "caregiver", "physiotherapist", "midwife"],
};

interface Props {
  booking: BookingRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
  serviceName: string;
  servicePrice?: number | null;
  serviceCategory?: string | null;
}

type QuickFilter = "all" | "nearest" | "available" | "experienced";

const CSAssignmentDialog = ({ booking, open, onOpenChange, onAssigned, serviceName, servicePrice, serviceCategory }: Props) => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [agreedPrice, setAgreedPrice] = useState(servicePrice ?? booking.subtotal);
  const [internalNote, setInternalNote] = useState("");
  const [nearestProviders, setNearestProviders] = useState<NearestProvider[]>([]);
  const [fallbackProviders, setFallbackProviders] = useState<ProviderRow[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [providerRatings, setProviderRatings] = useState<Record<string, number>>({});

  const allowedRoles = serviceCategory ? CATEGORY_ROLE_MAP[serviceCategory] || [] : [];
  const isEmergency =
    (serviceCategory || "").toLowerCase() === "emergency" ||
    (serviceName || "").includes("طوارئ") ||
    (serviceName || "").toLowerCase().includes("emergency");
  const emergencyProviderIds = useMemo(() => {
    const set = new Set<string>();
    fallbackProviders.forEach((p) => {
      if ((p.specialties || []).some((s) => (s || "").toLowerCase().includes("emergency") || s?.includes("طوارئ"))) {
        set.add(p.user_id);
      }
    });
    return set;
  }, [fallbackProviders]);
  const matchesEmergency = (id: string) => !isEmergency || emergencyProviderIds.has(id);

  useEffect(() => {
    if (!open) return;
    setAgreedPrice(servicePrice ?? booking.subtotal);
    setInternalNote("");
    setSelectedProvider(null);
    setSearch("");
    setQuickFilter("all");
    fetchProviders();
  }, [open, booking]);

  const fetchProviders = async () => {
    setLoadingProviders(true);

    // Conflicting bookings (same time window)
    const scheduledDate = new Date(booking.scheduled_at);
    const windowStart = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const { data: conflictingBookings } = await supabase
      .from("bookings")
      .select("assigned_provider_id")
      .not("assigned_provider_id", "is", null)
      .in("status", ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "PROVIDER_ON_THE_WAY"])
      .gte("scheduled_at", windowStart)
      .lte("scheduled_at", windowEnd)
      .neq("id", booking.id);

    const busyProviderIds = new Set(
      (conflictingBookings || []).map((b: any) => b.assigned_provider_id).filter(Boolean)
    );

    if (booking.client_lat && booking.client_lng) {
      const { data } = await supabase.rpc("find_nearest_providers" as any, {
        _lat: booking.client_lat,
        _lng: booking.client_lng,
        _limit: 15,
      });
      setNearestProviders(
        ((data as NearestProvider[]) || []).filter((p) => !busyProviderIds.has(p.provider_id))
      );
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("provider_status", "approved")
      .eq("profile_completed", true);

    setFallbackProviders(
      ((profiles as unknown as ProviderRow[]) || []).filter((p) => !busyProviderIds.has(p.user_id))
    );

    // Fetch ratings (avg per provider)
    const { data: ratings } = await supabase
      .from("provider_ratings")
      .select("provider_id, rating");
    if (ratings) {
      const grouped: Record<string, { sum: number; n: number }> = {};
      (ratings as any[]).forEach(r => {
        if (!grouped[r.provider_id]) grouped[r.provider_id] = { sum: 0, n: 0 };
        grouped[r.provider_id].sum += r.rating;
        grouped[r.provider_id].n += 1;
      });
      const avgs: Record<string, number> = {};
      Object.entries(grouped).forEach(([k, v]) => { avgs[k] = v.sum / v.n; });
      setProviderRatings(avgs);
    }

    setLoadingProviders(false);
  };

  const handleAssign = async () => {
    if (!selectedProvider) {
      toast({ title: "اختر مزوّد خدمة أولاً", variant: "destructive" });
      return;
    }
    if (agreedPrice <= 0) {
      toast({ title: "السعر يجب أن يكون أكبر من صفر", variant: "destructive" });
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          assigned_provider_id: selectedProvider,
          status: "ASSIGNED",
          assigned_at: new Date().toISOString(),
          assigned_by: isAdmin ? "admin" : "cs",
          agreed_price: agreedPrice,
          internal_note: internalNote.trim() || null,
        } as any)
        .eq("id", booking.id);

      if (error) throw error;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase.from("booking_history").insert({
          booking_id: booking.id,
          action: "ASSIGNED",
          performed_by: authUser.id,
          performer_role: isAdmin ? "admin" : "cs",
          note: `تم الإسناد إلى مزوّد بسعر ${agreedPrice} د.أ${internalNote.trim() ? ` — ${internalNote.trim()}` : ""}`,
        });
      }

      toast({ title: "تم الإسناد بنجاح ✅" });
      onAssigned();
    } catch (err: any) {
      toast({ title: "خطأ في الإسناد", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  // City matching
  const CITY_ALIASES: Record<string, string[]> = {
    "amman": ["عمان", "amman", "عمّان"],
    "irbid": ["اربد", "إربد", "irbid"],
    "zarqa": ["الزرقاء", "zarqa", "الزرقا"],
    "aqaba": ["العقبة", "aqaba"],
    "salt": ["السلط", "salt"],
    "madaba": ["مادبا", "madaba"],
    "jerash": ["جرش", "jerash"],
    "ajloun": ["عجلون", "ajloun"],
    "karak": ["الكرك", "karak"],
    "tafilah": ["الطفيلة", "tafilah"],
    "maan": ["معان", "maan"],
    "mafraq": ["المفرق", "mafraq"],
  };
  const normalizeCity = (city: string) => city?.toLowerCase().trim().replace(/[\u0650\u064E\u064F\u0651\u0652\u064B\u064C\u064D]/g, "");
  const citiesMatch = (city1: string | null, city2: string) => {
    if (!city1) return false;
    const n1 = normalizeCity(city1);
    const n2 = normalizeCity(city2);
    if (n1.includes(n2) || n2.includes(n1)) return true;
    for (const aliases of Object.values(CITY_ALIASES)) {
      const na = aliases.map(normalizeCity);
      if (na.some(a => n1.includes(a) || a.includes(n1)) && na.some(a => n2.includes(a) || a.includes(n2))) {
        return true;
      }
    }
    return false;
  };

  // Filter helpers
  const matchesRole = (roleType: string | null) => {
    if (!allowedRoles.length) return true;
    return roleType ? allowedRoles.includes(roleType) : false;
  };
  const matchesSearch = (name: string | null, providerNumber?: number | null) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (name?.toLowerCase().includes(q)) ||
      (providerNumber && `#${providerNumber}`.includes(q)) ||
      (providerNumber && String(providerNumber).includes(q))
    );
  };

  // STRICT: city + category. nearest is already geo-bounded by RPC radius.
  const nearestIds = new Set(nearestProviders.map((p) => p.provider_id));
  const filteredNearest = useMemo(() =>
    nearestProviders
      .filter(p => matchesRole(p.role_type) && matchesSearch(p.full_name)),
    [nearestProviders, allowedRoles, search]
  );
  const sameCityProviders = useMemo(() =>
    fallbackProviders.filter(
      (p) => !nearestIds.has(p.user_id)
        && citiesMatch(p.city, booking.city)
        && matchesRole(p.role_type)
        && matchesSearch(p.full_name, p.provider_number)
    ),
    [fallbackProviders, nearestIds, booking.city, allowedRoles, search]
  );

  // Apply quick filter on combined list
  const applyQuickFilter = <T extends { available_now?: boolean; experience_years?: number | null; provider_id?: string; user_id?: string }>(list: T[]) => {
    if (quickFilter === "available") return list.filter(p => p.available_now);
    if (quickFilter === "experienced") return list.filter(p => (p.experience_years ?? 0) >= 5);
    if (quickFilter === "nearest") return list; // nearest is already shown first
    return list;
  };

  const finalNearest = applyQuickFilter(filteredNearest);
  const finalSameCity = applyQuickFilter(sameCityProviders);

  const totalShown = finalNearest.length + finalSameCity.length;

  const categoryLabel = serviceCategory === "medical" ? "أطباء فقط"
    : serviceCategory === "nursing" ? "ممرضين/مقدمي رعاية فقط"
    : "جميع التخصصات";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-background/95 border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            تعيين مزوّد وتحديد السعر
          </DialogTitle>
          <DialogDescription>
            {serviceName} — {booking.customer_name} — {booking.city}
            {booking.booking_number && <span className="ms-1" dir="ltr">({booking.booking_number})</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Price Setting — glass card */}
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-3 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              تحديد السعر النهائي
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">السعر الأساسي</label>
                <p className="text-sm font-medium">{servicePrice ?? booking.subtotal} د.أ</p>
              </div>
              <div>
                <label className="text-xs font-medium">السعر المتفق عليه *</label>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(Number(e.target.value))}
                  dir="ltr"
                  className="h-8"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">ملاحظة داخلية (CS/Admin فقط)</label>
              <Textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="ملاحظة لا تظهر للمزوّد أو العميل..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Smart Filter Bar */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background/60 to-accent/5 backdrop-blur-md p-3 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" />
                اختيار المزوّد
              </h4>
              <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30">
                {totalShown} نتيجة
              </Badge>
            </div>

            {/* Strict filtering badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/30">
                <MapPin className="h-2.5 w-2.5" /> {booking.city}
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/30">
                🎯 {categoryLabel}
              </Badge>
            </div>

            {/* Searchable input */}
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم المرجع #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 ps-8 pe-8 bg-background/70 backdrop-blur border-border/50 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="مسح"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all" as QuickFilter, label: "الكل", icon: "✨" },
                { id: "nearest" as QuickFilter, label: "الأقرب", icon: "📍" },
                { id: "available" as QuickFilter, label: "متاح الآن", icon: "🟢" },
                { id: "experienced" as QuickFilter, label: "خبرة ٥+", icon: "⭐" },
              ].map(chip => (
                <motion.button
                  key={chip.id}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.04 }}
                  onClick={() => setQuickFilter(chip.id)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                    quickFilter === chip.id
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-background/60 backdrop-blur border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="me-1">{chip.icon}</span>{chip.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Provider Lists */}
          <div className="space-y-2">
            {loadingProviders ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <AnimatePresence mode="popLayout">
                {finalNearest.length > 0 && (
                  <motion.div
                    key="nearest"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1.5"
                  >
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> الأقرب جغرافياً:
                    </p>
                    {finalNearest.map((p) => {
                      const rating = providerRatings[p.provider_id];
                      const selected = selectedProvider === p.provider_id;
                      return (
                        <motion.div key={p.provider_id} layout whileTap={{ scale: 0.98 }}>
                          <Card
                            className={`cursor-pointer transition-all backdrop-blur-sm ${
                              selected
                                ? "ring-2 ring-primary bg-primary/5 shadow-md"
                                : "bg-card/70 hover:bg-accent/40 border-border/50"
                            }`}
                            onClick={() => setSelectedProvider(p.provider_id)}
                          >
                            <CardContent className="py-2.5 px-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{p.full_name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <span>{ROLE_TYPE_LABELS[p.role_type || ""] || p.role_type}</span>
                                  <span>·</span>
                                  <span>{p.experience_years || 0} سنة</span>
                                  {rating != null && (
                                    <span className="flex items-center gap-0.5 text-warning">
                                      <Star className="h-2.5 w-2.5 fill-warning" /> {rating.toFixed(1)}
                                    </span>
                                  )}
                                  {p.available_now && <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] py-0">متاح</Badge>}
                                </div>
                              </div>
                              <div className="text-end">
                                <span className="text-sm font-bold text-primary">{p.distance_km} كم</span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {finalSameCity.length > 0 && (
                  <motion.div
                    key="city"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1.5 mt-2"
                  >
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> في نفس المدينة:
                    </p>
                    {finalSameCity.map((p) => {
                      const selected = selectedProvider === p.user_id;
                      const rating = providerRatings[p.user_id];
                      return (
                        <motion.div key={p.user_id} layout whileTap={{ scale: 0.98 }}>
                          <Card
                            className={`cursor-pointer transition-all backdrop-blur-sm ${
                              selected
                                ? "ring-2 ring-primary bg-primary/5 shadow-md"
                                : "bg-card/70 hover:bg-accent/40 border-border/50"
                            }`}
                            onClick={() => setSelectedProvider(p.user_id)}
                          >
                            <CardContent className="py-2.5 px-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">
                                    {p.full_name || "بدون اسم"}
                                    {p.provider_number && (
                                      <span className="ms-1 text-[10px] text-muted-foreground" dir="ltr">#{p.provider_number}</span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                    <span>{ROLE_TYPE_LABELS[p.role_type || ""] || p.role_type}</span>
                                    <span>·</span>
                                    <span>{p.experience_years || 0} سنة</span>
                                    {rating != null && (
                                      <span className="flex items-center gap-0.5 text-warning">
                                        <Star className="h-2.5 w-2.5 fill-warning" /> {rating.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {p.available_now && (
                                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] py-0">متاح</Badge>
                                )}
                              </div>
                              {!p.available_now && (
                                <div className="flex items-center gap-1 text-[10px] text-warning mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  غير متاح حالياً
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {totalShown === 0 && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6 space-y-1"
                  >
                    <p className="text-sm text-muted-foreground">
                      لا يوجد مزوّدون مطابقون للتخصص والمنطقة
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      حاول تعديل البحث أو إزالة الفلاتر السريعة
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Confirm */}
          <Button
            className="w-full gap-2"
            onClick={handleAssign}
            disabled={assigning || !selectedProvider}
          >
            {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            تأكيد الإسناد — {agreedPrice} د.أ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSAssignmentDialog;
