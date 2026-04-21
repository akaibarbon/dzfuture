ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true;
-- Tutors need explicit approval, students auto-approved
UPDATE public.profiles SET approved = false WHERE role = 'tutor' AND approved IS NOT FALSE;
UPDATE public.profiles SET approved = true WHERE role <> 'tutor';