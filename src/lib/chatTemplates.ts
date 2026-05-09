// Templated Q&A system for booking chat
// Customers can only send pre-defined questions; providers can only reply with pre-defined options.
// This prevents PII leakage and keeps all coordination on-platform.

export interface ChatQuestion {
  id: string;
  text: string;
  responses: string[];
}

export const CUSTOMER_QUESTIONS: ChatQuestion[] = [
  {
    id: "available",
    text: "هل أنت متاح في موعد الطلب؟",
    responses: [
      "نعم، متاح في الموعد المحدد.",
      "متاح ولكن أحتاج لتأكيد الوقت.",
      "غير متاح في هذا الوقت، أقترح وقتاً آخر.",
      "أحتاج إلى تفاصيل إضافية قبل التأكيد.",
    ],
  },
  {
    id: "experience",
    text: "ما هي خبرتك في مثل هذه الحالات؟",
    responses: [
      "لدي خبرة واسعة في حالات مماثلة.",
      "لدي خبرة متوسطة وأستطيع تقديم الخدمة.",
      "هذا ضمن تخصصي بالكامل.",
      "أحتاج لمزيد من التفاصيل عن الحالة.",
    ],
  },
  {
    id: "home",
    text: "هل يمكنك تقديم الخدمة في المنزل؟",
    responses: [
      "نعم، أقدم الخدمة المنزلية بشكل اعتيادي.",
      "نعم، مع إحضار الأدوات اللازمة.",
      "أفضّل العيادة لكن المنزل ممكن.",
      "غير مناسب لهذه الحالة في المنزل.",
    ],
  },
  {
    id: "price",
    text: "كم السعر المتوقع للخدمة؟",
    responses: [
      "السعر ضمن السعر المعروض على المنصة.",
      "سأقدم عرض سعر تفصيلي بعد رؤية الحالة.",
      "السعر يعتمد على مدة الخدمة الفعلية.",
      "أرجو تقديم تفاصيل أكثر لتسعير دقيق.",
    ],
  },
  {
    id: "duration",
    text: "كم مدة الخدمة تقريباً؟",
    responses: [
      "حوالي 30–45 دقيقة.",
      "حوالي ساعة واحدة.",
      "من ساعة إلى ساعتين حسب الحالة.",
      "أحتاج لتقييم الحالة لتحديد المدة.",
    ],
  },
  {
    id: "similar",
    text: "هل لديك خبرة مع حالات مشابهة؟",
    responses: [
      "نعم، تعاملت مع حالات مماثلة كثيراً.",
      "نعم بشكل عام في نفس التخصص.",
      "خبرة محدودة، لكنني مستعد.",
      "أحتاج لمعرفة تفاصيل الحالة أولاً.",
    ],
  },
  {
    id: "more_info",
    text: "هل تحتاج إلى معلومات إضافية عن الحالة؟",
    responses: [
      "لا، المعلومات الموجودة كافية.",
      "نعم، أرجو إضافة وصف الحالة بدقة.",
      "نعم، أحتاج معرفة الأدوية الحالية.",
      "نعم، أحتاج معرفة الأعراض الحالية.",
    ],
  },
  {
    id: "on_time",
    text: "هل يمكنك الوصول في الوقت المحدد؟",
    responses: [
      "نعم، سأكون في الموعد تماماً.",
      "نعم، مع هامش ±10 دقائق.",
      "قد أتأخر قليلاً وسأبلغ مسبقاً.",
      "أحتاج لتأكيد الوقت من جديد.",
    ],
  },
];

export const QUESTIONS_BY_TEXT: Record<string, ChatQuestion> = Object.fromEntries(
  CUSTOMER_QUESTIONS.map((q) => [q.text, q])
);

// PII filter — block phone numbers, URLs, emails, addresses
const PII_PATTERNS = [
  /\d{6,}/,                    // long digit sequences (phones)
  /https?:\/\//i,              // URLs
  /www\./i,                    // www links
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i, // email
  /maps?\.|goo\.gl|wa\.me/i,   // map / shortlinks
  /شارع|عمارة|بناية|طابق|حي\s/,  // address keywords (Arabic)
];

export function containsPII(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
}
