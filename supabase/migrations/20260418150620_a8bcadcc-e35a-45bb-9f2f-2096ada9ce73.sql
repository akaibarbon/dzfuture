-- Attach trigger to auto-generate group serial_number on insert
DROP TRIGGER IF EXISTS trg_generate_group_serial ON public.groups;
CREATE TRIGGER trg_generate_group_serial
BEFORE INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.generate_group_serial();

-- Backfill any existing groups without serial_number
UPDATE public.groups
SET serial_number = 'GRP-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE serial_number IS NULL;

-- Ensure realtime works for groups, messages, group_announcements, group_join_requests
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_announcements REPLICA IDENTITY FULL;
ALTER TABLE public.group_join_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_announcements;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;