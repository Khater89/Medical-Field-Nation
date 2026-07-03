import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import MarketplaceSubNav from "@/components/marketplace/MarketplaceSubNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, MapPin, MessageCircle, Search } from "lucide-react";
import BackButton from "@/components/ui/back-button";

const TYPE_LABELS: Record<string, string> = {
  pharmacy: "الصيدليات",
  medical_devices: "الأجهزة الطبية",
  prosthetics: "الأطراف الصناعية",
  other: "متاجر أخرى",
};

export default function VendorsListPage() {
  const [params] = useSearchParams();
  const type = params.get("type") || "pharmacy";
  const [vendors, setVendors] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("marketplace_vendors_public" as any)
        .select("id,store_name,logo_url,city,area_text,is_open,rating,description,vendor_type")
        .eq("vendor_type", type as any)
        .order("created_at", { ascending: false });
      setVendors((data as any[]) || []);
      const ids = ((data as any[]) || []).map((v) => v.id);
      if (ids.length) {
        const { data: prods } = await supabase
          .from("marketplace_products")
          .select("vendor_id")
          .in("vendor_id", ids)
          .eq("is_active", true);
        const m: Record<string, number> = {};
        (prods || []).forEach((p: any) => (m[p.vendor_id] = (m[p.vendor_id] || 0) + 1));
        setCounts(m);
      }
      setLoading(false);
    })();
  }, [type]);

  const filtered = vendors.filter((v) => !q || v.store_name?.toLowerCase().includes(q.toLowerCase()) || v.city?.includes(q));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader /><MarketplaceSubNav />
      <main className="container max-w-6xl py-6 flex-1 space-y-4">
        <BackButton to="/marketplace" label="رجوع للسوق" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{TYPE_LABELS[type] || "المتاجر"}</h1>
          <Button asChild variant="outline"><Link to={`/vendor/register?type=${type}`}>سجّل متجرك</Link></Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المتجر أو المدينة" className="pr-9" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">لا توجد متاجر معتمدة في هذا القسم بعد.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((v) => (
              <Card key={v.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {v.logo_url ? <img src={v.logo_url} alt="" className="w-full h-full object-cover" /> : <Store className="h-6 w-6 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold truncate">{v.store_name}</div>
                      <Badge variant="outline" className={v.is_open ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}>
                        {v.is_open ? "مفتوحة" : "مغلقة"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {v.city || "-"}{v.area_text ? ` - ${v.area_text}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">منتجات: {counts[v.id] || 0}</div>
                  </div>
                </div>
                {v.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{v.description}</p>}
                <div className="flex gap-2 mt-3">
                  <Button asChild size="sm" className="flex-1"><Link to={`/marketplace/vendor/${v.id}`}>عرض المتجر</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to={`/marketplace/vendor/${v.id}`}><MessageCircle className="h-3 w-3" /></Link></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
