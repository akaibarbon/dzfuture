
-- 1) profiles: hide email from other users (column-level)
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;
-- Keep UPDATE on email so users can edit their own.

-- 2) profiles: prevent role self-escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- 3) group_announcements: authenticated-only read
DROP POLICY IF EXISTS "Anyone can read group announcements" ON public.group_announcements;
CREATE POLICY "Authenticated can read group announcements" ON public.group_announcements
  FOR SELECT TO authenticated USING (true);

-- 4) messages: authenticated-only read
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
CREATE POLICY "Authenticated can read messages" ON public.messages
  FOR SELECT TO authenticated USING (true);

-- 5) user_badges: authenticated-only read
DROP POLICY IF EXISTS "Anyone can read badges" ON public.user_badges;
CREATE POLICY "Authenticated can read badges" ON public.user_badges
  FOR SELECT TO authenticated USING (true);

-- 6) group_passwords: explicit deny SELECT (defense-in-depth)
CREATE POLICY "Deny direct password reads" ON public.group_passwords
  FOR SELECT USING (false);

-- 7) Storage SELECT policies for buckets
CREATE POLICY "Public can read chat media" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');
CREATE POLICY "Public can read lessons" ON storage.objects
  FOR SELECT USING (bucket_id = 'lessons');
CREATE POLICY "Owner can read own ai-files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ai-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 8) Tighten always-true RLS policies
DROP POLICY IF EXISTS "Authenticated can create groups" ON public.groups;
CREATE POLICY "Authenticated can create groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can insert visits" ON public.site_visits
  FOR INSERT
  WITH CHECK (visitor_hash IS NOT NULL AND length(visitor_hash) BETWEEN 4 AND 128);

-- 9) Lock down SECURITY DEFINER function execution
-- Trigger functions: not callable by clients
REVOKE EXECUTE ON FUNCTION public.notify_student_on_grade() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tutor_on_submission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_favorites_on_lesson() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_assignment_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_assignment_notifications() FROM PUBLIC, anon, authenticated;

-- RPC helpers: signed-in users only (revoke from anon)
REVOKE EXECUTE ON FUNCTION public.verify_group_password(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_group_password(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text) FROM PUBLIC, anon;

-- RLS helpers used inside policies: authenticated needs execute (RLS evaluates as caller)
REVOKE EXECUTE ON FUNCTION public.user_has_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) FROM PUBLIC, anon;
