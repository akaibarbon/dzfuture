
-- 1. Add new columns to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS serial_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS background_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Generate serial numbers for existing groups
UPDATE public.groups
SET serial_number = 'GRP-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE serial_number IS NULL;

-- Auto-generate serial_number for new groups
CREATE OR REPLACE FUNCTION public.generate_group_serial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := 'GRP-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_group_serial ON public.groups;
CREATE TRIGGER trg_generate_group_serial
  BEFORE INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.generate_group_serial();

-- Allow group creator to delete their groups
CREATE POLICY "Creator can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 2. Messages: edit + delete support
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Helper: is user the creator of a group?
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND created_by = _user_id
  );
$$;

-- Sender can update own messages, owner can update any in their group
CREATE POLICY "Sender or owner can update messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR public.is_group_owner(group_id, auth.uid()));

-- Sender or owner can delete (we use soft delete via update, but allow hard delete for owner)
CREATE POLICY "Sender or owner can delete messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR public.is_group_owner(group_id, auth.uid()));

-- 3. Group announcements (إشعارات داخل المجموعة)
CREATE TABLE IF NOT EXISTS public.group_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read group announcements"
  ON public.group_announcements FOR SELECT TO public USING (true);

CREATE POLICY "Owner can insert group announcements"
  ON public.group_announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "Owner can delete group announcements"
  ON public.group_announcements FOR DELETE TO authenticated
  USING (public.is_group_owner(group_id, auth.uid()));

-- 4. Tighten join requests: only owner can update/delete
DROP POLICY IF EXISTS "Authenticated can update join requests" ON public.group_join_requests;
DROP POLICY IF EXISTS "Authenticated can delete join requests" ON public.group_join_requests;

CREATE POLICY "Owner can update join requests"
  ON public.group_join_requests FOR UPDATE TO authenticated
  USING (public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "Owner or requester can delete join requests"
  ON public.group_join_requests FOR DELETE TO authenticated
  USING (public.is_group_owner(group_id, auth.uid()) OR auth.uid() = user_id);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_announcements;
