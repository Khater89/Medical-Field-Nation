// AI case analyzer: takes free-text case description and returns structured JSON
// with recommended service, urgency level, and a summary. Uses Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a medical triage assistant for MFN (Medical Field Nation) home-care platform in Jordan.
Analyze the patient case description (Arabic or English) and return STRICT JSON only, no prose.
Categories: "nursing" (تمريض), "physiotherapy" (علاج طبيعي), "medical" (خدمات طبية), "other".
Urgency: "emergency" (طوارئ - يجب 911), "urgent" (عاجل - نفس اليوم), "routine" (عادي).
For emergencies (chest pain, severe bleeding, unconscious, severe breathing distress) always set urgency="emergency".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { case_text, lang = "ar" } = await req.json();
    if (!case_text || typeof case_text !== "string" || case_text.trim().length < 3) {
      return new Response(JSON.stringify({ error: "case_text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Language: ${lang}\nCase: ${case_text}\n\nReturn JSON with keys: category, urgency, summary (short ${lang === "ar" ? "Arabic" : "English"} sentence), suggested_provider_gender ("male"|"female"|"any"), red_flags (array of short strings), recommended_action (short sentence).` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      const status = upstream.status;
      const msg = status === 429 ? "الخدمة مشغولة، حاول لاحقاً" : status === 402 ? "تم استنفاد رصيد الذكاء" : text;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
