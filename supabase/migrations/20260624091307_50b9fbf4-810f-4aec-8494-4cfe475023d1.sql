
-- profiles
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'student');

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false, security_barrier = true) AS
SELECT id, user_id, full_name, nickname, photo_url, role, level, branch,
       xp, streak_days, approved, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- group_announcements
DROP POLICY IF EXISTS "Authenticated can read group announcements" ON public.group_announcements;
CREATE POLICY "Members read group announcements" ON public.group_announcements
  FOR SELECT TO authenticated
  USING (
    public.is_group_owner(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_join_requests r
      WHERE r.group_id = group_announcements.group_id
        AND r.user_id = auth.uid()
        AND r.status = 'approved'
    )
  );

-- messages
DROP POLICY IF EXISTS "Authenticated can read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated can send messages" ON public.messages;

CREATE POLICY "Members read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.is_group_owner(group_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_join_requests r
      WHERE r.group_id = messages.group_id
        AND r.user_id = auth.uid()
        AND r.status = 'approved'
    )
  );

CREATE POLICY "Members send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      public.is_group_owner(group_id, auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.group_join_requests r
        WHERE r.group_id = messages.group_id
          AND r.user_id = auth.uid()
          AND r.status = 'approved'
      )
    )
  );

-- user_badges
DROP POLICY IF EXISTS "Authenticated can read badges" ON public.user_badges;
CREATE POLICY "Users read own badges" ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- groups (restrict creation to tutors/admins)
DROP POLICY IF EXISTS "Authenticated can create groups" ON public.groups;
CREATE POLICY "Tutors and admins create groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by IS NULL OR created_by = auth.uid())
    AND (
      public.user_has_role(auth.uid(), 'tutor')
      OR public.user_has_role(auth.uid(), 'admin')
    )
  );

-- storage policies
DROP POLICY IF EXISTS "Public can read chat media" ON storage.objects;
CREATE POLICY "Authenticated read chat media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Public can read lessons" ON storage.objects;
CREATE POLICY "Authenticated read lessons" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lessons');

-- SECURITY DEFINER trigger-only functions: revoke EXECUTE
REVOKE EXECUTE ON FUNCTION public.notify_student_on_grade() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_tutor_on_submission() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_assignment() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_favorites_on_lesson() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_assignment_notifications() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.refresh_assignment_notifications() FROM authenticated, anon, public;
