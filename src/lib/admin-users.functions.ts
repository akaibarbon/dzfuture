import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateSerialNumber, serialToAuthPassword } from "@/lib/serial-auth";

interface CreateAccountInput {
  fullName: string;
  role: "student" | "tutor";
  level?: string | null;
  branch?: string | null;
  levels?: string[];
  email?: string | null; // optional real email so the user can also log in via Google with the same identity
}

export const adminCreateAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as CreateAccountInput)
  .handler(async ({ data }) => {
    const { fullName, role, level, branch, levels, email } = data;
    if (!fullName?.trim()) throw new Error("الاسم مطلوب");

    // Generate unique serial (max 10 attempts)
    let serial = "";
    for (let i = 0; i < 10; i++) {
      serial = generateSerialNumber();
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("serial_number", serial)
        .maybeSingle();
      if (!existing) break;
    }

    const realEmail = email?.trim().toLowerCase() || null;
    const fakeEmail = `${serial.toLowerCase()}@accounts.cemgm.lovable.app`;
    const loginEmail = realEmail || fakeEmail; // auth.email used by serial-password login
    const password = serialToAuthPassword(serial); // derived from serial for reliable auth password rules

    // If a real email was provided, ensure it's not already used in profiles
    if (realEmail) {
      const { data: existingByEmail } = await supabaseAdmin
        .from("profiles").select("id").ilike("email", realEmail).maybeSingle();
      if (existingByEmail) throw new Error("هذا الإيميل مسجّل مسبقاً");
    }

    // Create auth user (auto-confirmed)
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, created_by_admin: true },
    });
    if (authErr || !authUser.user) throw new Error(authErr?.message || "فشل إنشاء الحساب");

    // For tutors, store joined levels in nickname field as helper, level=null
    const tutorLevels = role === "tutor" && levels?.length ? levels.join(",") : null;

    const { error: profErr } = await supabaseAdmin.from("profiles").insert({
      user_id: authUser.user.id,
      full_name: fullName,
      email: loginEmail,
      role,
      serial_number: serial,
      photo_url: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(fullName)}`,
      level: role === "student" ? (level || null) : null,
      branch: role === "student" ? (branch || null) : null,
      nickname: tutorLevels,
      approved: true,
    });
    if (profErr) {
      // rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(profErr.message);
    }

    return { serial, fullName, role, email: loginEmail };
  });
