// ============= Pricing Utilities =============
// Services are now loaded dynamically from the database.
// This file only contains pricing calculation utilities.

export const COMMISSION_RATE = 0.1; // 10%

// Hourly pricing config
export const HOURLY_PRICING = {
  day: { firstHour: 50, additionalHour: 20, label: "6:00 AM – 9:00 PM" },
  night: { firstHour: 70, additionalHour: 20, label: "9:00 PM – 6:00 AM" },
} as const;

export type PeriodType = "day" | "night";

export function calculateHourlyPricing(period: PeriodType, hours: number) {
  const config = HOURLY_PRICING[period];
  if (hours <= 0) return { basePrice: 0, commission: 0, total: 0 };

  const basePrice = config.firstHour + Math.max(0, hours - 1) * config.additionalHour;
  const commission = Math.round(basePrice * COMMISSION_RATE);
  const total = basePrice + commission;
  return { basePrice, commission, total };
}

// Category config for display
export const CATEGORY_CONFIG: Record<string, { labelAr: string; labelEn: string; icon: string }> = {
  medical: { labelAr: "خدمات طبية", labelEn: "Medical Services", icon: "Stethoscope" },
  nursing: { labelAr: "تمريض منزلي", labelEn: "Home Nursing", icon: "HeartPulse" },
  packages: { labelAr: "باقات سنوية", labelEn: "Annual Packages", icon: "Package" },
};
