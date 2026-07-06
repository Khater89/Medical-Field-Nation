import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_services",
  title: "List medical services",
  description: "List active medical home-care services offered on the platform, with optional category filter.",
  inputSchema: {
    category: z.string().optional().describe("Optional category slug or name to filter by."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase.from("services").select("id, name_ar, name_en, category, price, price_type, is_active").eq("is_active", true).limit(limit ?? 50);
    if (category) q = q.or(`category.eq.${category},category_ar.eq.${category},category_en.eq.${category}`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { services: data },
    };
  },
});
