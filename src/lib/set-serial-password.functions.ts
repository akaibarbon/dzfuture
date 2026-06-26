import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeSerial } from "@/lib/serial-auth";

interface Input { userId: string; serial: string }

// Sets the auth password for the CURRENT signed-in user equal to a server-derived
// secret. Callers may only set their own password; admins may set any user's.
export const setSerialPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data as Input)
  .handler(async ({ data, context }) => {
    const { serialToAuthPassword } = await import("@/lib/serial-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, serial } = data;
    if (!userId || !serial) throw new Error("بيانات ناقصة");
    if (userId !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user: context.userId });
      if (!isAdmin) throw new Error("غير مخوّل");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: serialToAuthPassword(serial),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Looks up a profile by serial and ensures its auth user has password=serial,
// then returns the email so client can sign in. Used as a self-heal for older
// OAuth-created accounts that never had a password set.
// Admin-only self-heal: re-derives the password and returns just the email
// (never the derived secret). Use the public `/api/serial-login` route for
// actual login — this is for support tooling only.
export const healSerialLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data as { serial: string })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user: context.userId });
    if (!isAdmin) throw new Error("غير مخوّل");
    const { serialToAuthPassword } = await import("@/lib/serial-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const serial = normalizeSerial(data.serial || "");
    if (!serial) throw new Error("الرقم التسلسلي مطلوب");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, email, full_name, role, serial_number, photo_url, nickname, level, branch, approved")
      .eq("serial_number", serial)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile?.user_id) throw new Error("الحساب غير موجود");
    const { data: authUser, error: getErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    if (getErr) throw new Error(getErr.message);
    const authEmail = authUser?.user?.email || (profile.email as string);
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
      password: serialToAuthPassword(serial),
      email_confirm: true,
    });
    if (updErr) throw new Error(updErr.message);
    if (authEmail && authEmail.toLowerCase() !== (profile.email || "").toLowerCase()) {
      await supabaseAdmin.from("profiles").update({ email: authEmail }).eq("user_id", profile.user_id);
    }
    return {
      email: authEmail,
      profile: { ...profile, email: authEmail || profile.email },
    };
  });
