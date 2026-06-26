import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ImagePlus, X } from "lucide-react";

interface Category { id: string; name_ar: string; slug: string; }
interface Product {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name_ar: string;
  description_ar: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  unlimited_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  cover_image_url: string | null;
  brand: string | null;
}

const emptyForm = {
  name_ar: "",
  description_ar: "",
  price: "",
  compare_at_price: "",
  stock_quantity: "0",
  unlimited_stock: false,
  category_id: "",
  brand: "",
  is_active: true,
  is_featured: false,
};

export default function VendorProductsManager({ vendor }: { vendor: any }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extraImages, setExtraImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("marketplace_products").select("*").eq("vendor_id", vendor.id).order("created_at", { ascending: false }),
      supabase.from("marketplace_categories").select("id, name_ar, slug").eq("vendor_type", vendor.vendor_type).eq("is_active", true).order("sort_order"),
    ]);
    setProducts((prods as Product[]) || []);
    setCategories((cats as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendor.id]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setExtraImages([]);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name_ar: p.name_ar,
      description_ar: p.description_ar || "",
      price: String(p.price),
      compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "",
      stock_quantity: String(p.stock_quantity),
      unlimited_stock: p.unlimited_stock,
      category_id: p.category_id || "",
      brand: p.brand || "",
      is_active: p.is_active,
      is_featured: p.is_featured,
    });
    setImageFile(null);
    setExtraImages([]);
    setOpen(true);
  };

  const uploadImage = async (file: File, productId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${vendor.id}/${productId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("marketplace-products").upload(path, file, { upsert: false });
    if (error) { toast.error("فشل رفع الصورة: " + error.message); return null; }
    const { data } = supabase.storage.from("marketplace-products").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!form.name_ar.trim() || !form.price) return toast.error("الاسم والسعر مطلوبان");
    const price = parseFloat(form.price);
    if (Number.isNaN(price) || price < 0) return toast.error("سعر غير صالح");
    setSaving(true);
    try {
      const payload: any = {
        vendor_id: vendor.id,
        name_ar: form.name_ar.trim(),
        description_ar: form.description_ar?.trim() || null,
        price,
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        stock_quantity: parseInt(form.stock_quantity || "0", 10),
        unlimited_stock: !!form.unlimited_stock,
        category_id: form.category_id || null,
        brand: form.brand?.trim() || null,
        is_active: !!form.is_active,
        is_featured: !!form.is_featured,
      };

      let productId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("marketplace_products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("marketplace_products").insert(payload).select("id").maybeSingle();
        if (error) throw error;
        productId = data?.id;
      }
      if (!productId) throw new Error("Missing product id");

      // Cover image
      if (imageFile) {
        const url = await uploadImage(imageFile, productId);
        if (url) await supabase.from("marketplace_products").update({ cover_image_url: url }).eq("id", productId);
      }
      // Extra images
      for (const f of extraImages) {
        const url = await uploadImage(f, productId);
        if (url) await supabase.from("marketplace_product_images").insert({ product_id: productId, url });
      }

      toast.success(editing ? "تم تحديث المنتج" : "تمت إضافة المنتج");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`حذف المنتج "${p.name_ar}"؟`)) return;
    const { error } = await supabase.from("marketplace_products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("marketplace_products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>منتجاتي ({products.length})</CardTitle>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> منتج جديد</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">لا توجد منتجات. ابدأ بإضافة منتج جديد.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt={p.name_ar} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-muted flex items-center justify-center text-muted-foreground text-xs">لا توجد صورة</div>
                )}
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm line-clamp-2">{p.name_ar}</div>
                    {p.is_active ? <Badge variant="default" className="text-xs">نشط</Badge> : <Badge variant="secondary" className="text-xs">متوقف</Badge>}
                  </div>
                  <div className="text-primary font-bold">{Number(p.price).toFixed(2)} {(vendor.currency || "JOD")}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.unlimited_stock ? "متوفر دائماً" : `الكمية: ${p.stock_quantity}`}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}><Pencil className="h-3 w-3 mr-1" /> تعديل</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>{p.is_active ? "إيقاف" : "تفعيل"}</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(p)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل المنتج" : "منتج جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>اسم المنتج *</Label>
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
              </div>
              <div>
                <Label>الفئة</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الشركة المصنّعة</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>السعر *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>السعر قبل الخصم (اختياري)</Label>
                <Input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} />
              </div>
              <div>
                <Label>الكمية المتوفرة</Label>
                <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} disabled={form.unlimited_stock} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.unlimited_stock} onCheckedChange={(v) => setForm({ ...form, unlimited_stock: v })} />
                <Label className="mb-2">كمية غير محدودة</Label>
              </div>
              <div className="sm:col-span-2">
                <Label>الوصف</Label>
                <Textarea rows={3} value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} />
              </div>
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /> الصورة الرئيسية</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /> صور إضافية</Label>
                  <Input type="file" accept="image/*" multiple onChange={(e) => setExtraImages(Array.from(e.target.files || []))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>متاح للبيع</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <Label>عرض مميز</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
