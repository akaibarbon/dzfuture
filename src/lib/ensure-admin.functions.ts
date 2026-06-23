import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { serialToAuthPassword } from "@/lib/serial-auth";

// One-shot bootstrap: ensures the superadmin account exists with serial EJ76
// linked to boukaachey@gmail.com, password = serialToAuthPassword("EJ76").
export const ensureAdminAccount = createServerFn({ method: "POST" })
  .handler(async () => {
    const SERIAL = "EJ76";
    const EMAIL = "boukaachey@gmail.com";
    const FULL_NAME = "Super Admin";
    const password = serialToAuthPassword(SERIAL);

    // 1) Find or create the auth user for this email
    const { data: listed, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(listErr.message);
    let authUser = listed.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

    if (authUser) {
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: { ...authUser.user_metadata, full_name: FULL_NAME, is_admin: true },
      });
      if (updErr) throw new Error(updErr.message);
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: EMAIL,
        password,
        email_confirm: true,
        user_metadata: { full_name: FULL_NAME, is_admin: true },
      });
      if (createErr || !created.user) throw new Error(createErr?.message || "auth create failed");
      authUser = created.user;
    }

    // 2) Ensure a single profile row with serial=EJ76 linked to this user
    // Clean any conflicting rows with same serial but different user
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("serial_number", SERIAL)
      .neq("user_id", authUser.id);

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (existingProfile) {
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: FULL_NAME,
          email: EMAIL,
          role: "admin",
          serial_number: SERIAL,
          approved: true,
        })
        .eq("id", existingProfile.id);
      if (pErr) throw new Error(pErr.message);
    } else {
      const { error: pErr } = await supabaseAdmin.from("profiles").insert({
        user_id: authUser.id,
        full_name: FULL_NAME,
        email: EMAIL,
        role: "admin",
        serial_number: SERIAL,
        approved: true,
        photo_url: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=admin`,
      });
      if (pErr) throw new Error(pErr.message);
    }

    return { ok: true, serial: SERIAL, email: EMAIL, password, userId: authUser.id };
  });
