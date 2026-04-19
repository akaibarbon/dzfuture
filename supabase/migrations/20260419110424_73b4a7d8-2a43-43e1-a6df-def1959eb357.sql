
-- 1. Add level fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT;

-- 2. Add level field to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS level TEXT;

-- 3. Add level field to announcements
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS level TEXT;

-- 4. Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  tutor_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  branch TEXT,
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lessons"
  ON public.lessons FOR SELECT USING (true);

CREATE POLICY "Tutors can insert own lessons"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update own lessons"
  ON public.lessons FOR UPDATE TO authenticated
  USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete own lessons"
  ON public.lessons FOR DELETE TO authenticated
  USING (auth.uid() = tutor_id);

-- 5. favorite_tutors table
CREATE TABLE IF NOT EXISTS public.favorite_tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  tutor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, tutor_id)
);

ALTER TABLE public.favorite_tutors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own favorites"
  ON public.favorite_tutors FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students insert own favorites"
  ON public.favorite_tutors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students delete own favorites"
  ON public.favorite_tutors FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Tutors see who favorited them"
  ON public.favorite_tutors FOR SELECT TO authenticated
  USING (auth.uid() = tutor_id);

-- 6. Storage bucket for lessons
INSERT INTO storage.buckets (id, name, public)
VALUES ('lessons', 'lessons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read lesson files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lessons');

CREATE POLICY "Authenticated can upload lesson files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lessons');

CREATE POLICY "Owner can delete lesson files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lessons' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Trigger: notify favorite students when their tutor publishes a new lesson
CREATE OR REPLACE FUNCTION public.notify_favorites_on_lesson()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, related_id)
  SELECT ft.student_id, 'new_lesson',
         'درس جديد من ' || NEW.tutor_name,
         NEW.title || ' — ' || NEW.subject,
         NEW.id::text
  FROM public.favorite_tutors ft
  WHERE ft.tutor_id = NEW.tutor_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS lesson_notify_favorites ON public.lessons;
CREATE TRIGGER lesson_notify_favorites
AFTER INSERT ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.notify_favorites_on_lesson();

-- 8. Trigger to keep updated_at fresh on lessons
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS lessons_touch_updated_at ON public.lessons;
CREATE TRIGGER lessons_touch_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
