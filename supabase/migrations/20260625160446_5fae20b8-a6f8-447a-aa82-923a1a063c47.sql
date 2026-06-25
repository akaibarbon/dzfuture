
-- 1. Assignments: remove public read, add authenticated read
DROP POLICY IF EXISTS "Anyone can read assignments" ON public.assignments;
CREATE POLICY "Authenticated can read assignments" ON public.assignments
  FOR SELECT TO authenticated USING (true);

-- 2. Profiles: trigger to prevent privilege escalation via self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND NOT public.user_has_role(auth.uid(), 'admin') THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.approved IS DISTINCT FROM OLD.approved
       OR NEW.serial_number IS DISTINCT FROM OLD.serial_number
       OR NEW.level IS DISTINCT FROM OLD.level
       OR NEW.branch IS DISTINCT FROM OLD.branch THEN
      RAISE EXCEPTION 'Cannot modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Drop date_of_birth from group_join_requests (PII minimization)
ALTER TABLE public.group_join_requests DROP COLUMN IF EXISTS date_of_birth;

-- 4. Daily schedules: allow approved group members to read group schedules
CREATE POLICY "Group members can read group schedules" ON public.daily_schedules
  FOR SELECT TO authenticated
  USING (
    group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_join_requests gjr
      WHERE gjr.group_id = daily_schedules.group_id
        AND gjr.user_id = auth.uid()
        AND gjr.status = 'approved'
    )
  );

-- 5. Chat-media storage: restrict reads to owner folder
DROP POLICY IF EXISTS "Authenticated read chat media" ON storage.objects;
CREATE POLICY "Owner can read chat media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 6. Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.cleanup_assignment_notifications() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_favorites_on_lesson() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_assignment() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_student_on_grade() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_tutor_on_submission() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.refresh_assignment_notifications() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, authenticated, anon;
