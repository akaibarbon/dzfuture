
CREATE TABLE public.teacher_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL,
  section_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('model3d','image','video','link','file','text')),
  title text NOT NULL,
  description text,
  url text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_content TO authenticated;
GRANT ALL ON public.teacher_content TO service_role;

ALTER TABLE public.teacher_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read teacher_content" ON public.teacher_content
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "approved tutors insert" ON public.teacher_content
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'tutor' AND COALESCE(p.approved, true) = true)
  );

CREATE POLICY "owners update" ON public.teacher_content
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.user_has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.user_has_role(auth.uid(), 'admin'));

CREATE POLICY "owners delete" ON public.teacher_content
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.user_has_role(auth.uid(), 'admin'));

CREATE INDEX teacher_content_lookup ON public.teacher_content (teacher_id, section_key, sort_order);

CREATE TRIGGER teacher_content_touch BEFORE UPDATE ON public.teacher_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
