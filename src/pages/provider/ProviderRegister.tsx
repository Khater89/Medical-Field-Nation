import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, UserPlus, CheckCircle, Clock, XCircle, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { lovable } from "@/integrations/lovable/index";
import { applyPendingProviderProfile, getPendingProviderProfileFromMetadata, PENDING_PROVIDER_PROFILE_KEY } from "@/lib/providerPendingProfile";
import mfnLogo from "@/assets/mfn-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import WizardStepper from "@/components/provider/WizardStepper";
import SmartDobPicker from "@/components/provider/SmartDobPicker";
import DropZoneUploader from "@/components/provider/DropZoneUploader";
import LiveProfilePreview from "@/components/provider/LiveProfilePreview";

const ROLE_TYPES = ["doctor", "nurse", "physiotherapist"];

const SPECIALTIES_MAP: Record<string, string[]> = {
  doctor: ["general_practitioner", "internal_medicine", "geriatrics", "pediatrics", "emergency"],
  nurse: ["home_care", "wound_care", "iv_therapy", "post_op_care", "elderly_care", "catheterization"],
  physiotherapist: ["sports_rehab", "neuro_rehab", "musculoskeletal", "geriatric_rehab"],
};

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const PHONE_REGEX = /^0?7\d{8}$/;

const ProviderRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const { user, profile, loading: authLoading, isProvider, refreshUserData } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState("");
  const [roleType, setRoleType] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [addressText, setAddressText] = useState("");
  const [radiusKm, setRadiusKm] = useState("20");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [academicCertUrl, setAcademicCertUrl] = useState<string | null>(null);
  const [experienceCertUrl, setExperienceCertUrl] = useState<string | null>(null);
  const [uploadingAcademic, setUploadingAcademic] = useState(false);
  const [uploadingExperience, setUploadingExperience] = useState(false);
  const [pendingAcademicFile, setPendingAcademicFile] = useState<File | null>(null);
  const [pendingExperienceFile, setPendingExperienceFile] = useState<File | null>(null);
  const academicFileRef = useRef<HTMLInputElement>(null);
  const experienceFileRef = useRef<HTMLInputElement>(null);

  // Wizard state (only used in registration mode for non-logged users)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const availableSpecialties = useMemo(() => SPECIALTIES_MAP[roleType] || [], [roleType]);

  // Reset specialties when role type changes
  useEffect(() => {
    setSelectedSpecialties([]);
  }, [roleType]);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
      setDob(profile.date_of_birth || "");
      setRoleType(profile.role_type || "");
      setLicenseId(profile.license_id || "");
      setExperienceYears(profile.experience_years?.toString() || "");
      setAddressText(profile.address_text || "");
      setRadiusKm(profile.radius_km?.toString() || "20");
      setSelectedSpecialties(profile.specialties || []);
      setAcademicCertUrl((profile as any).academic_cert_url || null);
      setExperienceCertUrl((profile as any).experience_cert_url || null);
    }
  }, [profile]);

  // Redirect approved + profile-completed providers to dashboard
  useEffect(() => {
    if (isProvider && profile?.provider_status === "approved" && profile?.profile_completed) {
      navigate("/provider");
    }
  }, [isProvider, profile, navigate]);

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleCertUpload = async (file: File, type: "academic" | "experience", userId?: string) => {
    const uid = userId || user?.id;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("register.file_too_large"), variant: "destructive" });
      return null;
    }
    // If no user yet, store file for deferred upload after signup
    if (!uid) {
      if (type === "academic") {
        setPendingAcademicFile(file);
        setAcademicCertUrl("pending");
      } else {
        setPendingExperienceFile(file);
        setExperienceCertUrl("pending");
      }
      toast({ title: t("register.uploaded") });
      return "pending";
    }
    const setter = type === "academic" ? setUploadingAcademic : setUploadingExperience;
    setter(true);
    const ext = file.name.split(".").pop();
    const path = `${uid}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("provider-certificates").upload(path, file, { upsert: true });
    setter(false);
    if (error) {
      toast({ title: t("register.upload_error"), description: error.message, variant: "destructive" });
      return null;
    }
    if (type === "academic") setAcademicCertUrl(path);
    else setExperienceCertUrl(path);
    toast({ title: t("register.uploaded") });
    return path;
  };

  const uploadPendingCerts = async (uid: string): Promise<{ academic: string | null; experience: string | null }> => {
    let academic: string | null = academicCertUrl !== "pending" ? academicCertUrl : null;
    let experience: string | null = experienceCertUrl !== "pending" ? experienceCertUrl : null;

    if (pendingAcademicFile) {
      const ext = pendingAcademicFile.name.split(".").pop();
      const path = `${uid}/academic-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("provider-certificates").upload(path, pendingAcademicFile, { upsert: true });
      if (!error) academic = path;
    }
    if (pendingExperienceFile) {
      const ext = pendingExperienceFile.name.split(".").pop();
      const path = `${uid}/experience-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("provider-certificates").upload(path, pendingExperienceFile, { upsert: true });
      if (!error) experience = path;
    }
    return { academic, experience };
  };

  const passwordErrors = useMemo(() => {
    if (!password) return [];
    const errors: string[] = [];
    if (password.length < 8) errors.push(t("register.password.min_length"));
    if (!/[A-Z]/.test(password)) errors.push(t("register.password.uppercase"));
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push(t("register.password.special"));
    return errors;
  }, [password, t]);

  // Field-level validity
  const isPhoneValid = phone ? PHONE_REGEX.test(phone.replace(/\s/g, "")) : false;
  const isEmailValid = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : false;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---- Already logged in ----
  if (user) {
    // If provider has submitted details, show status
    if (profile?.phone && profile?.city && profile?.role_type) {
      const st = (profile.provider_status || "pending") as "pending" | "approved" | "suspended";
      const statusConfig = {
        pending: { icon: <Clock className="h-6 w-6 text-warning" />, message: t("register.status.pending_msg") },
        approved: { icon: <CheckCircle className="h-6 w-6 text-success" />, message: profile.profile_completed ? t("register.status.approved_complete") : t("register.status.approved_incomplete") },
        suspended: { icon: <XCircle className="h-6 w-6 text-destructive" />, message: t("register.status.suspended_msg") },
      };
      const config = statusConfig[st] || statusConfig.pending;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <img src={mfnLogo} alt="MFN" className="h-10 mx-auto mb-3" />
              <div className="mx-auto mb-2">{config.icon}</div>
              <CardTitle>{t("register.status.title")}</CardTitle>
              <CardDescription>{config.message}</CardDescription>
            </CardHeader>
            {st === "approved" && !profile.profile_completed && (
              <CardFooter className="justify-center">
                <Link to="/provider/onboarding"><Button>{t("register.complete_profile")}</Button></Link>
              </CardFooter>
            )}
            {st === "approved" && profile.profile_completed && (
              <CardFooter className="justify-center">
                <Link to="/provider"><Button>{t("register.go_dashboard")}</Button></Link>
              </CardFooter>
            )}
            <CardFooter className="justify-center">
              <Link to="/" className="text-sm text-primary hover:underline">{t("register.back_home")}</Link>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Logged in but needs to fill details
    const handleApplicationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !phone.trim() || !city.trim() || !dob || !roleType || !licenseId.trim()) {
        toast({ title: t("register.fill_required"), variant: "destructive" });
        return;
      }
      if (!academicCertUrl) {
        toast({ title: t("register.academic_required"), variant: "destructive" });
        return;
      }

      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          date_of_birth: dob,
          role_type: roleType,
          license_id: licenseId.trim(),
          experience_years: experienceYears ? parseInt(experienceYears) : null,
          address_text: addressText.trim() || null,
          radius_km: radiusKm ? parseInt(radiusKm) : 20,
          specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
          provider_status: "pending",
          academic_cert_url: academicCertUrl,
          experience_cert_url: experienceCertUrl,
        } as any)
        .eq("user_id", user.id);

      setSaving(false);
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        await refreshUserData();
        toast({ title: t("register.submitted_success") });
        navigate("/account-review", { replace: true });
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <img src={mfnLogo} alt="MFN" className="h-10 mx-auto mb-3" />
            <h1 className="text-xl font-bold">{t("register.complete_title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("register.complete_subtitle")}</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleApplicationSubmit} className="space-y-4">
                {renderLegacyProfileFields()}
                <Button type="submit" className="w-full gap-2" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {t("register.submit_application")}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="text-center">
            <Link to="/" className="text-sm text-primary hover:underline">{t("register.back_home")}</Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- Not logged in: Registration / Login ----
  const submitRegistration = async () => {
    setSaving(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          date_of_birth: dob,
          role_type: roleType,
          license_id: licenseId.trim(),
          experience_years: experienceYears ? parseInt(experienceYears) : null,
          address_text: addressText.trim() || null,
          radius_km: radiusKm ? parseInt(radiusKm) : 20,
          specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
          pending_provider_application: true,
        },
      },
    });

    if (signUpError) {
      toast({ title: t("common.error"), description: signUpError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const newUser = signUpData.user;
    if (!newUser) {
      toast({ title: t("common.error"), variant: "destructive" });
      setSaving(false);
      return;
    }

    // Check if we have an active session (auto-confirm enabled)
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      const certs = await uploadPendingCerts(newUser.id);
      await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          date_of_birth: dob,
          role_type: roleType,
          license_id: licenseId.trim(),
          experience_years: experienceYears ? parseInt(experienceYears) : null,
          address_text: addressText.trim() || null,
          radius_km: radiusKm ? parseInt(radiusKm) : 20,
          specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
          provider_status: "pending",
          academic_cert_url: certs.academic,
          experience_cert_url: certs.experience,
        } as any)
        .eq("user_id", newUser.id);

      const roleLabel = roleType === "doctor" ? "طبيب" : roleType === "nurse" ? "ممرض/ة" : roleType === "physiotherapist" ? "أخصائي علاج طبيعي" : roleType;
      await supabase.from("staff_notifications" as any).insert({
        title: "📋 طلب انضمام جديد",
        body: `تقدّم ${name.trim()} (${roleLabel}) من ${city.trim()} بطلب انضمام كمزود خدمة. يرجى مراجعة الطلب واتخاذ الإجراء المناسب.`,
        target_role: "admin",
        provider_id: newUser.id,
      });

      await refreshUserData();
      setSaving(false);
      toast({ title: t("register.submitted_success") });
      navigate("/account-review", { replace: true });
    } else {
      const pendingData: any = {
        full_name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        date_of_birth: dob,
        role_type: roleType,
        license_id: licenseId.trim(),
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        address_text: addressText.trim() || null,
        radius_km: radiusKm ? parseInt(radiusKm) : 20,
        specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
        provider_status: "pending",
      };

      if (pendingAcademicFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(pendingAcademicFile);
        });
        pendingData._academicCertBase64 = base64;
        pendingData._academicCertName = pendingAcademicFile.name;
      }
      if (pendingExperienceFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(pendingExperienceFile);
        });
        pendingData._experienceCertBase64 = base64;
        pendingData._experienceCertName = pendingExperienceFile.name;
      }

      localStorage.setItem(PENDING_PROVIDER_PROFILE_KEY, JSON.stringify(pendingData));
      setSaving(false);
      navigate("/verify-email");
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendingVerification(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setResendingVerification(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("verify_email.resent"), description: t("verify_email.check_inbox") });
    }
  };

  const handleProviderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: t("register.enter_credentials"), variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    setSaving(false);
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("email not confirmed") || msg.includes("invalid login credentials")) {
        toast({
          title: t("register.email_not_confirmed_title"),
          description: t("register.email_not_confirmed"),
          variant: "destructive",
          action: (
            <Button
              variant="outline"
              size="sm"
              disabled={resendingVerification}
              onClick={handleResendVerification}
            >
              {resendingVerification ? <Loader2 className="h-3 w-3 animate-spin" /> : t("verify_email.resend")}
            </Button>
          ),
        });
      } else {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      }
      return;
    }

    const pendingProfile = localStorage.getItem(PENDING_PROVIDER_PROFILE_KEY);
    const metadataPending = getPendingProviderProfileFromMetadata(data.user.user_metadata as Record<string, any>);
    if (data.user && (pendingProfile || metadataPending)) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("role_type")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!existingProfile?.role_type) {
        try {
          await applyPendingProviderProfile(data.user.id, pendingProfile || metadataPending!);
          localStorage.removeItem(PENDING_PROVIDER_PROFILE_KEY);
          await refreshUserData();
        } catch (pendingError: any) {
          toast({ title: t("common.error"), description: pendingError.message, variant: "destructive" });
          return;
        }
      } else if (pendingProfile) {
        localStorage.removeItem(PENDING_PROVIDER_PROFILE_KEY);
      }
    }

    toast({ title: t("register.login_success") });
  };

  // Wizard step navigation
  const validateStep1 = () => {
    if (!name.trim() || !phone.trim() || !dob || !city.trim()) {
      toast({ title: t("register.wizard.step1_required"), variant: "destructive" });
      return false;
    }
    if (!isPhoneValid) {
      toast({ title: t("common.error"), description: "07XXXXXXXX", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!roleType || !licenseId.trim()) {
      toast({ title: t("register.wizard.step2_required"), variant: "destructive" });
      return false;
    }
    if (!academicCertUrl) {
      toast({ title: t("register.academic_required"), variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => (Math.min(3, (s + 1) as any) as 1 | 2 | 3));
  };

  const handleBack = () => setStep((s) => (Math.max(1, (s - 1) as any) as 1 | 2 | 3));

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || !PASSWORD_REGEX.test(password)) {
      toast({ title: t("common.error"), description: t("register.password.weak"), variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t("common.error"), description: t("register.password.mismatch"), variant: "destructive" });
      return;
    }
    await submitRegistration();
  };

  // ---- Legacy fields (used by logged-in completion form) ----
  function renderLegacyProfileFields() {
    return (
      <>
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">{t("register.section.personal")}</h3>
        <div>
          <label className="text-sm font-medium">{t("register.full_name")} *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.phone")} *</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" required dir="ltr" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.dob")} *</label>
          <SmartDobPicker value={dob} onChange={setDob} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.city")} *</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1 mt-4">{t("register.section.professional")}</h3>
        <div>
          <label className="text-sm font-medium">{t("register.profession_type")} *</label>
          <Select value={roleType} onValueChange={setRoleType}>
            <SelectTrigger><SelectValue placeholder={t("register.profession_type.placeholder")} /></SelectTrigger>
            <SelectContent>
              {ROLE_TYPES.map((rt) => (
                <SelectItem key={rt} value={rt}>{t(`role_type.${rt}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.license_id")} *</label>
          <Input value={licenseId} onChange={(e) => setLicenseId(e.target.value)} required dir="ltr" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.experience_years")}</label>
          <Input type="number" min="0" max="60" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} dir="ltr" />
        </div>
        <DropZoneUploader
          label={t("register.academic_cert")}
          hint={t("register.academic_cert.hint")}
          required
          uploaded={!!academicCertUrl}
          uploading={uploadingAcademic}
          fileName={pendingAcademicFile?.name}
          onFileSelected={(f) => handleCertUpload(f, "academic")}
          onClear={() => { setAcademicCertUrl(null); setPendingAcademicFile(null); }}
        />
        <DropZoneUploader
          label={t("register.experience_cert")}
          hint={t("register.experience_cert.hint")}
          uploaded={!!experienceCertUrl}
          uploading={uploadingExperience}
          fileName={pendingExperienceFile?.name}
          onFileSelected={(f) => handleCertUpload(f, "experience")}
          onClear={() => { setExperienceCertUrl(null); setPendingExperienceFile(null); }}
        />
      </>
    );
  }

  // ---- Wizard Step Renderers ----
  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.full_name")} <span className="text-destructive">*</span></label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("register.full_name.placeholder")}
          className={cn("h-11", name.trim().length > 2 && "border-success focus-visible:ring-success/30")}
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.phone")} <span className="text-destructive">*</span></label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XXXXXXXX"
          dir="ltr"
          className={cn(
            "h-11",
            phone && (isPhoneValid ? "border-success focus-visible:ring-success/30" : "border-destructive focus-visible:ring-destructive/30")
          )}
        />
        {phone && !isPhoneValid && (
          <p className="text-xs text-destructive mt-1">{isRTL ? "صيغة رقم غير صحيحة (مثال: 0790000000)" : "Invalid phone format (e.g. 0790000000)"}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.dob")} <span className="text-destructive">*</span></label>
        <SmartDobPicker value={dob} onChange={setDob} />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.city")} <span className="text-destructive">*</span></label>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("register.city.placeholder")}
          className={cn("h-11", city.trim().length > 1 && "border-success focus-visible:ring-success/30")}
        />
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.profession_type")} <span className="text-destructive">*</span></label>
        <Select value={roleType} onValueChange={setRoleType}>
          <SelectTrigger className="h-11"><SelectValue placeholder={t("register.profession_type.placeholder")} /></SelectTrigger>
          <SelectContent>
            {ROLE_TYPES.map((rt) => (
              <SelectItem key={rt} value={rt}>{t(`role_type.${rt}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.license_id")} <span className="text-destructive">*</span></label>
        <Input
          value={licenseId}
          onChange={(e) => setLicenseId(e.target.value)}
          placeholder={t("register.license_id.placeholder")}
          dir="ltr"
          className={cn("h-11", licenseId.trim().length > 2 && "border-success focus-visible:ring-success/30")}
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.experience_years")}</label>
        <Input type="number" min="0" max="60" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="5" dir="ltr" className="h-11" />
      </div>

      {availableSpecialties.length > 0 && (
        <div>
          <label className="text-sm font-medium block mb-1">{t("register.specialties")}</label>
          <p className="text-xs text-muted-foreground mb-2">{t("register.specialties.hint")}</p>
          <div className="grid grid-cols-2 gap-2">
            {availableSpecialties.map((spec) => (
              <label
                key={spec}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-medium transition-all min-h-[44px]",
                  selectedSpecialties.includes(spec)
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background/60 border-border hover:bg-accent/50 hover:border-primary/40"
                )}
              >
                <Checkbox
                  checked={selectedSpecialties.includes(spec)}
                  onCheckedChange={() => toggleSpecialty(spec)}
                />
                {t(`specialty.${spec}`)}
              </label>
            ))}
          </div>
        </div>
      )}

      <DropZoneUploader
        label={t("register.academic_cert")}
        hint={t("register.academic_cert.hint")}
        required
        uploaded={!!academicCertUrl}
        uploading={uploadingAcademic}
        fileName={pendingAcademicFile?.name}
        onFileSelected={(f) => handleCertUpload(f, "academic")}
        onClear={() => { setAcademicCertUrl(null); setPendingAcademicFile(null); }}
      />
      <DropZoneUploader
        label={t("register.experience_cert")}
        hint={t("register.experience_cert.hint")}
        uploaded={!!experienceCertUrl}
        uploading={uploadingExperience}
        fileName={pendingExperienceFile?.name}
        onFileSelected={(f) => handleCertUpload(f, "experience")}
        onClear={() => { setExperienceCertUrl(null); setPendingExperienceFile(null); }}
      />

      <div>
        <label className="text-sm font-medium block mb-1">{t("register.address")}</label>
        <Input value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder={t("register.address.placeholder")} className="h-11" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.radius_km")}</label>
        <Input type="number" min="1" max="200" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder="20" dir="ltr" className="h-11" />
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.email")} <span className="text-destructive">*</span></label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          dir="ltr"
          className={cn(
            "h-11",
            email && (isEmailValid ? "border-success focus-visible:ring-success/30" : "border-destructive focus-visible:ring-destructive/30")
          )}
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.password")} <span className="text-destructive">*</span></label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("register.password.placeholder")}
            dir="ltr"
            className={cn(
              "h-11",
              isRTL ? "pl-10" : "pr-10",
              password && (passwordErrors.length === 0 ? "border-success focus-visible:ring-success/30" : "border-destructive focus-visible:ring-destructive/30")
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", isRTL ? "left-3" : "right-3")}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {passwordErrors.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {passwordErrors.map((err, i) => (
              <li key={i} className="text-xs text-destructive">• {err}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("register.confirm_password")} <span className="text-destructive">*</span></label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("register.confirm_password.placeholder")}
          dir="ltr"
          className={cn(
            "h-11",
            confirmPassword && (password === confirmPassword ? "border-success focus-visible:ring-success/30" : "border-destructive focus-visible:ring-destructive/30")
          )}
        />
        {confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-destructive mt-1">{t("register.password.mismatch")}</p>
        )}
      </div>
    </motion.div>
  );

  const NextIcon = isRTL ? ArrowLeft : ArrowRight;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ---- Main Render: Wizard for non-logged user ----
  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 py-8 overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--primary) / 0.05) 50%, hsl(var(--background)) 100%)",
      }}
    >
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute top-0 -start-32 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -end-32 h-[420px] w-[420px] rounded-full bg-success/15 blur-3xl" />

      <div className="relative w-full max-w-6xl grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left: Form Card */}
        <div className="space-y-5 order-2 lg:order-1">
          <div className="text-center">
            <img src={mfnLogo} alt="MFN" className="h-11 mx-auto mb-2" />
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "register" ? t("register.title") : t("register.login_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "register" ? t("register.wizard.intro") : t("register.login_subtitle")}
            </p>
          </div>

          <Card className="border-white/40 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
            <CardContent className="pt-6 pb-6">
              {mode === "register" ? (
                <>
                  <WizardStepper
                    currentStep={step}
                    steps={[
                      t("register.wizard.step1"),
                      t("register.wizard.step2"),
                      t("register.wizard.step3"),
                    ]}
                  />

                  <form onSubmit={handleWizardSubmit} className="mt-7 space-y-5">
                    <AnimatePresence mode="wait">
                      {step === 1 && renderStep1()}
                      {step === 2 && renderStep2()}
                      {step === 3 && renderStep3()}
                    </AnimatePresence>

                    <div className="flex items-center gap-3 pt-2">
                      {step > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          className="h-11 gap-2"
                        >
                          <BackIcon className="h-4 w-4" />
                          {t("register.wizard.back")}
                        </Button>
                      )}
                      <div className="flex-1" />
                      {step < 3 ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                          className="h-11 gap-2 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 animate-pulse-subtle"
                        >
                          {t("register.wizard.next")}
                          <NextIcon className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={
                            saving ||
                            passwordErrors.length > 0 ||
                            !isEmailValid ||
                            (!!confirmPassword && password !== confirmPassword)
                          }
                          className="h-11 gap-2 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          {t("register.create_account")}
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-center text-muted-foreground pt-1">
                      {t("register.have_account")}{" "}
                      <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                        {t("register.login_link")}
                      </button>
                    </p>
                  </form>
                </>
              ) : (
                <form onSubmit={handleProviderLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">{t("register.email")}</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" className="h-11" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">{t("register.password")}</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("register.password")} required dir="ltr" className="h-11" />
                  </div>
                  <Button type="submit" className="w-full gap-2 h-11" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {t("register.login_btn")}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    {t("register.no_account")}{" "}
                    <button type="button" onClick={() => setMode("register")} className="text-primary hover:underline font-medium">
                      {t("register.create_link")}
                    </button>
                  </p>
                </form>
              )}

              <div className="relative my-5">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  {isRTL ? "أو" : "OR"}
                </span>
              </div>

              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2.5 h-11"
                  disabled={googleLoading || saving}
                  onClick={async () => {
                    setGoogleLoading(true);
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) {
                      toast({ title: "خطأ في تسجيل الدخول بـ Google", description: error.message, variant: "destructive" });
                      setGoogleLoading(false);
                    }
                  }}
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  {isRTL ? "تسجيل الدخول بـ Google" : "Continue with Google"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2.5 h-11"
                  disabled={appleLoading || saving}
                  onClick={async () => {
                    setAppleLoading(true);
                    const { error } = await lovable.auth.signInWithOAuth("apple", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) {
                      toast({ title: "خطأ في تسجيل الدخول بـ Apple", description: error.message, variant: "destructive" });
                      setAppleLoading(false);
                    }
                  }}
                >
                  {appleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                  {isRTL ? "تسجيل الدخول بـ Apple" : "Continue with Apple"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center space-y-2">
            <Link to="/" className="text-sm text-primary hover:underline">{t("register.back_home")}</Link>
            <p className="text-xs text-muted-foreground">
              {t("register.is_customer")}{" "}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                {t("register.customer_login")}
              </Link>
            </p>
          </div>
        </div>

        {/* Right: Live Preview (desktop only, register mode only) */}
        {mode === "register" && (
          <div className="hidden lg:block order-1 lg:order-2 pt-16">
            <LiveProfilePreview
              name={name}
              phone={phone}
              city={city}
              dob={dob}
              roleType={roleType}
              licenseId={licenseId}
              experienceYears={experienceYears}
              email={email}
              specialties={selectedSpecialties}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderRegister;
