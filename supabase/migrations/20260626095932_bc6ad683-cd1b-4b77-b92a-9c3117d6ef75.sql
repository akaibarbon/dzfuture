
-- 1) Promote admin profile
UPDATE public.profiles
SET role = 'admin'
WHERE serial_number = 'EJ76' OR lower(email) = 'boukaachey@gmail.com';

-- 2) is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user AND role = 'admin') $$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 3) Restrict site_visits SELECT to admins
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.site_visits'::regclass AND polcmd = 'r' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_visits', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "site_visits_admin_select" ON public.site_visits
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 4) group_passwords: restrictive deny SELECT
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.group_passwords'::regclass AND polcmd = 'r' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_passwords', pol.polname);
  END LOOP;
END $$;
CREATE POLICY "group_passwords_deny_select" ON public.group_passwords
  AS RESTRICTIVE FOR SELECT TO public USING (false);

-- 5) Lock down internal SECURITY DEFINER trigger-only functions
REVOKE EXECUTE ON FUNCTION public.notify_student_on_grade() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_tutor_on_submission() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_assignment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_favorites_on_lesson() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_assignment_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_assignment_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_group_serial() FROM PUBLIC;

-- 6) Storage policies for ai-files (private, owner-only) and lessons (authenticated read)
DROP POLICY IF EXISTS "Owner can read own ai-files" ON storage.objects;
DROP POLICY IF EXISTS "ai_files_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "ai_files_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "ai_files_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "ai_files_owner_delete" ON storage.objects;
CREATE POLICY "ai_files_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ai_files_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ai_files_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ai_files_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "lessons_authenticated_select" ON storage.objects;
CREATE POLICY "lessons_authenticated_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lessons');
