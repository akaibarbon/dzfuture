
CREATE OR REPLACE FUNCTION public.list_public_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  nickname text,
  photo_url text,
  role text,
  level text,
  branch text,
  xp integer,
  streak_days integer,
  approved boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, full_name, nickname, photo_url, role, level, branch,
         COALESCE(xp, 0), COALESCE(streak_days, 0), COALESCE(approved, true), created_at
  FROM public.profiles
  WHERE user_id IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.list_public_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_public_profiles() TO authenticated;
