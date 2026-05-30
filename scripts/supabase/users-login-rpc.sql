-- Login against public.users (username / password / status).
-- Run in Supabase SQL Editor (project nhylonitunfqjovlamzu).

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

-- Optional: allow direct table login in dev (less secure; prefer RPC above).
-- CREATE POLICY "users_select_login" ON public.users FOR SELECT TO anon USING (true);
