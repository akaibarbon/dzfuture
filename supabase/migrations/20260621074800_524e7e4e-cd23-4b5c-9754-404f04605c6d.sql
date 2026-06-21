
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  student_name text,
  content text,
  file_url text,
  file_type text,
  status text NOT NULL DEFAULT 'submitted',
  grade numeric,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  UNIQUE(assignment_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Students manage their own submissions
CREATE POLICY "Students can view their own submissions"
  ON public.assignment_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND a.tutor_id = auth.uid()));

CREATE POLICY "Students can insert their own submissions"
  ON public.assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own submissions before grading, tutors can grade"
  ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND a.tutor_id = auth.uid()))
  WITH CHECK (student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND a.tutor_id = auth.uid()));

CREATE POLICY "Students can delete their own submissions"
  ON public.assignment_submissions FOR DELETE TO authenticated
  USING (student_id = auth.uid());

CREATE INDEX idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON public.assignment_submissions(student_id);

-- Notify tutor when a student submits
CREATE OR REPLACE FUNCTION public.notify_tutor_on_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_record record;
BEGIN
  SELECT title, kind, tutor_id INTO a_record FROM public.assignments WHERE id = NEW.assignment_id;
  IF a_record.tutor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (a_record.tutor_id, 'submission',
      '📥 تسليم جديد: ' || COALESCE(a_record.title, ''),
      COALESCE(NEW.student_name, 'تلميذ') || ' سلّم ' || CASE WHEN a_record.kind = 'challenge' THEN 'التحدي' ELSE 'الواجب' END,
      NEW.assignment_id::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_tutor_on_submission
  AFTER INSERT ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_tutor_on_submission();

-- Notify student when graded
CREATE OR REPLACE FUNCTION public.notify_student_on_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_title text;
BEGIN
  IF NEW.grade IS DISTINCT FROM OLD.grade OR NEW.feedback IS DISTINCT FROM OLD.feedback THEN
    SELECT title INTO a_title FROM public.assignments WHERE id = NEW.assignment_id;
    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (NEW.student_id, 'grade',
      '🎯 تم تصحيح: ' || COALESCE(a_title, ''),
      CASE WHEN NEW.grade IS NOT NULL THEN 'العلامة: ' || NEW.grade ELSE 'تم إضافة ملاحظات' END,
      NEW.assignment_id::text);
    NEW.graded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_on_grade
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_grade();
