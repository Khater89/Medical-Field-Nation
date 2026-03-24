import { useState, useEffect } from "react";
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
import {
  UserCheck, MapPin, Loader2, AlertTriangle,
  Briefcase, Navigation, Phone,
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
}

const ROLE_TYPE_LABELS: Record<string, string> = {
  doctor: "طبيب",
  nurse: "ممرض/ة",
  caregiver: "مقدم رعاية",
  physiotherapist: "أخصائي علاج طبيعي",
};

interface Props {
  booking: BookingRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
  serviceName: string;
  servicePrice?: number | null;
}

const CSAssignmentDialog = ({ booking, open, onOpenChange, onAssigned, serviceName, servicePrice }: Props) => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [agreedPrice, setAgreedPrice] = useState(servicePrice ?? booking.subtotal);
  const [internalNote, setInternalNote] = useState("");
  const [nearestProviders, setNearestProviders] = useState<NearestProvider[]>([]);
  const [fallbackProviders, setFallbackProviders] = useState<ProviderRow[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAgreedPrice(servicePrice ?? booking.subtotal);
    setInternalNote("");
    setSelectedProvider(null);
    fetchProviders();
  }, [open, booking]);

  const fetchProviders = async () => {
    setLoadingProviders(true);

    // Find providers who already have an active booking at the same scheduled time
    const scheduledDate = new Date(booking.scheduled_at);
    const windowStart = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2h before
    const windowEnd = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000).toISOString();   // 2h after

    const { data: conflictingBookings } = await supabase
      .from("bookings")
      .select("assigned_provider_id")
      .not("assigned_provider_id", "is", null)
      .in("status", ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"])
      .gte("scheduled_at", windowStart)
      .lte("scheduled_at", windowEnd)
      .neq("id", booking.id);

    const busyProviderIds = new Set(
      (conflictingBookings || [])
        .map((b: any) => b.assigned_provider_id)
        .filter(Boolean)
    );

    // Try geolocation-based matching
    if (booking.client_lat && booking.client_lng) {
      const { data } = await supabase.rpc("find_nearest_providers" as any, {
        _lat: booking.client_lat,
        _lng: booking.client_lng,
        _limit: 10,
      });
      setNearestProviders(
        ((data as NearestProvider[]) || []).filter((p) => !busyProviderIds.has(p.provider_id))
      );
    }

    // Also fetch all approved providers as fallback
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("provider_status", "approved")
      .eq("profile_completed", true);

    setFallbackProviders(
      ((profiles as unknown as ProviderRow[]) || []).filter((p) => !busyProviderIds.has(p.user_id))
    );
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

      // Log to booking_history
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

  // City name mapping for Arabic/English matching
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
    // Check aliases
    for (const aliases of Object.values(CITY_ALIASES)) {
      const normalizedAliases = aliases.map(normalizeCity);
      if (normalizedAliases.some(a => n1.includes(a) || a.includes(n1)) &&
          normalizedAliases.some(a => n2.includes(a) || a.includes(n2))) {
        return true;
      }
    }
    return false;
  };

  // Filter fallback providers not in nearest list
  const nearestIds = new Set(nearestProviders.map((p) => p.provider_id));
  const sameCityProviders = fallbackProviders.filter(
    (p) => !nearestIds.has(p.user_id) && citiesMatch(p.city, booking.city)
  );
  // Also show all other approved providers as a last fallback
  const otherCityProviders = fallbackProviders.filter(
    (p) => !nearestIds.has(p.user_id) && !citiesMatch(p.city, booking.city)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعيين مزوّد وتحديد السعر</DialogTitle>
          <DialogDescription>
            {serviceName} — {booking.customer_name} — {booking.city}
            {booking.booking_number && <span className="ms-1" dir="ltr">({booking.booking_number})</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Price Setting */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <h4 className="text-sm font-bold">تحديد السعر النهائي</h4>
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

          {/* Provider Selection */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold">اختر مزوّد الخدمة</h4>

            {loadingProviders ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Nearest providers (distance-sorted) */}
                {nearestProviders.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">🎯 الأقرب (حسب المسافة):</p>
                    {nearestProviders.map((p) => (
                      <Card
                        key={p.provider_id}
                        className={`cursor-pointer transition-colors ${selectedProvider === p.provider_id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/50"}`}
                        onClick={() => setSelectedProvider(p.provider_id)}
                      >
                        <CardContent className="py-2.5 px-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{p.full_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{ROLE_TYPE_LABELS[p.role_type || ""] || ""}</span>
                              <span>·</span>
                              <span>{p.experience_years || 0} سنة</span>
                              {p.available_now && <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] py-0">متاح</Badge>}
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-bold text-primary">{p.distance_km} كم</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* City-based fallback */}
                {sameCityProviders.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">📍 في نفس المدينة:</p>
                    {sameCityProviders.map((p) => {
                      const warnings: string[] = [];
                      if (!p.available_now) warnings.push("غير متاح حالياً");

                      return (
                        <Card
                          key={p.user_id}
                          className={`cursor-pointer transition-colors ${selectedProvider === p.user_id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/50"}`}
                          onClick={() => setSelectedProvider(p.user_id)}
                        >
                          <CardContent className="py-2.5 px-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{p.full_name || "بدون اسم"}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{ROLE_TYPE_LABELS[p.role_type || ""] || ""}</span>
                                  <span>·</span>
                                  <span>{p.experience_years || 0} سنة</span>
                                  {p.specialties && p.specialties.length > 0 && (
                                    <span>· {p.specialties.slice(0, 2).join("، ")}</span>
                                  )}
                                </div>
                              </div>
                              {p.available_now && (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] py-0">متاح</Badge>
                              )}
                            </div>
                            {warnings.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-warning mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                {warnings.join(" · ")}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Other cities fallback */}
                {otherCityProviders.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">🌍 مزوّدون في مدن أخرى:</p>
                    {otherCityProviders.map((p) => (
                      <Card
                        key={p.user_id}
                        className={`cursor-pointer transition-colors ${selectedProvider === p.user_id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/50"}`}
                        onClick={() => setSelectedProvider(p.user_id)}
                      >
                        <CardContent className="py-2.5 px-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{p.full_name || "بدون اسم"}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{ROLE_TYPE_LABELS[p.role_type || ""] || ""}</span>
                                <span>·</span>
                                <span>{p.city || "—"}</span>
                                <span>·</span>
                                <span>{p.experience_years || 0} سنة</span>
                              </div>
                            </div>
                            {p.available_now && (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] py-0">متاح</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {nearestProviders.length === 0 && sameCityProviders.length === 0 && otherCityProviders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا يوجد مزوّدون معتمدون
                  </p>
                )}
              </>
            )}
          </div>

          {/* Confirm Button */}
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
