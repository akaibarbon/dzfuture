import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateSerial() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return (
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)] +
    Math.floor(10 + Math.random() * 90).toString()
  );
}

interface CreateAccountInput {
  fullName: string;
  role: "student" | "tutor";
  level?: string | null;        // for student: single level (m1..m4)
  branch?: string | null;
  levels?: string[];            // for tutor: list of classes/levels (informational)
}

export const adminCreateAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as CreateAccountInput)
  .handler(async ({ data }) => {
    const { fullName, role, level, branch, levels } = data;
    if (!fullName?.trim()) throw new Error("الاسم مطلوب");

    // Generate unique serial (max 10 attempts)
    let serial = "";
    for (let i = 0; i < 10; i++) {
      serial = generateSerial();
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("serial_number", serial)
        .maybeSingle();
      if (!existing) break;
    }

    const fakeEmail = `${serial.toLowerCase()}@cem-gm.local`;
    const password = serial; // serial == password (login flow uses this)

    // Create auth user
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
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
      email: fakeEmail,
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

    return { serial, fullName, role, email: fakeEmail };
  });
