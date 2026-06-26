import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeSerial } from "@/lib/serial-auth";
import { serialPasswordCandidates, serialToAuthPassword } from "@/lib/serial-auth.server";

export const Route = createFileRoute("/api/serial-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { serial } = await request.json();
          const cleanSerial = normalizeSerial(String(serial || ""));
          if (!cleanSerial) return Response.json({ error: "الرقم التسلسلي مطلوب" }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("id, user_id, email, full_name, role, serial_number, photo_url, nickname, level, branch, approved")
            .eq("serial_number", cleanSerial)
            .maybeSingle();

          if (error) return Response.json({ error: error.message }, { status: 500 });
          if (!profile?.user_id) return Response.json({ error: "الحساب غير موجود" }, { status: 404 });

          const { data: authUser, error: getErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
          if (getErr) return Response.json({ error: getErr.message }, { status: 500 });
          const authEmail = authUser?.user?.email || profile.email;

          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
            password: serialToAuthPassword(cleanSerial),
            email_confirm: true,
          });
          if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

          if (authEmail && authEmail.toLowerCase() !== (profile.email || "").toLowerCase()) {
            await supabaseAdmin.from("profiles").update({ email: authEmail }).eq("user_id", profile.user_id);
          }

          const supabasePublic = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );

          let session = null;
          let signInError = null;
          for (const password of serialPasswordCandidates(cleanSerial)) {
            const result = await supabasePublic.auth.signInWithPassword({ email: authEmail, password });
            session = result.data.session;
            signInError = result.error;
            if (!signInError && session) break;
          }

          if (!session) return Response.json({ error: signInError?.message || "تعذر تسجيل الدخول" }, { status: 401 });
          return Response.json({ session, profile: { ...profile, email: authEmail || profile.email } });
        } catch (e: any) {
          return Response.json({ error: e?.message || "تعذر تسجيل الدخول" }, { status: 500 });
        }
      },
    },
  },
});