import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function VendorStoreInfo({ vendor, onUpdated }: { vendor: any; onUpdated: (v: any) => void }) {
  const [form, setForm] = useState({
    store_name: vendor.store_name || "",
    phone: vendor.phone || "",
    city: vendor.city || "",
    address: vendor.address || "",
    description: vendor.description || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("marketplace_vendors")
      .update(form)
      .eq("id", vendor.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    if (data) onUpdated(data);
  };

  return (
    <Card>
      <CardHeader><CardTitle>بيانات المتجر</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>اسم المتجر</Label>
            <Input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} />
          </div>
          <div>
            <Label>رقم الهاتف</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>المدينة</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label>العنوان</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>وصف المتجر</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          حفظ التغييرات
        </Button>
      </CardContent>
    </Card>
  );
}
