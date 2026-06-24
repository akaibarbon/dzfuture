
-- 1. public_profiles view as security_invoker (no SECURITY DEFINER behavior)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, user_id, full_name, nickname, photo_url, role, level, branch, xp, streak_days, approved, created_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2. daily_schedules: restrict SELECT to owner
DROP POLICY IF EXISTS "Anyone can read schedules" ON public.daily_schedules;
CREATE POLICY "Owner can read schedules" ON public.daily_schedules
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. chat-media: add owner UPDATE policy
DROP POLICY IF EXISTS "Users update own chat media" ON storage.objects;
CREATE POLICY "Users update own chat media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. lessons: drop broad SELECT (public bucket — files still accessible via public URL),
--    add owner UPDATE policy
DROP POLICY IF EXISTS "Authenticated read lessons" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update lesson files" ON storage.objects;
CREATE POLICY "Owner can update lesson files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lessons' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'lessons' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_ai_conversation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_group_serial() FROM anon, authenticated, PUBLIC;
