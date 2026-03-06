import { supabase } from "@/integrations/supabase/client";

/**
 * Log an assistant action and notify the platform owner.
 * Call this after any mutating action when the current user is NOT the owner.
 */
export async function logAssistantAction({
  staffRole,
  bookingId,
  bookingRef,
  action,
  details,
}: {
  staffRole: string | null;
  bookingId: string;
  bookingRef?: string | null;
  action: string;
  details?: Record<string, any>;
}) {
  // Only log for non-owner staff (owner_assistant, support, etc.)
  if (!staffRole || staffRole === "owner") return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Log to data_access_log
  await supabase.from("data_access_log").insert({
    booking_id: bookingId,
    accessed_by: user.id,
    accessor_role: staffRole,
    action: `${action}${details ? ` | ${JSON.stringify(details)}` : ""}`,
  });

  // 2. Notify owner via staff_notifications
  const ref = bookingRef || bookingId.slice(0, 8);
  await supabase.from("staff_notifications").insert({
    title: `🔔 ${staffRole}: ${action}`,
    body: `الشريك قام بعملية "${action}" على الطلب ${ref}`,
    target_role: "admin",
    booking_id: bookingId,
  });
}
