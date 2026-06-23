import { createServerFn } from "@tanstack/react-start";
import { normalizeSerial, serialPasswordCandidates, serialToAuthPassword } from "@/lib/serial-auth";

interface Input { userId: string; serial: string }

// Sets the auth password for an OAuth-created user equal to their serial number,
// so they can also sign in via the serial-number flow.
export const setSerialPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as Input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, serial } = data;
    if (!userId || !serial) throw new Error("بيانات ناقصة");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: serialToAuthPassword(serial),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Looks up a profile by serial and ensures its auth user has password=serial,
// then returns the email so client can sign in. Used as a self-heal for older
// OAuth-created accounts that never had a password set.
export const healSerialLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { serial: string })
  .handler(async ({ data }) => {
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
    // Fetch the actual auth user so we use the email Supabase has on record
    const { data: authUser, error: getErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    if (getErr) throw new Error(getErr.message);
    const authEmail = authUser?.user?.email || (profile.email as string);
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
      password: serialToAuthPassword(serial),
      email_confirm: true,
    });
    if (updErr) throw new Error(updErr.message);
    // Sync profile.email to auth email if they drifted
    if (authEmail && authEmail.toLowerCase() !== (profile.email || "").toLowerCase()) {
      await supabaseAdmin.from("profiles").update({ email: authEmail }).eq("user_id", profile.user_id);
    }
    return {
      email: authEmail,
      passwords: serialPasswordCandidates(serial),
      profile: { ...profile, email: authEmail || profile.email },
    };
  });
