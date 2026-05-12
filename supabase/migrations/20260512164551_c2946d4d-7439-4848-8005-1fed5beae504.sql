
-- Assignments & Challenges table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL,
  tutor_name text NOT NULL,
  kind text NOT NULL DEFAULT 'homework', -- 'homework' | 'challenge'
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject text,
  file_url text,
  file_type text,
  due_at timestamptz,
  target_levels text[] NOT NULL DEFAULT '{}',
  target_branches text[] NOT NULL DEFAULT '{}',
  target_group_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read assignments"
  ON public.assignments FOR SELECT USING (true);

CREATE POLICY "Tutors insert own assignments"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors update own assignments"
  ON public.assignments FOR UPDATE TO authenticated
  USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors delete own assignments"
  ON public.assignments FOR DELETE TO authenticated
  USING (auth.uid() = tutor_id);

CREATE INDEX idx_assignments_created ON public.assignments(created_at DESC);
CREATE INDEX idx_assignments_kind ON public.assignments(kind);

-- Notify matching students + post into target group on insert
CREATE OR REPLACE FUNCTION public.notify_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_title text;
  notif_type text;
BEGIN
  IF NEW.kind = 'challenge' THEN
    notif_title := '🏆 تحدي جديد: ' || NEW.title;
    notif_type := 'new_challenge';
  ELSE
    notif_title := '📝 واجب جديد: ' || NEW.title;
    notif_type := 'new_assignment';
  END IF;

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
    AND (
      array_length(NEW.target_levels, 1) IS NULL
      OR p.level = ANY(NEW.target_levels)
    )
    AND (
      array_length(NEW.target_branches, 1) IS NULL
      OR p.branch IS NULL
      OR p.branch = ANY(NEW.target_branches)
    );

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

CREATE TRIGGER trg_notify_on_assignment
AFTER INSERT ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment();
