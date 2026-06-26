import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Store, Stethoscope, Activity } from "lucide-react";

type VendorType = "pharmacy" | "medical_devices" | "prosthetics";

const TYPES: { value: VendorType; ar: string; en: string; icon: any; desc: string }[] = [
  { value: "pharmacy", ar: "صيدلية", en: "Pharmacy", icon: Store, desc: "بيع أدوية، فيتامينات، عناية شخصية، وعروض" },
  { value: "medical_devices", ar: "مورد أجهزة طبية", en: "Medical Device Supplier", icon: Activity, desc: "أجهزة العيون، الأسنان، الأشعة، التنفس، وغيرها" },
  { value: "prosthetics", ar: "مورد أطراف صناعية", en: "Prosthetics Supplier", icon: Stethoscope, desc: "أطراف علوية وسفلية، تقويم، وخدمات تصنيع" },
];

export default function VendorRegister() {
  const { user, loading, isVendor } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<VendorType>("pharmacy");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/vendor/register");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (isVendor) navigate("/vendor");
  }, [isVendor, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!storeName.trim() || !phone.trim() || !city.trim()) {
      toast.error("يرجى تعبئة الحقول الأساسية");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("marketplace_vendors").insert({
      owner_user_id: user.id,
      vendor_type: type,
      store_name: storeName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim() || null,
      description: description.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تقديم طلب التسجيل، سيتم مراجعته من قبل الإدارة");
    // Refresh roles after trigger grants vendor role
    setTimeout(() => navigate("/vendor"), 800);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>تسجيل متجر / مورّد جديد</CardTitle>
            <CardDescription>اختر نوع النشاط وقم بتعبئة بيانات المتجر، وسيتم مراجعة الطلب من قبل الإدارة قبل ظهور منتجاتك للعملاء.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <Label>نوع الحساب</Label>
                <RadioGroup value={type} onValueChange={(v) => setType(v as VendorType)} className="grid gap-3 mt-2">
                  {TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <label key={t.value} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${type === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                        <RadioGroupItem value={t.value} className="mt-1" />
                        <Icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">{t.ar} <span className="text-xs text-muted-foreground">/ {t.en}</span></div>
                          <div className="text-sm text-muted-foreground">{t.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">اسم المتجر *</Label>
                  <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" required />
                </div>
                <div>
                  <Label htmlFor="city">المدينة *</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: عمان" required />
                </div>
                <div>
                  <Label htmlFor="address">العنوان</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="description">وصف المتجر</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                تقديم طلب التسجيل
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
