import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  User, CalendarCheck, Pencil, Save, X, Loader2,
  MapPin, Phone, CalendarDays, Clock, Ban, Eye,
} from "lucide-react";
import CustomerOrderTracker from "@/components/booking/CustomerOrderTracker";

interface BookingRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  scheduled_at: string;
  status: string;
  subtotal: number;
  notes: string | null;
  service_id: string;
  created_at: string;
  assigned_provider_id: string | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  NEW: { label: "جديد", variant: "secondary" },
  ASSIGNED: { label: "معيّن", variant: "default" },
  CONFIRMED: { label: "مؤكد", variant: "default" },
  ACCEPTED: { label: "مقبول", variant: "default" },
  COMPLETED: { label: "مكتمل", variant: "outline" },
  CANCELLED: { label: "ملغي", variant: "destructive" },
};

const ProfilePage = () => {
  const { user, profile, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const defaultTab = searchParams.get("tab") === "bookings" ? "bookings" : "profile";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Cancel state
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Tracking state
  const [trackingBookingId, setTrackingBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
    }
  }, [profile]);

  const fetchBookings = async () => {
    if (!user) return;

    const [bookingsRes, servicesRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("services").select("id, name"),
    ]);

    setBookings((bookingsRes.data as unknown as BookingRow[]) || []);

    const svcMap: Record<string, string> = {};
    (servicesRes.data || []).forEach((s: any) => {
      svcMap[s.id] = s.name;
    });
    setServiceNames(svcMap);
    setLoadingBookings(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleSave = async () => {
    if (!user || !name.trim()) {
      toast({ title: "الاسم مطلوب", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      await refreshUserData();
      setEditing(false);
      toast({ title: "تم تحديث البيانات بنجاح ✅" });
    }
  };

  const cancelEdit = () => {
    setName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setCity(profile?.city || "");
    setEditing(false);
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingId || !user) return;
    setCancellingId(cancelBookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "CANCELLED" })
        .eq("id", cancelBookingId)
        .eq("customer_user_id", user.id);
      if (error) throw error;

      toast({ title: "تم إلغاء الحجز بنجاح" });
      setCancelBookingId(null);
      fetchBookings();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setCancellingId(null);
    }
  };

  // Client can cancel only NEW bookings (not yet assigned)
  const canClientCancel = (b: BookingRow) => b.status === "NEW" && !b.assigned_provider_id;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-2xl py-6 px-4 space-y-6">
        <h2 className="text-xl font-bold text-foreground">حسابي</h2>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" />
              الملف الشخصي
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5">
              <CalendarCheck className="h-4 w-4" />
              حجوزاتي
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base">البيانات الشخصية</CardTitle>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      حفظ
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit} className="gap-1.5">
                      <X className="h-3.5 w-3.5" />
                      إلغاء
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">البريد الإلكتروني</label>
                  <p className="text-sm text-foreground bg-muted rounded-md px-3 py-2" dir="ltr">
                    {user?.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">الاسم الكامل</label>
                  {editing ? (
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك" />
                  ) : (
                    <p className="text-sm text-foreground bg-muted rounded-md px-3 py-2">
                      {profile?.full_name || "—"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">رقم الهاتف</label>
                  {editing ? (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" dir="ltr" />
                  ) : (
                    <p className="text-sm text-foreground bg-muted rounded-md px-3 py-2" dir="ltr">
                      {profile?.phone || "—"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">المدينة</label>
                  {editing ? (
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: عمان" />
                  ) : (
                    <p className="text-sm text-foreground bg-muted rounded-md px-3 py-2">
                      {profile?.city || "—"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">تاريخ التسجيل</label>
                  <p className="text-sm text-foreground bg-muted rounded-md px-3 py-2">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("ar-JO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            {loadingBookings ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : bookings.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  لا توجد حجوزات سابقة
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {bookings.map((b) => {
                  const st = STATUS_LABELS[b.status] || { label: b.status, variant: "outline" as const };
                  return (
                    <Card key={b.id}>
                      <CardContent className="py-4 px-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{serviceNames[b.service_id] || "خدمة"}</p>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(b.scheduled_at).toLocaleDateString("ar-JO", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(b.scheduled_at).toLocaleTimeString("ar-JO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {b.city}
                          </span>
                          <span className="font-medium text-primary">{b.subtotal} د.أ</span>
                        </div>
                        {b.notes && (
                          <p className="text-xs bg-muted rounded p-2">{b.notes}</p>
                        )}
                        {canClientCancel(b) && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1 h-7 text-xs"
                              disabled={cancellingId === b.id}
                              onClick={() => setCancelBookingId(b.id)}
                            >
                              {cancellingId === b.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Ban className="h-3 w-3" />
                              )}
                              إلغاء الحجز
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7 text-xs"
                          onClick={() => setTrackingBookingId(b.id)}
                        >
                          <Eye className="h-3 w-3" />
                          تتبع الطلب
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Order Tracking Dialog */}
      <Dialog open={!!trackingBookingId} onOpenChange={(open) => { if (!open) setTrackingBookingId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تتبع الطلب</DialogTitle>
          </DialogHeader>
          {trackingBookingId && <CustomerOrderTracker bookingId={trackingBookingId} />}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelBookingId} onOpenChange={(open) => { if (!open) setCancelBookingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الحجز</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePage;
