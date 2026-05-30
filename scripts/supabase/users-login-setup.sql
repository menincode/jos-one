-- Full login setup for public.users (project nhylonitunfqjovlamzu).
-- Run once in Supabase Dashboard → SQL Editor.

-- 1) RPC login (preferred)
CREATE OR REPLACE FUNCTION public.login(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u public.users%ROWTYPE;
BEGIN
  SELECT * INTO u
  FROM public.users
  WHERE username = p_username
    AND password = p_password;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT u.status THEN
    RAISE EXCEPTION 'account_disabled' USING ERRCODE = 'P0001';
  END IF;

  RETURN json_build_object(
    'id', u.id,
    'username', u.username,
    'role', u.role,
    'status', u.status,
    'notes', u.notes,
    'created_at', u.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login(text, text) TO anon, authenticated;

-- 2) Fallback: allow filtered SELECT for active users (dev / when RPC unavailable)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_active" ON public.users;
CREATE POLICY "users_select_active"
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (status = true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
