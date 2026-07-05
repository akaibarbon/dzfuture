
CREATE TABLE public.teach_technics_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teach_technics_favorites TO authenticated;
GRANT ALL ON public.teach_technics_favorites TO service_role;
ALTER TABLE public.teach_technics_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own tt favorites"
  ON public.teach_technics_favorites FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX teach_technics_favorites_user_idx ON public.teach_technics_favorites(user_id);
