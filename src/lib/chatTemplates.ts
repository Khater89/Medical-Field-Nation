// Templated Q&A — exactly 5 customer questions and 5 provider responses (with price).
// Free text is disabled to prevent PII leakage and keep coordination on-platform.

export interface ChatQuestion {
  id: string;
  text: string;
}

export const CUSTOMER_QUESTIONS: ChatQuestion[] = [
  { id: "available", text: "هل أنت متاح في موعد الطلب المحدد؟" },
  { id: "experience", text: "هل لديك خبرة في هذه الحالة أو الخدمة المطلوبة؟" },
  { id: "price", text: "كم السعر المطلوب لتنفيذ هذه الخدمة؟" },
  { id: "duration", text: "كم المدة المتوقعة لتقديم الخدمة؟" },
  { id: "more_info", text: "هل تحتاج إلى معلومات إضافية قبل قبول الطلب؟" },
];

// Provider response templates — every reply MUST include a price.
// Use {{price}} placeholder which the UI replaces with the entered number.
export const PROVIDER_RESPONSES: { id: string; template: string; needsDuration?: boolean }[] = [
  { id: "available_yes", template: "نعم، أنا متاح في الموعد المحدد، والسعر هو: {{price}} د.أ" },
  { id: "available_confirm", template: "أنا متاح، لكن أحتاج إلى تأكيد بعض التفاصيل، والسعر المتوقع هو: {{price}} د.أ" },
  { id: "experienced", template: "لدي خبرة في هذا النوع من الحالات، والسعر هو: {{price}} د.أ" },
  { id: "duration", template: "يمكنني تقديم الخدمة، والمدة المتوقعة هي: {{duration}}، والسعر هو: {{price}} د.أ", needsDuration: true },
  { id: "need_info", template: "أحتاج إلى معلومات إضافية قبل التأكيد، والسعر المبدئي هو: {{price}} د.أ" },
];

export const QUESTIONS_BY_TEXT: Record<string, ChatQuestion> = Object.fromEntries(
  CUSTOMER_QUESTIONS.map((q) => [q.text, q])
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
