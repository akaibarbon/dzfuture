
-- Helper role-check function
CREATE OR REPLACE FUNCTION public.user_has_role(_user uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.user_has_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, text) TO authenticated;

-- 1) announcements: restrict insert/delete to tutors
DROP POLICY IF EXISTS "Authenticated can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated can delete announcements" ON public.announcements;
CREATE POLICY "Tutors can insert announcements" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role(auth.uid(), 'tutor'));
CREATE POLICY "Tutors can delete announcements" ON public.announcements
  FOR DELETE TO authenticated
  USING (public.user_has_role(auth.uid(), 'tutor'));

-- 2) chat-media upload ownership
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Users upload own chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) daily_schedules: insert ownership
DROP POLICY IF EXISTS "Authenticated can insert schedules" ON public.daily_schedules;
CREATE POLICY "Users insert own schedules" ON public.daily_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR (group_id IS NOT NULL AND public.is_group_owner(group_id, auth.uid()))
  );

-- 4) group_join_requests: SELECT only requester or group owner
DROP POLICY IF EXISTS "Anyone can read join requests" ON public.group_join_requests;
CREATE POLICY "Requester or owner can read join requests" ON public.group_join_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_group_owner(group_id, auth.uid()));

-- 5) Move group passwords to a private table
CREATE TABLE IF NOT EXISTS public.group_passwords (
  group_id uuid PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,
  password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.group_passwords TO service_role;
ALTER TABLE public.group_passwords ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated grants: only reachable via SECURITY DEFINER functions.

INSERT INTO public.group_passwords(group_id, password)
SELECT id, password FROM public.groups WHERE password IS NOT NULL
ON CONFLICT (group_id) DO NOTHING;

ALTER TABLE public.groups DROP COLUMN IF EXISTS password;

CREATE OR REPLACE FUNCTION public.verify_group_password(_group_id uuid, _password text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_passwords
    WHERE group_id = _group_id AND password = _password
  )
$$;
REVOKE EXECUTE ON FUNCTION public.verify_group_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_group_password(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_group_password(_group_id uuid, _password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_group_owner(_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF _password IS NULL OR length(_password) = 0 THEN
    DELETE FROM public.group_passwords WHERE group_id = _group_id;
  ELSE
    INSERT INTO public.group_passwords(group_id, password)
    VALUES (_group_id, _password)
    ON CONFLICT (group_id) DO UPDATE SET password = EXCLUDED.password, updated_at = now();
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_group_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_group_password(uuid, text) TO authenticated;

-- 6) lessons bucket upload: tutors only, own folder
DROP POLICY IF EXISTS "Authenticated can upload lesson files" ON storage.objects;
CREATE POLICY "Tutors upload own lesson files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lessons'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.user_has_role(auth.uid(), 'tutor')
  );

-- 7) notifications: drop wide insert + add send_notification rpc
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT '',
  p_related_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_user_id IS NULL OR p_type IS NULL OR p_title IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;
  INSERT INTO public.notifications(user_id, type, title, body, related_id)
  VALUES (p_user_id, p_type, p_title, COALESCE(p_body, ''), p_related_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text) TO authenticated;

-- 8) profiles: restrict to authenticated readers
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
CREATE POLICY "Authenticated can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 9) user_badges: drop self insert + award_badge rpc
DROP POLICY IF EXISTS "Users insert own badges" ON public.user_badges;
CREATE OR REPLACE FUNCTION public.award_badge(p_user_id uuid, p_badge_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.user_badges(user_id, badge_key)
  VALUES (p_user_id, p_badge_key)
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END $$;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid, text) TO authenticated;

-- 10) xp_events: drop self insert + award_xp rpc
DROP POLICY IF EXISTS "Users insert own xp events" ON public.xp_events;
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount int, p_reason text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_xp int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.xp_events(user_id, amount, reason)
  VALUES (p_user_id, p_amount, p_reason);
  UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + p_amount
    WHERE user_id = p_user_id
    RETURNING xp INTO new_xp;
  RETURN COALESCE(new_xp, 0);
END $$;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer, text) TO authenticated;

-- 11) Storage public-bucket listing: drop broad SELECT policies.
-- Public buckets remain accessible via direct file URLs.
DROP POLICY IF EXISTS "Anyone can read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read lesson files" ON storage.objects;
DROP POLICY IF EXISTS "Public read ai-files" ON storage.objects;

-- 12) Revoke direct EXECUTE on SECURITY DEFINER helpers/triggers from clients.
REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tutor_on_submission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_student_on_grade() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_group_serial() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_favorites_on_lesson() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_assignment_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_assignment_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_ai_conversation() FROM PUBLIC, anon, authenticated;
