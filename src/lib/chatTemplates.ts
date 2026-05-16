// Templated Q&A — exactly 5 customer questions and 5 provider responses (with price).
// Free text is disabled to prevent PII leakage and keep coordination on-platform.

export interface ChatQuestion {
  id: string;
  text: string;
}

// Only 3 general questions broadcast to all matching providers
export const CUSTOMER_QUESTIONS: ChatQuestion[] = [
  { id: "available", text: "هل يوجد مزود متاح؟" },
  { id: "quotes", text: "أرجو تقديم عرض السعر." },
  { id: "review", text: "أرجو الاطلاع على طلبي." },
];

// Customer private questions (when targeting a specific provider after seeing quotes)
export const CUSTOMER_PRIVATE_QUESTIONS: ChatQuestion[] = [
  { id: "p_available", text: "هل أنت متاح في موعد الطلب المحدد؟" },
  { id: "p_experience", text: "هل لديك خبرة في هذه الحالة أو الخدمة المطلوبة؟" },
  { id: "p_more_info", text: "هل تحتاج إلى معلومات إضافية قبل قبول الطلب؟" },
  { id: "p_assign_confirm", text: "سأقوم بالإسناد إليك الآن، أرجو منك التأكيد بقبول الطلب." },
];

// Provider response templates — ready replies. Only the quote reply requires a price input.
// Use {{price}} placeholder which the UI replaces with the entered number.
export const PROVIDER_RESPONSES: { id: string; template: string; needsDuration?: boolean }[] = [
  { id: "available_yes", template: "نعم، أنا متاح لتنفيذ الطلب في الموعد المحدد." },
  { id: "reviewed", template: "تم الاطلاع على تفاصيل الطلب، ويمكنني تقديم الخدمة." },
  { id: "accept_assignment", template: "أقبل إسناد الطلب لي، وأنا جاهز للمتابعة." },
  { id: "contact_coordinator", template: "أرجو الاتصال بالمنسق لأي تفاصيل إضافية." },
];

export const QUESTIONS_BY_TEXT: Record<string, ChatQuestion> = Object.fromEntries(
  [...CUSTOMER_QUESTIONS, ...CUSTOMER_PRIVATE_QUESTIONS].map((q) => [q.text, q])
);

// PII filter — block phones, URLs, emails, addresses
const PII_PATTERNS = [
  /\d{6,}/,
  /https?:\/\//i,
  /www\./i,
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
  /maps?\.|goo\.gl|wa\.me/i,
  /شارع|عمارة|بناية|طابق|حي\s/,
];

export function containsPII(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
}
