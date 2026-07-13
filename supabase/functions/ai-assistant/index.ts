// AI Assistant chat streaming endpoint for MFN platform.
// Uses Lovable AI Gateway (openai/gpt-5.5) — no user key needed.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت "مساعد MFN الذكي" - المساعد الرسمي لمنصة "أمة الحقل الطبي" (Medical Field Nation).

المنصة تحتوي على قسمين:
1. الخدمات الطبية المنزلية: تمريض، علاج طبيعي، خدمات طبية، حجز خدمة، تتبع الطلب.
2. السوق الطبي: صيدليات، أجهزة طبية، أطراف صناعية، أجهزة تنفس/أسنان/عيون، مستلزمات علاج طبيعي.

مهمتك:
- ساعد العميل باختيار الخدمة المناسبة وأرشده إلى /booking للحجز أو /marketplace للسوق.
- أجب على الأسئلة الطبية العامة بشكل معلوماتي فقط مع التنبيه بضرورة استشارة الطبيب في الحالات الجدية.
- في الحالات الطارئة (ألم صدر، ضيق تنفس شديد، نزيف حاد، فقدان وعي) وجّه فوراً للطوارئ 911.
- لا تعطي وصفات دوائية أو تشخيصات طبية.
- كن ودوداً ومختصراً. أجب بنفس لغة السؤال (عربي أو إنجليزي).
- الروابط المهمة: /services (الخدمات)، /marketplace (السوق)، /booking (حجز)، /track (تتبع الطلب).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { messages } = await req.json();
    if (!Array.isArray(messages)) return new Response(JSON.stringify({ error: "messages array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      const status = upstream.status;
      const msg = status === 429 ? "الخدمة مشغولة الآن، حاول بعد قليل" : status === 402 ? "تم استنفاد رصيد الذكاء الاصطناعي" : text;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
