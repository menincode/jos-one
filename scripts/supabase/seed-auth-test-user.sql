-- Run in Supabase Dashboard: SQL Editor (project nhylonitunfqjovlamzu)
-- Fixes "Database error querying schema" on login when token columns are NULL.
-- See: https://github.com/supabase/auth/issues/1940

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id uuid := 'a1111111-1111-4111-8111-111111111111';
  user_email text := 'dev.jos.desktop@gmail.com';
BEGIN
  DELETE FROM auth.identities WHERE user_id = new_user_id;
  DELETE FROM auth.users WHERE id = new_user_id;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt('DevTest123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"JOS Dev Test"}',
    FALSE,
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
    'email',
    user_email,
    NOW(),
    NOW(),
    NOW()
  );
END $$;
