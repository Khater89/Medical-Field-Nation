import { supabase } from "@/integrations/supabase/client";

export const PENDING_PROVIDER_PROFILE_KEY = "pending_provider_profile";

type PendingProviderProfile = {
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  date_of_birth?: string | null;
  role_type?: string | null;
  license_id?: string | null;
  experience_years?: number | null;
  address_text?: string | null;
  radius_km?: number | null;
  specialties?: string[] | null;
  provider_type?: "standard" | "emergency" | null;
  provider_status?: string;
  academic_cert_url?: string | null;
  experience_cert_url?: string | null;
  _academicCertBase64?: string;
  _academicCertName?: string;
  _experienceCertBase64?: string;
  _experienceCertName?: string;
};

const getRoleLabel = (roleType?: string | null) => {
  if (roleType === "doctor") return "طبيب";
  if (roleType === "nurse") return "ممرض/ة";
  if (roleType === "physiotherapist") return "أخصائي علاج طبيعي";
  return roleType || "مزود خدمة";
};

const parsePendingProviderProfile = (value: string | PendingProviderProfile | null | undefined) => {
  if (!value) return null;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as PendingProviderProfile;
  } catch {
    return null;
  }
};

const uploadPendingFile = async (base64: string, fileName: string | undefined, pathPrefix: string, userId: string) => {
  const response = await fetch(base64);
  const blob = await response.blob();
  const ext = fileName?.split(".").pop() || "pdf";
  const path = `${userId}/${pathPrefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("provider-certificates")
    .upload(path, blob, { upsert: true });

  if (error) throw error;
  return path;
};

export const getPendingProviderProfileFromMetadata = (metadata: Record<string, any> | null | undefined) => {
  if (!metadata?.pending_provider_application || !metadata?.role_type) return null;

  return {
    full_name: metadata.full_name ?? null,
    phone: metadata.phone ?? null,
    city: metadata.city ?? null,
    date_of_birth: metadata.date_of_birth ?? null,
    role_type: metadata.role_type ?? null,
    license_id: metadata.license_id ?? null,
    experience_years: metadata.experience_years ?? null,
    address_text: metadata.address_text ?? null,
    radius_km: metadata.radius_km ?? 20,
    specialties: Array.isArray(metadata.specialties) ? metadata.specialties : null,
    provider_type: metadata.provider_type === "emergency" ? "emergency" : "standard",
    provider_status: "pending",
  } satisfies PendingProviderProfile;
};

export const applyPendingProviderProfile = async (userId: string, value: string | PendingProviderProfile) => {
  const pending = parsePendingProviderProfile(value);
  if (!pending?.role_type) return false;

  const {
    _academicCertBase64,
    _academicCertName,
    _experienceCertBase64,
    _experienceCertName,
    academic_cert_url,
    experience_cert_url,
    ...cleanData
  } = pending;

  const academicUrl = _academicCertBase64
    ? await uploadPendingFile(_academicCertBase64, _academicCertName, "academic", userId)
    : academic_cert_url ?? null;

  const experienceUrl = _experienceCertBase64
    ? await uploadPendingFile(_experienceCertBase64, _experienceCertName, "experience", userId)
    : experience_cert_url ?? null;

  const { error } = await supabase
    .from("profiles")
    .update({
      ...cleanData,
      academic_cert_url: academicUrl,
      experience_cert_url: experienceUrl,
      provider_status: "pending",
    } as any)
    .eq("user_id", userId);

  if (error) throw error;

  await supabase.from("staff_notifications" as any).insert({
    title: "📋 طلب انضمام جديد",
    body: `تقدّم ${cleanData.full_name || ""} (${getRoleLabel(cleanData.role_type)}) من ${cleanData.city || ""} بطلب انضمام كمزود خدمة. يرجى مراجعة الطلب واتخاذ الإجراء المناسب.`,
    target_role: "admin",
    provider_id: userId,
  });

  return true;
};