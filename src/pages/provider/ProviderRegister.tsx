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
import { Loader2, UserPlus, CheckCircle, Clock, XCircle, ArrowRight, Eye, EyeOff, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { lovable } from "@/integrations/lovable/index";
import mfnLogo from "@/assets/mfn-logo.png";

const ROLE_TYPES = ["doctor", "nurse", "physiotherapist"];

const SPECIALTIES_MAP: Record<string, string[]> = {
  doctor: ["general_practitioner", "internal_medicine", "geriatrics", "pediatrics", "emergency"],
  nurse: ["home_care", "wound_care", "iv_therapy", "post_op_care", "elderly_care", "catheterization"],
  physiotherapist: ["sports_rehab", "neuro_rehab", "musculoskeletal", "geriatric_rehab"],
};

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

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
  const academicFileRef = useRef<HTMLInputElement>(null);
  const experienceFileRef = useRef<HTMLInputElement>(null);

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
    if (!uid) return null;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("register.file_too_large"), variant: "destructive" });
      return null;
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

  const passwordErrors = useMemo(() => {
    if (!password) return [];
    const errors: string[] = [];
    if (password.length < 8) errors.push(t("register.password.min_length"));
    if (!/[A-Z]/.test(password)) errors.push(t("register.password.uppercase"));
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push(t("register.password.special"));
    return errors;
  }, [password, t]);

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
        })
        .eq("user_id", user.id);

      setSaving(false);
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        await refreshUserData();
        toast({ title: t("register.submitted_success") });
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
                {renderProfileFields()}
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
  const handleDirectRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !city.trim() || !email.trim() || !password.trim() || !dob || !roleType || !licenseId.trim()) {
      toast({ title: t("register.fill_required"), variant: "destructive" });
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      toast({ title: t("common.error"), description: t("register.password.weak"), variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: t("common.error"), description: t("register.password.mismatch"), variant: "destructive" });
      return;
    }

    setSaving(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: name.trim() },
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
      // Auto-confirm is on — update profile immediately
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
        })
        .eq("user_id", newUser.id);

      await refreshUserData();
      setSaving(false);
      toast({ title: t("register.submitted_success") });
    } else {
      // Email confirmation required — save metadata for later, redirect to verify page
      // Store profile data in localStorage so it can be applied after email verification
      localStorage.setItem("pending_provider_profile", JSON.stringify({
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
      }));
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

    // After login, check if there's pending profile data to apply
    const pendingProfile = localStorage.getItem("pending_provider_profile");
    if (pendingProfile && data.user) {
      const profileData = JSON.parse(pendingProfile);
      await supabase
        .from("profiles")
        .update({ ...profileData, provider_status: "pending" })
        .eq("user_id", data.user.id);
      localStorage.removeItem("pending_provider_profile");
      await refreshUserData();
    }

    toast({ title: t("register.login_success") });
  };

  function renderProfileFields() {
    return (
      <>
        {/* Section: Personal Info */}
        <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">{t("register.section.personal")}</h3>
        <div>
          <label className="text-sm font-medium">{t("register.full_name")} *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("register.full_name.placeholder")} required />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.phone")} *</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" required dir="ltr" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.dob")} *</label>
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required dir="ltr" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.city")} *</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("register.city.placeholder")} required />
        </div>

        {/* Section: Professional Info */}
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
          <Input value={licenseId} onChange={(e) => setLicenseId(e.target.value)} placeholder={t("register.license_id.placeholder")} required dir="ltr" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.experience_years")}</label>
          <Input type="number" min="0" max="60" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="5" dir="ltr" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.address")}</label>
          <Input value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder={t("register.address.placeholder")} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("register.radius_km")}</label>
          <Input type="number" min="1" max="200" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder="20" dir="ltr" />
        </div>

        {/* Dynamic Specialties */}
        {availableSpecialties.length > 0 && (
          <div>
            <label className="text-sm font-medium">{t("register.specialties")}</label>
            <p className="text-xs text-muted-foreground mb-2">{t("register.specialties.hint")}</p>
            <div className="grid grid-cols-2 gap-2">
              {availableSpecialties.map((spec) => (
                <label
                  key={spec}
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                    selectedSpecialties.includes(spec)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border hover:bg-accent/50"
                  }`}
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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <img src={mfnLogo} alt="MFN" className="h-10 mx-auto mb-3" />
          <h1 className="text-xl font-bold">
            {mode === "register" ? t("register.title") : t("register.login_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "register" ? t("register.subtitle") : t("register.login_subtitle")}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {mode === "register" ? (
              <form onSubmit={handleDirectRegister} className="space-y-4">
                {/* Security Section */}
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">{t("register.section.account")}</h3>
                <div>
                  <label className="text-sm font-medium">{t("register.email")} *</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("register.password")} *</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("register.password.placeholder")}
                      required
                      dir="ltr"
                      className={isRTL ? "pl-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${isRTL ? "left-3" : "right-3"}`}
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
                  <label className="text-sm font-medium">{t("register.confirm_password")} *</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("register.confirm_password.placeholder")}
                    required
                    dir="ltr"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{t("register.password.mismatch")}</p>
                  )}
                </div>

                {renderProfileFields()}

                <Button type="submit" className="w-full gap-2" disabled={saving || passwordErrors.length > 0 || (!!confirmPassword && password !== confirmPassword)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {t("register.create_account")}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {t("register.have_account")}{" "}
                  <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                    {t("register.login_link")}
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleProviderLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("register.email")}</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("register.password")}</label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("register.password")} required dir="ltr" />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={saving}>
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
                أو
              </span>
            </div>

            <div className="space-y-2.5">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2.5"
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
                تسجيل الدخول بـ Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2.5"
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
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                )}
                تسجيل الدخول بـ Apple
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
    </div>
  );
};

export default ProviderRegister;
