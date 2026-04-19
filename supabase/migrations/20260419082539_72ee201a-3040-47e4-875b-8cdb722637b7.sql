
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai messages" ON public.ai_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai messages" ON public.ai_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ai messages" ON public.ai_messages FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_ai_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.ai_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_touch_ai_conv AFTER INSERT ON public.ai_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_ai_conversation();

INSERT INTO storage.buckets (id, name, public) VALUES ('ai-files', 'ai-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read ai-files" ON storage.objects FOR SELECT USING (bucket_id = 'ai-files');
CREATE POLICY "Users upload own ai-files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own ai-files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own ai-files" ON storage.objects FOR DELETE
  USING (bucket_id = 'ai-files' AND auth.uid()::text = (storage.foldername(name))[1]);
