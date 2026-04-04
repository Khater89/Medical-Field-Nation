import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServices, DbService } from "@/hooks/useServices";

import BookingHeader from "@/components/booking/BookingHeader";
import AppFooter from "@/components/AppFooter";
import StepIndicator from "@/components/booking/StepIndicator";
import CategoryTabs from "@/components/booking/CategoryTabs";
import ServiceCard from "@/components/booking/ServiceCard";
import PatientForm, { PatientData } from "@/components/booking/PatientForm";
import BookingConfirmation from "@/components/booking/BookingConfirmation";
import BookingSummary from "@/components/booking/BookingSummary";
import SuccessView from "@/components/booking/SuccessView";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_PATIENT: PatientData = {
  name: "",
  phone: "",
  city: "",
  address: "",
  lat: null,
  lng: null,
  date: undefined,
  time: "",
  hours: 1,
  case_details: "",
  payment_method: "CASH",
  provider_gender: "any",
};

const BookingPage = () => {
  const { t, lang, isRTL } = useLanguage();
  const { toast } = useToast();

  const { services, categories, loading: servicesLoading } = useServices(true);

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<string>("");
  const [selectedService, setSelectedService] = useState<DbService | null>(null);
  const [patient, setPatient] = useState<PatientData>(INITIAL_PATIENT);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingNumber, setBookingNumber] = useState<string>("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const categoryServices = services.filter((s) => s.category === category);

  const canGoNext = () => {
    if (step === 1) return !!selectedService;
    if (step === 2) {
      return (
        patient.name.trim() &&
        patient.phone.trim() &&
        patient.city.trim() &&
        patient.address.trim() &&
        patient.date &&
        patient.time &&
        patient.hours >= 1 &&
        patient.case_details.trim()
      );
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedService || isSubmitting) return;
    setIsSubmitting(true);

    const scheduledAt = new Date(patient.date!);
    // Support both "HH:MM" (new precise) and legacy slot names
    if (patient.time.includes(":")) {
      const [h, m] = patient.time.split(":").map(Number);
      scheduledAt.setHours(h, m, 0, 0);
    } else {
      const timeMap: Record<string, number> = { morning: 9, afternoon: 13, evening: 20 };
      scheduledAt.setHours(timeMap[patient.time] || 9, 0, 0, 0);
    }

    // Use edge function — supports both guest & logged-in users
    const { data, error } = await supabase.functions.invoke("create-guest-booking", {
      body: {
        customer_name: patient.name.trim(),
        customer_phone: patient.phone.trim(),
        city: patient.city.trim(),
        client_address_text: patient.address.trim(),
        client_lat: patient.lat,
        client_lng: patient.lng,
        service_id: selectedService.id,
        scheduled_at: scheduledAt.toISOString(),
        hours: patient.hours,
        time_slot: patient.time,
        notes: patient.case_details.trim(),
        payment_method: patient.payment_method,
        provider_gender: patient.provider_gender,
      },
    });

    // Google Sheets sync is now handled via the outbox pattern in the edge function

    setIsSubmitting(false);

    if (error || !data?.success) {
      const errMsg = data?.error || error?.message || t("status.error.desc");
      toast({ title: t("status.error"), description: errMsg, variant: "destructive" });
    } else {
      setBookingNumber(data.booking_number || "");
      toast({ title: t("status.success"), description: t("status.success.desc") });
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setStep(1);
    setCategory(categories[0] || "");
    setSelectedService(null);
    setPatient(INITIAL_PATIENT);
    setSubmitted(false);
    setBookingNumber("");
  };

  const NextIcon = isRTL ? ArrowLeft : ArrowRight;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <BookingHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="container max-w-xl py-10">
            <SuccessView onReset={handleReset} bookingNumber={bookingNumber} customerPhone={patient.phone} />
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BookingHeader />

      <main className="flex-1 container max-w-5xl py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">{t("booking.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("booking.subtitle")}</p>
        </div>

        <StepIndicator currentStep={step} totalSteps={3} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {step === 1 && (
                  <div className="space-y-4">
                    {servicesLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        <CategoryTabs
                          selected={category}
                          categories={categories}
                          onChange={(c) => { setCategory(c); setSelectedService(null); }}
                        />
                        <div className="grid gap-3">
                          {categoryServices.map((service) => (
                            <ServiceCard
                              key={service.id}
                              service={service}
                              isSelected={selectedService?.id === service.id}
                              onSelect={setSelectedService}
                            />
                          ))}
                        </div>
                        {categoryServices.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground py-6">
                            لا توجد خدمات متاحة في هذا التصنيف
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {step === 2 && <PatientForm data={patient} onChange={setPatient} showHours={selectedService?.pricing_type === "hourly"} />}

                {step === 3 && selectedService && (
                  <div className="space-y-4">
                    <BookingConfirmation service={selectedService} patient={patient} />
                    {/* Disclaimer Checkbox */}
                    <div className="rounded-xl border-2 border-warning/30 bg-warning/5 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="disclaimer"
                          checked={disclaimerAccepted}
                          onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                          className="mt-1"
                        />
                        <label htmlFor="disclaimer" className="text-sm leading-relaxed cursor-pointer">
                          {isRTL
                            ? "نحن هنا لنسهل وصولك لأفضل الرعاية! يرجى العلم بأن منصتنا هي جسر يربطك بنخبة من مزودي الخدمة المرخصين؛ حيث تقع المسؤولية المهنية والتشخيصية على عاتق المزود المباشر لضمان أعلى معايير الدقة والخدمة المتميزة لك."
                            : "We're here to connect you with the best care! Please note that our platform serves as a bridge linking you to elite licensed service providers. Professional and diagnostic responsibility rests with the direct provider to ensure the highest standards of accuracy and outstanding service for you."}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="gap-2 flex-1 rounded-xl h-11 font-semibold"
                >
                  <BackIcon className="h-4 w-4" />
                  {t("action.back")}
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canGoNext()}
                  className="gap-2 flex-1 rounded-xl h-11 font-semibold"
                >
                  {t("action.next")}
                  <NextIcon className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !disclaimerAccepted}
                  className="gap-2 flex-1 rounded-xl h-11 font-semibold"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? t("status.submitting") : t("action.submit")}
                </Button>
              )}
            </div>
          </div>

          {selectedService && (
            <div className="hidden lg:block lg:sticky lg:top-24">
              <BookingSummary service={selectedService} patient={patient} step={step} />
            </div>
          )}
        </div>

        {selectedService && (
          <div className="lg:hidden">
            <BookingSummary service={selectedService} patient={patient} step={step} />
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
};

export default BookingPage;
