import { formatLoginError } from "@/lib/auth/login-errors";
import { signInWithUsernameHttp } from "@/lib/auth/login-http";
import { parseScopes } from "@/lib/auth/scopes";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { isPywebviewShell } from "@/lib/pywebview/readiness";
import type { AppUser } from "@/types/app-user";

/** Authenticate via Python bridge (desktop) or HTTP fallback (browser-only dev). */
export async function signInWithUsername(
  username: string,
  password: string,
): Promise<AppUser> {
  try {
    if (isPywebviewShell()) {
      const client = await createBridgeClient();
      const user = await client.login(username, password);
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        notes: user.notes,
        created_at: user.created_at,
        scopes: parseScopes(user.scopes),
      };
    }
    return await signInWithUsernameHttp(username, password);
  } catch (error) {
    throw new Error(formatLoginError(error));
  }
}
