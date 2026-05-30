# Supabase login (`public.users`)

Login uses the **`public.users`** table (not Supabase Auth).

## Test account (from your table)

| Field | Value |
|-------|--------|
| Username | `test` |
| Password | `123456` |
| Status | must be `true` |

## One-time: enable login on the database

Run in **SQL Editor**:

[`scripts/supabase/users-login-setup.sql`](../scripts/supabase/users-login-setup.sql)

This creates `public.login(username, password)` so the app can authenticate without exposing all rows to the anon key.

If you skip this script, login only works when RLS allows `anon` to `SELECT` matching rows on `users`.

## Verify

```powershell
powershell -File scripts/supabase/check-users-login.ps1
```

Or sign in in the app: `make dev` → username `test` / password `123456`.

## `.env`

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable key)
