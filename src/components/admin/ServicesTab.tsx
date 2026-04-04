import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import type { DbService } from "@/hooks/useServices";

const CATEGORIES = [
  { value: "medical", label: "خدمات طبية" },
  { value: "nursing", label: "تمريض منزلي" },
  { value: "packages", label: "باقات سنوية" },
];

const ServicesTab = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DbService | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");

  // Form state
  const [form, setForm] = useState({
    name: "",
    category: "nursing",
    city: "",
    base_price: "",
    description: "",
    duration_minutes: "",
    pricing_type: "fixed" as "fixed" | "hourly",
  });

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("category")
      .order("created_at", { ascending: false });
    setServices((data as unknown as DbService[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchCategory = filterCategory === "ALL" || s.category === filterCategory;
      const matchSearch = !search || s.name.includes(search) || (s.description || "").includes(search);
      return matchCategory && matchSearch;
    });
  }, [services, filterCategory, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", category: "nursing", city: "", base_price: "", description: "", duration_minutes: "", pricing_type: "fixed" });
    setDialogOpen(true);
  };

  const openEdit = (s: DbService) => {
    setEditing(s);
    setForm({
      name: s.name,
      category: s.category,
      city: s.city || "",
      base_price: String(s.base_price),
      description: s.description || "",
      duration_minutes: s.duration_minutes ? String(s.duration_minutes) : "",
      pricing_type: (s as any).pricing_type || "fixed",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.base_price) {
      toast({ title: "أكمل البيانات المطلوبة", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      city: form.city.trim() || null,
      base_price: parseFloat(form.base_price),
      description: form.description.trim() || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      pricing_type: form.pricing_type,
    } as any;

    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم تحديث الخدمة" });
      }
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) {
        toast({ title: "خطأ في الإضافة", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تمت إضافة الخدمة" });
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حذف الخدمة" });
      fetchServices();
    }
  };

  const toggleActive = async (s: DbService) => {
    await supabase.from("services").update({ active: !s.active }).eq("id", s.id);
    fetchServices();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">إدارة الخدمات ({services.length})</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              إضافة خدمة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل خدمة" : "إضافة خدمة جديدة"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">اسم الخدمة *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: طب عام وتشخيص" />
              </div>
              <div>
                <label className="text-sm font-medium">التصنيف *</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">الوصف (اختياري)</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف مختصر للخدمة"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">المدينة (اختياري)</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="مثال: عمان" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">السعر الأساسي (د.أ) *</label>
                  <Input type="number" min="0" step="0.5" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} placeholder="50" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium">المدة (دقيقة)</label>
                  <Input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="60" dir="ltr" />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? "حفظ التعديلات" : "إضافة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الوصف..."
            className="ps-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل التصنيفات</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد خدمات مطابقة. أضف خدمة جديدة للبدء.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => {
            const catLabel = CATEGORIES.find((c) => c.value === s.category)?.label || s.category;
            return (
              <Card key={s.id} className={!s.active ? "opacity-60" : ""}>
                <CardContent className="flex items-center justify-between py-4 px-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{catLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.city || "جميع المدن"} · {s.base_price} د.أ
                      {s.duration_minutes ? ` · ${s.duration_minutes} دقيقة` : ""}
                    </p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServicesTab;
