import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeSerial, serialPasswordCandidates, serialToAuthPassword } from "@/lib/serial-auth";

interface Input { userId: string; serial: string }

// Sets the auth password for an OAuth-created user equal to their serial number,
// so they can also sign in via the serial-number flow.
export const setSerialPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as Input)
  .handler(async ({ data }) => {
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
    const serial = normalizeSerial(data.serial || "");
    if (!serial) throw new Error("الرقم التسلسلي مطلوب");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email")
      .eq("serial_number", serial)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile?.user_id) throw new Error("الحساب غير موجود");
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
      password: serialToAuthPassword(serial),
    });
    if (updErr) throw new Error(updErr.message);
    return { email: profile.email as string, passwords: serialPasswordCandidates(serial) };
  });
