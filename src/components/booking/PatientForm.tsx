import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import TimePicker from "@/components/booking/TimePicker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon, User, Phone, MapPin, Clock, Minus, Plus,
  Navigation, Home, Users, CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";


export interface PatientData {
  name: string;
  phone: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  date: Date | undefined;
  time: string;
  hours: number;
  case_details: string;
  payment_method: string;
  provider_gender: string;
}

interface PatientFormProps {
  data: PatientData;
  onChange: (data: PatientData) => void;
  showHours?: boolean;
}

const PatientForm = ({ data, onChange, showHours = true }: PatientFormProps) => {
  const { t, lang } = useLanguage();
  const [locating, setLocating] = useState(false);

  const update = (field: keyof PatientData, value: string | number | Date | undefined | null) => {
    onChange({ ...data, [field]: value });
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ ...data, lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };



  return (
    <div className="space-y-5">
      {/* Patient Name */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" />
          {t("form.patient_name")}
        </Label>
        <Input
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder={t("form.patient_name.placeholder")}
          className="h-11"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Phone className="h-4 w-4 text-primary" />
          {t("form.phone")}
        </Label>
        <Input
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder={t("form.phone.placeholder")}
          type="tel"
          dir="ltr"
          className="h-11"
        />
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          {t("form.city")}
        </Label>
        <Input
          value={data.city}
          onChange={(e) => update("city", e.target.value)}
          placeholder={t("form.city.placeholder")}
          className="h-11"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Home className="h-4 w-4 text-primary" />
          {t("form.address")}
        </Label>
        <Input
          value={data.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder={t("form.address.placeholder")}
          className="h-11"
        />
      </div>

      {/* Get Location */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Navigation className="h-4 w-4 text-primary" />
            {t("form.get_location")}
          </Label>
          {data.lat != null && data.lng != null && (
            <span className="text-xs text-success font-medium">{t("form.location_detected")} ✓</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={getLocation}
          disabled={locating}
        >
          <Navigation className={cn("h-4 w-4", locating && "animate-pulse")} />
          {locating
            ? "..."
            : data.lat != null
            ? `${data.lat.toFixed(4)}, ${data.lng?.toFixed(4)}`
            : t("form.get_location")}
        </Button>
      </div>

      {/* Date Picker */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <CalendarIcon className="h-4 w-4 text-primary" />
          {t("form.date")}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-11 justify-start text-start font-normal",
                !data.date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="me-2 h-4 w-4" />
              {data.date
                ? format(data.date, "PPP", { locale: lang === "ar" ? ar : undefined })
                : t("form.date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data.date}
              onSelect={(d) => update("date", d)}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Picker */}
      <TimePicker value={data.time} onChange={(v) => update("time", v)} />

      {/* Hours Selector - only for hourly services */}
      {showHours && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            {t("form.hours")}
          </Label>
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => update("hours", Math.max(1, data.hours - 1))}
              disabled={data.hours <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[80px]">
              <span className="text-3xl font-bold text-primary">{data.hours}</span>
              <p className="text-xs text-muted-foreground mt-1">
                {data.hours === 1 ? t("form.hours.single") : t("form.hours.plural")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => update("hours", Math.min(12, data.hours + 1))}
              disabled={data.hours >= 12}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

        </div>
      )}

      {/* Provider Gender Preference */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          {t("form.provider_gender")}
        </Label>
        <RadioGroup
          value={data.provider_gender}
          onValueChange={(v) => update("provider_gender", v)}
          className="flex gap-3"
        >
          {[
            { value: "male", label: t("form.provider_gender.male") },
            { value: "female", label: t("form.provider_gender.female") },
            { value: "any", label: t("form.provider_gender.any") },
          ].map((opt) => (
            <Label
              key={opt.value}
              className={cn(
                "flex items-center gap-2 cursor-pointer rounded-xl border px-4 py-3 transition-all flex-1 justify-center",
                data.provider_gender === opt.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border hover:border-primary/30"
              )}
            >
              <RadioGroupItem value={opt.value} className="sr-only" />
              {opt.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Case Description Section */}
      <div className="space-y-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-primary" />
          <h3 className="text-base font-bold text-foreground">
            {lang === "ar" ? "وصف الحالة" : "Case Description"}
            <span className="text-destructive ms-1">*</span>
          </h3>
        </div>

        {/* Specialty / Need Classification */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("form.case_classification")}</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "needs_diagnosis", label: t("form.case_class.needs_diagnosis") },
              { value: "nursing", label: t("form.case_class.nursing") },
              { value: "physiotherapy", label: t("form.case_class.physiotherapy") },
              { value: "elderly_care", label: t("form.case_class.elderly_care") },
              { value: "post_surgery", label: t("form.case_class.post_surgery") },
              { value: "emergency", label: t("form.case_class.emergency") },
              { value: "other", label: t("form.case_class.other") },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const current = data.case_details;
                  const tag = `[${opt.label}]`;
                  if (current.includes(tag)) {
                    update("case_details", current.replace(tag, "").trim());
                  } else {
                    update("case_details", `${tag} ${current}`.trim());
                  }
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  data.case_details.includes(`[${opt.label}]`)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/30 text-muted-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Yes/No Medical Questions */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {lang === "ar" ? "أسئلة سريعة (للمساعدة في فهم الحالة)" : "Quick questions (helps assess the case)"}
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: "chronic", ar: "هل يعاني المريض من أمراض مزمنة؟", en: "Does the patient have chronic illness?" },
              { key: "meds", ar: "هل يتناول المريض أدوية حالياً؟", en: "Currently taking medications?" },
              { key: "allergy", ar: "هل لديه حساسية من أدوية؟", en: "Any drug allergies?" },
              { key: "surgery", ar: "هل أجرى عملية جراحية مؤخراً؟", en: "Recent surgery?" },
              { key: "fever", ar: "هل لديه حرارة مرتفعة؟", en: "High fever?" },
              { key: "pain", ar: "هل يعاني من ألم شديد؟", en: "Severe pain?" },
            ].map((q) => {
              const yesTag = `{${q.key}:yes}`;
              const noTag = `{${q.key}:no}`;
              const hasYes = data.case_details.includes(yesTag);
              const hasNo = data.case_details.includes(noTag);
              const setAns = (val: "yes" | "no") => {
                let txt = data.case_details.replace(yesTag, "").replace(noTag, "");
                txt = `${val === "yes" ? yesTag : noTag} ${txt}`.replace(/\s+/g, " ").trim();
                update("case_details", txt);
              };
              return (
                <div
                  key={q.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2"
                >
                  <span className="text-xs sm:text-sm flex-1">{lang === "ar" ? q.ar : q.en}</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAns("yes")}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-semibold border transition-all",
                        hasYes
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      )}
                    >
                      {lang === "ar" ? "نعم" : "Yes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAns("no")}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-semibold border transition-all",
                        hasNo
                          ? "bg-muted text-foreground border-foreground/30"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      )}
                    >
                      {lang === "ar" ? "لا" : "No"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Free-text notes */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {lang === "ar" ? "ملاحظات إضافية" : "Additional notes"}
          </Label>
          <Textarea
            value={data.case_details}
            onChange={(e) => update("case_details", e.target.value)}
            placeholder={t("form.case_details.placeholder")}
            rows={5}
            required
            className="bg-background"
          />
          {data.case_details.trim() === "" && (
            <p className="text-xs text-destructive">{t("form.case_details.required")}</p>
          )}
        </div>
      </div>

      {/* Payment method is selected on the order tracking page after service completion */}
    </div>
  );
};

export default PatientForm;
