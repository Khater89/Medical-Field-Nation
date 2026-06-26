import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Pause, Play } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-orange-100 text-orange-800",
};

const TYPE_LABELS: Record<string, string> = {
  pharmacy: "صيدلية",
  medical_devices: "أجهزة طبية",
  prosthetics: "أطراف صناعية",
};

export default function MarketplaceVendorsTab() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_vendors")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setVendors(data || []);

    // Count products per vendor
    const { data: prodCounts } = await supabase
      .from("marketplace_products")
      .select("vendor_id");
    const map: Record<string, number> = {};
    (prodCounts || []).forEach((r: any) => { map[r.vendor_id] = (map[r.vendor_id] || 0) + 1; });
    setCounts(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("admin_approve_vendor", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("تم اعتماد المتجر وتفعيله");
    load();
  };
  const reject = async (id: string) => {
    const reason = prompt("سبب الرفض:") || "";
    const { error } = await supabase.rpc("admin_reject_vendor", { _id: id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("تم رفض الطلب");
    load();
  };
  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc("admin_toggle_vendor_active", { _id: id, _active: active });
    if (error) return toast.error(error.message);
    toast.success(active ? "تم التفعيل" : "تم الإيقاف");
    load();
  };
  const suspend = async (id: string) => {
    const { error } = await supabase.from("marketplace_vendors").update({ status: "suspended" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الإيقاف");
    load();
  };

  const filtered = vendors.filter((v) =>
    (filter === "all" || v.status === filter) &&
    (typeFilter === "all" || v.vendor_type === typeFilter)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة بائعي السوق</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">بانتظار الموافقة</SelectItem>
              <SelectItem value="approved">نشط</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
              <SelectItem value="suspended">موقوف</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="pharmacy">صيدليات</SelectItem>
              <SelectItem value="medical_devices">أجهزة طبية</SelectItem>
              <SelectItem value="prosthetics">أطراف صناعية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">لا توجد نتائج</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold">{v.store_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {TYPE_LABELS[v.vendor_type]} · {v.city || "-"} · {v.phone || "-"}
                      </div>
                      {v.description && <div className="text-sm text-muted-foreground mt-1">{v.description}</div>}
                    </div>
                    <Badge className={STATUS_COLORS[v.status]}>{v.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    عدد المنتجات: <strong>{counts[v.id] || 0}</strong> · سُجِّل في {new Date(v.created_at).toLocaleDateString("ar")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {v.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => approve(v.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> موافقة وتفعيل</Button>
                        <Button size="sm" variant="destructive" onClick={() => reject(v.id)}><XCircle className="h-4 w-4 mr-1" /> رفض</Button>
                      </>
                    )}
                    {v.status === "approved" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(v.id, !v.is_active)}>
                          {v.is_active ? <><Pause className="h-4 w-4 mr-1" /> تعطيل</> : <><Play className="h-4 w-4 mr-1" /> تفعيل</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => suspend(v.id)}><Pause className="h-4 w-4 mr-1" /> إيقاف مؤقت</Button>
                      </>
                    )}
                    {v.status === "suspended" && (
                      <Button size="sm" onClick={() => approve(v.id)}><Play className="h-4 w-4 mr-1" /> إعادة تفعيل</Button>
                    )}
                    {v.status === "rejected" && (
                      <Button size="sm" onClick={() => approve(v.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> اعتماد</Button>
                    )}
                    {v.license_number && (
                      <Badge variant="outline" className="text-xs">ترخيص: {v.license_number}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
