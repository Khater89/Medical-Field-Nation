import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_marketplace_vendors",
  title: "List marketplace vendors",
  description: "List approved medical marketplace vendors (pharmacies, medical stores, etc.), filterable by type or city.",
  inputSchema: {
    vendor_type: z.string().optional().describe("e.g. pharmacy, medical_store, optics."),
    city: z.string().optional().describe("Filter by city."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ vendor_type, city, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("marketplace_vendors_public")
      .select("id, store_name, vendor_type, city, rating, logo_url, business_phone, business_whatsapp")
      .limit(limit ?? 50);
    if (vendor_type) q = q.eq("vendor_type", vendor_type);
    if (city) q = q.ilike("city", `%${city}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { vendors: data },
    };
  },
});
