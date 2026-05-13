
-- Update trigger: when assignment is edited, refresh notifications and group announcement
CREATE OR REPLACE FUNCTION public.refresh_assignment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notif_title text;
  notif_type text;
BEGIN
  IF NEW.kind = 'challenge' THEN
    notif_title := '🏆 تحدي محدّث: ' || NEW.title;
    notif_type := 'new_challenge';
  ELSE
    notif_title := '📝 واجب محدّث: ' || NEW.title;
    notif_type := 'new_assignment';
  END IF;

  -- Remove old notifications tied to this assignment
  DELETE FROM public.notifications WHERE related_id = NEW.id::text AND type IN ('new_assignment','new_challenge');

  -- Re-insert for currently targeted students
  INSERT INTO public.notifications (user_id, type, title, body, related_id)
  SELECT p.user_id, notif_type, notif_title,
         COALESCE('من ' || NEW.tutor_name, '') ||
         CASE WHEN NEW.due_at IS NOT NULL
              THEN ' • آخر أجل: ' || to_char(NEW.due_at, 'YYYY-MM-DD HH24:MI')
              ELSE '' END,
         NEW.id::text
  FROM public.profiles p
  WHERE p.user_id IS NOT NULL
    AND p.role = 'student'
    AND (array_length(NEW.target_levels, 1) IS NULL OR p.level = ANY(NEW.target_levels))
    AND (array_length(NEW.target_branches, 1) IS NULL OR p.branch IS NULL OR p.branch = ANY(NEW.target_branches));

  -- Refresh group announcement: delete old (matching tutor + title prefix) and re-insert
  IF OLD.target_group_id IS NOT NULL THEN
    DELETE FROM public.group_announcements
    WHERE group_id = OLD.target_group_id
      AND created_by = OLD.tutor_id
      AND (title LIKE '🏆%' || OLD.title OR title LIKE '📝%' || OLD.title);
  END IF;

  IF NEW.target_group_id IS NOT NULL THEN
    INSERT INTO public.group_announcements (group_id, title, body, created_by)
    VALUES (NEW.target_group_id, notif_title,
            COALESCE(NEW.description, '') ||
            CASE WHEN NEW.due_at IS NOT NULL
                 THEN E'\nآخر أجل: ' || to_char(NEW.due_at, 'YYYY-MM-DD HH24:MI')
                 ELSE '' END,
            NEW.tutor_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_assignment_notifications ON public.assignments;
CREATE TRIGGER trg_refresh_assignment_notifications
AFTER UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.refresh_assignment_notifications();

-- Cleanup on delete: remove related notifications and group announcements
CREATE OR REPLACE FUNCTION public.cleanup_assignment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.notifications WHERE related_id = OLD.id::text AND type IN ('new_assignment','new_challenge');
  IF OLD.target_group_id IS NOT NULL THEN
    DELETE FROM public.group_announcements
    WHERE group_id = OLD.target_group_id
      AND created_by = OLD.tutor_id
      AND (title LIKE '🏆%' || OLD.title OR title LIKE '📝%' || OLD.title);
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_assignment_notifications ON public.assignments;
CREATE TRIGGER trg_cleanup_assignment_notifications
BEFORE DELETE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.cleanup_assignment_notifications();

-- Ensure insert trigger exists too
DROP TRIGGER IF EXISTS trg_notify_on_assignment ON public.assignments;
CREATE TRIGGER trg_notify_on_assignment
AFTER INSERT ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment();
