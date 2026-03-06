import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ROLES = ["admin", "cs"] as const;
type StaffRole = typeof ALLOWED_ROLES[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify requester is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    let userId = claimsData?.claims?.sub ?? null;

    // Fallback for environments where getClaims may intermittently fail
    if (!userId) {
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (!userError) {
        userId = userData?.user?.id ?? null;
      }
    }

    if (claimsError && !userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requester has admin or cs role
    const { data: requesterRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (requesterRoles || []).map((r) => r.role);
    const isAdmin = userRoles.includes("admin");
    const isCS = userRoles.includes("cs");

    if (!isAdmin && !isCS) {
      return new Response(JSON.stringify({ error: "Forbidden: staff only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, role: targetRole } = body;

    // Check staff_users role for granular permissions
    const { data: staffRow } = await supabaseAdmin.from("staff_users").select("role").eq("user_id", userId).maybeSingle();
    const staffRole = staffRow?.role || null;
    const isPlatformOwner = staffRole === "owner";

    // Actions that require admin role only
    const adminOnlyActions = ["invite_admin", "remove_admin", "create_cs", "list"];
    if (adminOnlyActions.includes(action) && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Staff management (invite/remove/create) requires platform owner
    const ownerOnlyActions = ["invite_admin", "remove_admin", "create_cs"];
    if (ownerOnlyActions.includes(action) && !isPlatformOwner) {
      return new Response(JSON.stringify({ error: "Forbidden: only platform owner can manage staff" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which role we're managing (default to "admin" for backward compat)
    const managedRole: StaffRole = ALLOWED_ROLES.includes(targetRole) ? targetRole : "admin";
    const roleLabel = managedRole === "cs" ? "CS agent" : "admin";

    // ── LIST ──
    if (action === "list") {
      const { data: roleRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", managedRole);

      if (!roleRows || roleRows.length === 0) {
        return new Response(JSON.stringify({ admins: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ids = roleRows.map((r) => r.user_id);
      const result = [];
      for (const uid of ids) {
        const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(uid);
        // Also fetch profile for full_name
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name, created_at")
          .eq("user_id", uid)
          .maybeSingle();
        if (u) {
          result.push({
            user_id: uid,
            email: u.email,
            full_name: profile?.full_name || null,
            created_at: profile?.created_at || u.created_at,
          });
        }
      }

      return new Response(JSON.stringify({ admins: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET EMAILS (batch) ──
    if (action === "get_emails") {
      const { user_ids } = body;
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ emails: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Limit to 100 to prevent abuse
      const limited = user_ids.slice(0, 100);
      const emails: Record<string, string> = {};
      for (const uid of limited) {
        try {
          const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (u?.email) emails[uid] = u.email;
        } catch (_) {
          // skip
        }
      }

      return new Response(JSON.stringify({ emails }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE CS ACCOUNT ──
    if (action === "create_cs") {
      const { email, password, full_name } = body;
      if (!email?.trim() || !password?.trim()) {
        return new Response(JSON.stringify({ error: "Email and password are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.trim().length < 8) {
        return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;

      const existing = users.find(
        (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
      );

      if (existing) {
        return new Response(
          JSON.stringify({ error: "User with this email already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user with auto-confirm
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: password.trim(),
        email_confirm: true,
        user_metadata: { full_name: full_name?.trim() || "" },
      });

      if (createErr) throw createErr;

      // Update profile name if provided
      if (full_name?.trim() && newUser.user) {
        await supabaseAdmin
          .from("profiles")
          .update({ full_name: full_name.trim() })
          .eq("user_id", newUser.user.id);
      }

      // Assign CS role
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "cs" });

      if (roleErr) throw roleErr;

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user.id, email: newUser.user.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── INVITE ──
    if (action === "invite_admin") {
      const { email } = body;
      if (!email?.trim()) {
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw listErr;

      const targetUser = users.find(
        (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
      );

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: "User not found. They must register first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUser.id)
        .eq("role", managedRole);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ error: `User is already a ${roleLabel}` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: insertErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: targetUser.id, role: managedRole });

      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({ success: true, user_id: targetUser.id, email: targetUser.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── REMOVE ──
    if (action === "remove_admin") {
      const { user_id: targetId } = body;
      if (!targetId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For admin role: prevent removing last admin and self-removal
      if (managedRole === "admin") {
        const { data: allAdmins } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (!allAdmins || allAdmins.length <= 1) {
          return new Response(
            JSON.stringify({ error: "Cannot remove the last admin" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (targetId === userId) {
          return new Response(
            JSON.stringify({ error: "Cannot remove yourself" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { error: delErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetId)
        .eq("role", managedRole);

      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-manage-admins error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
