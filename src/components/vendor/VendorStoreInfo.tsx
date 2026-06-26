import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Store, Upload } from "lucide-react";

export default function VendorStoreInfo({ vendor, onUpdated }: { vendor: any; onUpdated: (v: any) => void }) {
  const [form, setForm] = useState({
    store_name: vendor.store_name || "",
    phone: vendor.phone || "",
    whatsapp: vendor.whatsapp || "",
    city: vendor.city || "",
    area_text: vendor.area_text || "",
    address_text: vendor.address_text || "",
    description: vendor.description || "",
    working_hours: typeof vendor.working_hours === "string" ? vendor.working_hours : (vendor.working_hours ? JSON.stringify(vendor.working_hours) : ""),
    is_open: vendor.is_open ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${vendor.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("marketplace-products").upload(path, file, { upsert: true });
    if (upErr) { setLogoUploading(false); return toast.error(upErr.message); }
    const { data } = supabase.storage.from("marketplace-products").getPublicUrl(path);
    const { data: updated, error } = await supabase
      .from("marketplace_vendors").update({ logo_url: data.publicUrl }).eq("id", vendor.id).select().maybeSingle();
    setLogoUploading(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث الشعار");
    if (updated) onUpdated(updated);
  };

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("marketplace_vendors")
      .update({
        store_name: form.store_name,
        phone: form.phone,
        whatsapp: form.whatsapp || null,
        city: form.city,
        area_text: form.area_text || null,
        address_text: form.address_text || null,
        description: form.description || null,
        working_hours: form.working_hours || null,
        is_open: form.is_open,
      })
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
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center">
            {vendor.logo_url ? <img src={vendor.logo_url} alt="" className="w-full h-full object-cover" /> : <Store className="h-8 w-8 text-primary" />}
          </div>
          <div>
            <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> شعار المتجر</Label>
            <Input type="file" accept="image/*" disabled={logoUploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>اسم المتجر</Label><Input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} /></div>
          <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          <div><Label>واتساب</Label><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></div>
          <div><Label>المدينة</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
          <div><Label>المنطقة</Label><Input value={form.area_text} onChange={(e) => set("area_text", e.target.value)} placeholder="مثال: الجبيهة" /></div>
          <div><Label>العنوان</Label><Input value={form.address_text} onChange={(e) => set("address_text", e.target.value)} /></div>
        </div>

        <div>
          <Label>ساعات العمل</Label>
          <Input value={form.working_hours} onChange={(e) => set("working_hours", e.target.value)} placeholder="مثال: 9 صباحاً - 11 مساءً" />
        </div>

        <div>
          <Label>وصف المتجر</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={form.is_open} onCheckedChange={(v) => set("is_open", v)} />
          <Label>المتجر مفتوح الآن</Label>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          حفظ التغييرات
        </Button>
      </CardContent>
    </Card>
  );
}
