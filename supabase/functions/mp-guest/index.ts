// Guest-facing marketplace endpoint: chat + order create without auth.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(p: string) {
  return (p || "").replace(/\D+/g, "").slice(-9);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === "open_chat") {
      const { vendor_id, product_id, guest_token, name, phone } = body;
      if (!vendor_id || !name || !phone) return jr({ error: "missing_fields" }, 400);
      const phone_norm = normalizePhone(phone);
      if (phone_norm.length < 7) return jr({ error: "invalid_phone" }, 400);

      // Reuse chat by token first, else by (vendor, phone, product) for same guest
      let chat: any = null;
      if (guest_token) {
        const { data } = await sb.from("marketplace_chats")
          .select("*").eq("guest_token", guest_token).eq("vendor_id", vendor_id)
          .eq("product_id", product_id ?? null).maybeSingle();
        chat = data;
      }
      if (!chat) {
        const { data } = await sb.from("marketplace_chats")
          .select("*").eq("vendor_id", vendor_id).eq("customer_phone_norm", phone_norm)
          .eq("product_id", product_id ?? null).maybeSingle();
        chat = data;
      }
      const tokenOut = chat?.guest_token || guest_token || crypto.randomUUID();
      if (!chat) {
        const { data, error } = await sb.from("marketplace_chats").insert({
          vendor_id, product_id: product_id ?? null,
          customer_user_id: null,
          customer_name: name, customer_phone: phone,
          customer_phone_norm: phone_norm,
          customer_consent_at: new Date().toISOString(),
          guest_token: tokenOut,
          last_message_at: new Date().toISOString(),
        }).select("*").single();
        if (error) return jr({ error: error.message }, 400);
        chat = data;
      } else {
        await sb.from("marketplace_chats").update({
          customer_name: name, customer_phone: phone, customer_phone_norm: phone_norm,
          guest_token: tokenOut, customer_consent_at: chat.customer_consent_at || new Date().toISOString(),
        }).eq("id", chat.id);
      }
      return jr({ chat_id: chat.id, guest_token: tokenOut });
    }

    if (action === "list_messages") {
      const { chat_id, guest_token } = body;
      const { data: chat } = await sb.from("marketplace_chats")
        .select("id,guest_token").eq("id", chat_id).maybeSingle();
      if (!chat || chat.guest_token !== guest_token) return jr({ error: "forbidden" }, 403);
      const { data } = await sb.from("marketplace_messages")
        .select("*").eq("chat_id", chat_id).order("created_at", { ascending: true });
      // mark seen for customer
      await sb.from("marketplace_chats").update({ unread_for_customer: 0 }).eq("id", chat_id);
      return jr({ messages: data || [] });
    }

    if (action === "send_message") {
      const { chat_id, guest_token, body: text } = body;
      if (!text?.trim()) return jr({ error: "empty" }, 400);
      const { data: chat } = await sb.from("marketplace_chats")
        .select("id,guest_token,vendor_id,customer_name").eq("id", chat_id).maybeSingle();
      if (!chat || chat.guest_token !== guest_token) return jr({ error: "forbidden" }, 403);
      const { data: msg, error } = await sb.from("marketplace_messages").insert({
        chat_id, sender_id: null, sender_role: "customer",
        sender_name: chat.customer_name, body: text.trim(),
      }).select("*").single();
      if (error) return jr({ error: error.message }, 400);
      
      const { data: cur } = await sb.from("marketplace_chats")
        .select("unread_for_vendor").eq("id", chat_id).maybeSingle();
      await sb.from("marketplace_chats").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: text.trim().slice(0, 120),
        unread_for_vendor: (cur?.unread_for_vendor || 0) + 1,
      }).eq("id", chat_id);
      return jr({ message: msg });
    }

    if (action === "create_order") {
      const {
        vendor_id, items, delivery_method, delivery_address, delivery_city,
        notes, name, phone, guest_token, acknowledgement_text,
      } = body;
      if (!vendor_id || !Array.isArray(items) || items.length === 0)
        return jr({ error: "missing_items" }, 400);
      if (!name || !phone) return jr({ error: "missing_identity" }, 400);
      const phone_norm = normalizePhone(phone);

      // Compute totals from DB products to avoid client tampering
      const ids = items.map((i: any) => i.product_id);
      const { data: prods } = await sb.from("marketplace_products")
        .select("id,name,price,vendor_id").in("id", ids);
      if (!prods || prods.length !== ids.length) return jr({ error: "invalid_products" }, 400);
      let subtotal = 0;
      const orderItems = items.map((i: any) => {
        const p = prods.find((x: any) => x.id === i.product_id)!;
        if (p.vendor_id !== vendor_id) throw new Error("vendor_mismatch");
        const qty = Math.max(1, parseInt(i.quantity || 1));
        const line = Number(p.price) * qty;
        subtotal += line;
        return { product_id: p.id, product_name: p.name, unit_price: p.price, quantity: qty, line_total: line };
      });
      const platform_fee_percent = 10;
      const platform_fee_amount = +(subtotal * platform_fee_percent / 100).toFixed(2);
      const total = subtotal;
      const vendor_payout = +(subtotal - platform_fee_amount).toFixed(2);

      const { data: order, error } = await sb.from("marketplace_orders").insert({
        vendor_id, customer_user_id: null,
        status: "pending", payment_method: "cod", payment_status: "unpaid",
        delivery_method: delivery_method || "delivery",
        subtotal, delivery_fee: 0, discount: 0, total,
        platform_fee_percent, platform_fee_amount, vendor_payout, currency: "JOD",
        customer_name: name, customer_phone: phone, customer_phone_norm: phone_norm,
        delivery_address, delivery_city, notes,
        guest_token: guest_token || crypto.randomUUID(),
        customer_acknowledged_at: new Date().toISOString(),
        customer_acknowledgement_text: acknowledgement_text || "أوافق على شروط المنصة كوسيط.",
      }).select("*").single();
      if (error) return jr({ error: error.message }, 400);

      const rows = orderItems.map((it) => ({ ...it, order_id: order.id }));
      const { error: itemsErr } = await sb.from("marketplace_order_items").insert(rows);
      if (itemsErr) return jr({ error: itemsErr.message }, 400);

      return jr({ order_id: order.id, order_number: order.order_number, guest_token: order.guest_token });
    }

    if (action === "list_my_orders") {
      const { phone, guest_token } = body;
      const phone_norm = normalizePhone(phone || "");
      let q = sb.from("marketplace_orders").select("*, items:marketplace_order_items(*), vendor:marketplace_vendors(store_name,logo_url)").order("created_at", { ascending: false }).limit(50);
      if (guest_token) q = q.eq("guest_token", guest_token);
      else if (phone_norm) q = q.eq("customer_phone_norm", phone_norm);
      else return jr({ orders: [] });
      const { data } = await q;
      return jr({ orders: data || [] });
    }

    return jr({ error: "unknown_action" }, 400);
  } catch (e: any) {
    return jr({ error: e?.message || "server_error" }, 500);
  }
});
