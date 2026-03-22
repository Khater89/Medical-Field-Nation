import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, MapPin, Clock, Briefcase, X, Stethoscope, Upload, FileText } from "lucide-react";
import mfnLogo from "@/assets/mfn-logo.png";

const TOOL_SUGGESTIONS = ["جهاز ضغط", "سماعة طبية", "جهاز سكر", "أدوات تضميد", "جهاز أكسجين", "حقن وريدي"];
const LANGUAGE_OPTIONS = ["العربية", "الإنجليزية", "التركية", "الفرنسية"];
const SPECIALTY_OPTIONS = [
  "باطني", "أطفال", "جروح", "قسطرة", "حقن وريدي",
  "علاج طبيعي", "رعاية مسنين", "تمريض منزلي",
  "قياس ضغط وسكر", "تحاليل منزلية",
];

const ProviderOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, refreshUserData } = useAuth();

  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [toolInput, setToolInput] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["العربية"]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [availableNow, setAvailableNow] = useState(false);
  const [radiusKm, setRadiusKm] = useState(20);
  const [addressText, setAddressText] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setExperienceYears(profile.experience_years || 0);
      setTools(profile.tools || []);
      setLanguages(profile.languages || ["العربية"]);
      setSpecialties(profile.specialties || []);
      setAvailableNow(profile.available_now || false);
      setRadiusKm(profile.radius_km || 20);
      setAddressText(profile.address_text || "");
      setBio((profile as any).bio || "");
      setLicenseUrl((profile as any).license_file_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.profile_completed && profile?.provider_status === "approved") {
      navigate("/provider");
    }
  }, [profile, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const addTool = (tool: string) => {
    const trimmed = tool.trim();
    if (trimmed && !tools.includes(trimmed)) setTools([...tools, trimmed]);
    setToolInput("");
  };
  const removeTool = (tool: string) => setTools(tools.filter((t) => t !== tool));
  const toggleLanguage = (lang: string) => {
    setLanguages((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);
  };
  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/license-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("provider-licenses").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "خطأ في رفع الملف", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("provider-licenses").getPublicUrl(path);
      setLicenseUrl(path);
      setLicenseFile(file);
      toast({ title: "تم رفع الملف بنجاح ✅" });
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!addressText.trim()) {
      toast({ title: "يرجى إدخال عنوان الموقع", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        experience_years: experienceYears,
        tools: tools.length > 0 ? tools : null,
        languages: languages.length > 0 ? languages : null,
        specialties: specialties.length > 0 ? specialties : null,
        available_now: availableNow,
        radius_km: radiusKm,
        address_text: addressText.trim(),
        bio: bio.trim() || null,
        license_file_url: licenseUrl,
        profile_completed: true,
      } as any)
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      await refreshUserData();
      toast({ title: "تم إكمال الملف الشخصي بنجاح! ✅" });
      if (profile?.provider_status === "approved") {
        navigate("/provider");
      } else {
        navigate("/provider/register");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <img src={mfnLogo} alt="MFN" className="h-10 mx-auto mb-3" />
          <h1 className="text-xl font-bold">إكمال الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground mt-1">أكمل بياناتك المهنية لبدء استقبال الطلبات</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Experience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> الخبرة المهنية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">سنوات الخبرة</label>
                <Input type="number" min={0} max={50} value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))} dir="ltr" />
              </div>

              {/* Professional Bio */}
              <div>
                <label className="text-sm font-medium">نبذة مهنية</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن خبرتك المهنية وتخصصاتك..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">الأدوات والأجهزة</label>
                <div className="flex gap-2 mt-1">
                  <Input value={toolInput} onChange={(e) => setToolInput(e.target.value)}
                    placeholder="أضف أداة..."
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTool(toolInput); } }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTool(toolInput)}>إضافة</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TOOL_SUGGESTIONS.filter((t) => !tools.includes(t)).slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline" className="cursor-pointer hover:bg-accent text-xs" onClick={() => addTool(t)}>+ {t}</Badge>
                  ))}
                </div>
                {tools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tools.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 text-xs">
                        {t} <X className="h-3 w-3 cursor-pointer" onClick={() => removeTool(t)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">اللغات</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <Badge key={lang} variant={languages.includes(lang) ? "default" : "outline"}
                      className="cursor-pointer text-xs" onClick={() => toggleLanguage(lang)}>{lang}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> التخصصات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">اختر التخصصات التي تقدمها</p>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTY_OPTIONS.map((s) => (
                  <Badge key={s} variant={specialties.includes(s) ? "default" : "outline"}
                    className="cursor-pointer text-xs" onClick={() => toggleSpecialty(s)}>{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* License / Certification Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> الترخيص / الشهادة المهنية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">ارفع صورة الترخيص أو الشهادة المهنية (PDF, JPG, PNG)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast({ title: "حجم الملف كبير جداً (الحد الأقصى 5MB)", variant: "destructive" });
                      return;
                    }
                    handleFileUpload(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "جارٍ الرفع..." : licenseUrl ? "تم الرفع ✅ — اضغط لتغيير الملف" : "رفع ملف الترخيص"}
              </Button>
              {licenseFile && (
                <p className="text-xs text-muted-foreground">{licenseFile.name}</p>
              )}
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> التوفر والعمل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">متاح الآن للعمل</label>
                <Switch checked={availableNow} onCheckedChange={setAvailableNow} />
              </div>
              <div>
                <label className="text-sm font-medium">نطاق التغطية (كم)</label>
                <div className="flex items-center gap-3 mt-1">
                  <Input type="number" min={1} max={100} value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))} className="w-24" dir="ltr" />
                  <span className="text-sm text-muted-foreground">كم من موقعك</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> الموقع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium">وصف العنوان *</label>
                <Input value={addressText} onChange={(e) => setAddressText(e.target.value)}
                  placeholder="مثال: عمان - شارع الجامعة - بجانب مستشفى ..." required />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            حفظ وإكمال الملف
          </Button>
        </form>

        <div className="text-center">
          <Link to="/" className="text-sm text-primary hover:underline">العودة للصفحة الرئيسية</Link>
        </div>
      </div>
    </div>
  );
};

export default ProviderOnboarding;
