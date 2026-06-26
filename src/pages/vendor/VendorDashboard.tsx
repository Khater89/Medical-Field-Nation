import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag, Store, LogOut, Loader2 } from "lucide-react";
import BackButton from "@/components/ui/back-button";
import { toast } from "sonner";
import VendorProductsManager from "@/components/vendor/VendorProductsManager";
import VendorOrdersList from "@/components/vendor/VendorOrdersList";
import VendorStoreInfo from "@/components/vendor/VendorStoreInfo";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار الموافقة", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "نشط", color: "bg-green-100 text-green-800" },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800" },
  suspended: { label: "موقوف", color: "bg-orange-100 text-orange-800" },
};

export default function VendorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("marketplace_vendors")
        .select("*")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setVendor(data);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader><CardTitle>لا يوجد متجر مسجّل</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">لم نعثر على متجر مرتبط بحسابك. يرجى تسجيل متجر جديد.</p>
            <Button onClick={() => navigate("/vendor/register")} className="w-full">تسجيل متجر جديد</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = STATUS_LABELS[vendor.status] || STATUS_LABELS.pending;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="container py-3 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton to="/" label="الرئيسية" />
            <Store className="h-6 w-6 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="font-bold truncate">{vendor.store_name}</div>
              <div className="text-xs text-muted-foreground">
                {vendor.vendor_type === "pharmacy" ? "صيدلية" : vendor.vendor_type === "medical_devices" ? "مورد أجهزة طبية" : "مورد أطراف صناعية"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>{status.label}</Badge>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4">
        {vendor.status === "pending" && (
          <Card className="mb-4 border-yellow-300 bg-yellow-50">
            <CardContent className="py-3 text-sm text-yellow-900">
              حسابك بانتظار الموافقة من الإدارة. يمكنك إضافة منتجاتك الآن لكنها لن تظهر للعملاء قبل اعتماد المتجر.
            </CardContent>
          </Card>
        )}
        {vendor.status === "rejected" && (
          <Card className="mb-4 border-red-300 bg-red-50">
            <CardContent className="py-3 text-sm text-red-900">تم رفض الحساب. يرجى التواصل مع الإدارة.</CardContent>
          </Card>
        )}
        {vendor.status === "suspended" && (
          <Card className="mb-4 border-orange-300 bg-orange-50">
            <CardContent className="py-3 text-sm text-orange-900">الحساب موقوف مؤقتاً. يرجى التواصل مع الإدارة.</CardContent>
          </Card>
        )}

        <Tabs defaultValue="products">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-1" /> المنتجات</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-1" /> الطلبات</TabsTrigger>
            <TabsTrigger value="store"><Store className="h-4 w-4 mr-1" /> بيانات المتجر</TabsTrigger>
          </TabsList>
          <TabsContent value="products" className="mt-4">
            <VendorProductsManager vendor={vendor} />
          </TabsContent>
          <TabsContent value="orders" className="mt-4">
            <VendorOrdersList vendorId={vendor.id} />
          </TabsContent>
          <TabsContent value="store" className="mt-4">
            <VendorStoreInfo vendor={vendor} onUpdated={(v) => setVendor(v)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
