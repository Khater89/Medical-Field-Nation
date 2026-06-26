import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import BackButton from "@/components/ui/back-button";

type VendorType = "pharmacy" | "medical_devices" | "prosthetics";

const TYPES: Record<VendorType, { ar: string; en: string; icon: any; desc: string; title: string; requiresLicense: boolean; licenseLabel: string }> = {
  pharmacy: {
    ar: "صيدلية", en: "Pharmacy", icon: Store,
    desc: "بيع أدوية، فيتامينات، عناية شخصية، وعروض",
    title: "تسجيل صيدلية جديدة",
    requiresLicense: true,
    licenseLabel: "رقم ترخيص الصيدلية (من نقابة الصيادلة) *",
  },
  medical_devices: {
    ar: "مورد أجهزة طبية", en: "Medical Device Supplier", icon: Activity,
    desc: "أجهزة العيون، الأسنان، الأشعة، التنفس، وغيرها",
    title: "تسجيل متجر أجهزة طبية",
    requiresLicense: false,
    licenseLabel: "رقم الترخيص الصحي (اختياري)",
  },
  prosthetics: {
    ar: "مورد أطراف صناعية", en: "Prosthetics Supplier", icon: Stethoscope,
    desc: "أطراف علوية وسفلية، تقويم، وخدمات تصنيع",
    title: "تسجيل مركز أطراف صناعية",
    requiresLicense: true,
    licenseLabel: "رقم ترخيص المركز *",
  },
};

const VALID: VendorType[] = ["pharmacy", "medical_devices", "prosthetics"];

export default function VendorRegister() {
  const { user, loading, isVendor } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get("type") as VendorType | null;
  const locked = !!urlType && VALID.includes(urlType);
  const [type, setType] = useState<VendorType>(locked ? (urlType as VendorType) : "pharmacy");

  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [commercialRegistration, setCommercialRegistration] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cfg = useMemo(() => TYPES[type], [type]);
  const Icon = cfg.icon;

  useEffect(() => {
    if (!loading && !user) {
      const qs = urlType ? `?type=${urlType}` : "";
      navigate(`/auth?redirect=${encodeURIComponent("/vendor/register" + qs)}`);
    }
  }, [loading, user, navigate, urlType]);

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
    if (cfg.requiresLicense && !licenseNumber.trim()) {
      toast.error("رقم الترخيص مطلوب لهذا النوع من النشاط");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("marketplace_vendors").insert({
      owner_user_id: user.id,
      vendor_type: type,
      store_name: storeName.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      city: city.trim(),
      address_text: address.trim() || null,
      description: description.trim() || null,
      license_number: licenseNumber.trim() || null,
      commercial_registration: commercialRegistration.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تقديم الطلب بنجاح. ستتم مراجعته من قبل الإدارة قبل تفعيل المتجر.");
    setTimeout(() => navigate("/vendor"), 800);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-3">
        <BackButton to="/marketplace" label="رجوع للسوق" />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{locked ? cfg.title : "تسجيل متجر / مورّد جديد"}</CardTitle>
                <CardDescription>
                  {locked
                    ? "املأ بيانات النشاط والاعتمادات المطلوبة. سيتم مراجعة الطلب من قبل الإدارة قبل تفعيل المتجر."
                    : "اختر نوع النشاط ثم أكمل البيانات المطلوبة."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              {!locked && (
                <div>
                  <Label>نوع الحساب</Label>
                  <RadioGroup value={type} onValueChange={(v) => setType(v as VendorType)} className="grid gap-3 mt-2">
                    {VALID.map((v) => {
                      const t = TYPES[v];
                      const I = t.icon;
                      return (
                        <label key={v} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${type === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                          <RadioGroupItem value={v} className="mt-1" />
                          <I className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold">{t.ar} <span className="text-xs text-muted-foreground">/ {t.en}</span></div>
                            <div className="text-sm text-muted-foreground">{t.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">
                    {type === "pharmacy" ? "اسم الصيدلية *" : type === "prosthetics" ? "اسم المركز *" : "اسم المتجر *"}
                  </Label>
                  <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف *</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" required />
                </div>
                <div>
                  <Label htmlFor="whatsapp">واتساب (اختياري)</Label>
                  <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="07XXXXXXXX" />
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="city">المدينة *</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: عمان" required />
                </div>
                <div>
                  <Label htmlFor="address">العنوان التفصيلي</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-4">
                <div className="text-sm font-semibold text-primary">الاعتمادات والتراخيص</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lic">{cfg.licenseLabel}</Label>
                    <Input
                      id="lic"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required={cfg.requiresLicense}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cr">السجل التجاري (اختياري)</Label>
                    <Input id="cr" value={commercialRegistration} onChange={(e) => setCommercialRegistration(e.target.value)} />
                  </div>
                </div>
                {type === "pharmacy" && (
                  <p className="text-xs text-muted-foreground">
                    سيتم التحقق من ترخيص الصيدلية والصيدلي المسؤول من قبل الإدارة. لا يمكن بيع الأدوية الحساسة قبل اعتماد منتجات الصيدلية فردياً.
                  </p>
                )}
                {type === "prosthetics" && (
                  <p className="text-xs text-muted-foreground">
                    يجب أن يكون المركز مرخّصاً من الجهات الصحية المختصة. يمكن إضافة خدمات التصنيع والقياس بعد الاعتماد.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">وصف المتجر</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                تقديم طلب التسجيل للمراجعة
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                جميع طلبات التسجيل تخضع لمراجعة الإدارة. لن يظهر متجرك أو منتجاتك للعملاء قبل الاعتماد.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
