
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  serial_number TEXT UNIQUE NOT NULL,
  photo_url TEXT,
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  password TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read groups" ON public.groups FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Creator can update group" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read announcements" ON public.announcements FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (true);

-- Site visits
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  visitor_hash text
);
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read visits" ON public.site_visits FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT TO public WITH CHECK (true);

-- Group join requests
CREATE TABLE public.group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  surname text NOT NULL,
  date_of_birth text NOT NULL,
  class text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read join requests" ON public.group_join_requests FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert join requests" ON public.group_join_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated can update join requests" ON public.group_join_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete join requests" ON public.group_join_requests FOR DELETE TO authenticated USING (true);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  related_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Direct messages
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own DMs" ON public.direct_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Authenticated can send DMs" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own received DMs" ON public.direct_messages FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);

-- Daily schedules
CREATE TABLE public.daily_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read schedules" ON public.daily_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert schedules" ON public.daily_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner can update schedules" ON public.daily_schedules FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete schedules" ON public.daily_schedules FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
CREATE POLICY "Anyone can read chat media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat-media');
CREATE POLICY "Users can delete own chat media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
