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

    // ---- Guest phone OTP + sessions ----
    if (action === "request_otp") {
      const phone_norm = normalizePhone(body?.phone || "");
      if (phone_norm.length < 7) return jr({ error: "invalid_phone" }, 400);
      // throttle: max 3 per 10 min
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await sb.from("marketplace_guest_otps")
        .select("id", { count: "exact", head: true })
        .eq("phone_norm", phone_norm).gte("created_at", since);
      if ((count || 0) >= 3) return jr({ error: "rate_limited" }, 429);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await sb.from("marketplace_guest_otps").insert({ phone_norm, code, expires_at });

      // Try Twilio if configured
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = Deno.env.get("TWILIO_FROM");
      let sent = false;
      if (sid && tok && from) {
        try {
          const to = "+962" + phone_norm; // Jordan default
          const form = new URLSearchParams({ To: to, From: from, Body: `رمز التحقق للسوق الطبي: ${code}` });
          const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: "POST",
            headers: { "Authorization": "Basic " + btoa(`${sid}:${tok}`), "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
          });
          sent = r.ok;
          if (!r.ok) console.error("twilio_error", await r.text());
        } catch (e) { console.error("twilio_exception", e); }
      } else {
        console.log(`[mp-guest] OTP for ${phone_norm}: ${code} (no SMS provider configured)`);
      }
      // When no SMS provider, echo OTP so guest can still verify (transitional dev mode).
      return jr({ success: true, sent, dev_otp: sent ? null : code });
    }

    if (action === "verify_otp") {
      const phone_norm = normalizePhone(body?.phone || "");
      const code = String(body?.code || "").trim();
      const name = String(body?.name || "").trim() || null;
      if (phone_norm.length < 7 || code.length < 4) return jr({ error: "invalid_input" }, 400);
      const { data: rec } = await sb.from("marketplace_guest_otps")
        .select("*").eq("phone_norm", phone_norm).is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!rec) return jr({ error: "otp_expired" }, 400);
      if ((rec.attempts || 0) >= 5) return jr({ error: "too_many_attempts" }, 429);
      if (rec.code !== code) {
        await sb.from("marketplace_guest_otps").update({ attempts: (rec.attempts || 0) + 1 }).eq("id", rec.id);
        return jr({ error: "invalid_code" }, 400);
      }
      await sb.from("marketplace_guest_otps").update({ used_at: new Date().toISOString() }).eq("id", rec.id);
      const token = crypto.randomUUID() + "." + crypto.randomUUID();
      const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await sb.from("marketplace_guest_sessions").insert({ token, phone_norm, customer_name: name, expires_at });
      return jr({ success: true, session_token: token, phone_norm });
    }

    async function requireSession(t: string) {
      if (!t) return null;
      const { data: s } = await sb.from("marketplace_guest_sessions")
        .select("*").eq("token", t).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (s) await sb.from("marketplace_guest_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
      return s;
    }

    if (action === "list_my_chats") {
      const s = await requireSession(String(body?.session_token || ""));
      if (!s) return jr({ error: "session_invalid" }, 401);
      const { data } = await sb.from("marketplace_chats")
        .select("id,vendor_id,product_id,last_message_at,last_message_preview,unread_for_customer,guest_token,status,vendor:marketplace_vendors(id,store_name,logo_url,vendor_type)")
        .eq("customer_phone_norm", s.phone_norm)
        .order("last_message_at", { ascending: false }).limit(100);
      return jr({ chats: data || [], name: s.customer_name, phone_norm: s.phone_norm });
    }



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
      let tokenOut = chat?.guest_token || guest_token || crypto.randomUUID();
      if (!chat) {
        // Ensure unique token: guest_token has a UNIQUE constraint, so if the
        // incoming token is already used for a different (vendor, product) chat,
        // mint a fresh one to avoid collisions.
        const { data: tokenTaken } = await sb.from("marketplace_chats")
          .select("id").eq("guest_token", tokenOut).maybeSingle();
        if (tokenTaken) tokenOut = crypto.randomUUID();
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
      const { chat_id, guest_token, body: text, attachment_url, attachment_type, attachment_name } = body;
      const hasText = !!text?.trim();
      const hasAtt = !!attachment_url;
      if (!hasText && !hasAtt) return jr({ error: "empty" }, 400);
      const { data: chat } = await sb.from("marketplace_chats")
        .select("id,guest_token,vendor_id,customer_name").eq("id", chat_id).maybeSingle();
      if (!chat || chat.guest_token !== guest_token) return jr({ error: "forbidden" }, 403);
      const { data: msg, error } = await sb.from("marketplace_messages").insert({
        chat_id, sender_id: null, sender_role: "customer",
        sender_name: chat.customer_name, body: hasText ? text.trim() : "",
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
        attachment_name: attachment_name || null,
      }).select("*").single();
      if (error) return jr({ error: error.message }, 400);

      const preview = hasText ? text.trim().slice(0, 120) : "📎 مرفق";
      const { data: cur } = await sb.from("marketplace_chats")
        .select("unread_for_vendor").eq("id", chat_id).maybeSingle();
      await sb.from("marketplace_chats").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        unread_for_vendor: (cur?.unread_for_vendor || 0) + 1,
      }).eq("id", chat_id);
      return jr({ message: msg });
    }

    if (action === "upload_attachment") {
      const { chat_id, guest_token, file_base64, mime, filename } = body;
      if (!chat_id || !guest_token || !file_base64) return jr({ error: "missing_fields" }, 400);
      const { data: chat } = await sb.from("marketplace_chats")
        .select("id,guest_token").eq("id", chat_id).maybeSingle();
      if (!chat || chat.guest_token !== guest_token) return jr({ error: "forbidden" }, 403);
      const bin = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0));
      const ext = (filename?.split(".").pop() || "bin").toLowerCase().slice(0, 8);
      const path = `chats/${chat_id}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from("marketplace-chat").upload(path, bin, {
        contentType: mime || "application/octet-stream", upsert: false,
      });
      if (up.error) return jr({ error: up.error.message }, 400);
      const signed = await sb.storage.from("marketplace-chat")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) return jr({ error: signed.error.message }, 400);
      return jr({ url: signed.data.signedUrl, type: mime, name: filename });
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
