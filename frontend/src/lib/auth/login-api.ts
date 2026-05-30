import { formatLoginError } from "@/lib/auth/login-errors";
import { signInWithUsernameHttp } from "@/lib/auth/login-http";
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
      return await client.login(username, password);
    }
    return await signInWithUsernameHttp(username, password);
  } catch (error) {
    throw new Error(formatLoginError(error));
  }
}
