import { getAuthApiUrl } from "@/lib/auth/config";
import { parseEncryptedAuthPayload } from "@/lib/auth/decrypt-payload";
import { formatLoginApiMessage, formatLoginError } from "@/lib/auth/login-errors";
import { parseScopes } from "@/lib/auth/scopes";
import type { AppUser } from "@/types/app-user";

interface LoginPayload {
  username: string;
  password: string;
}

function mapRow(row: Record<string, unknown>, fallbackUsername: string): AppUser {
  const rawUsername = row.username != null ? String(row.username).trim() : "";
  const username = rawUsername || fallbackUsername;
  const rawRole = row.role == null ? "" : String(row.role).trim();
  return {
    id: row.id != null ? Number(row.id) : 0,
    username,
    role: rawRole || null,
    status: row.status == null ? true : Boolean(row.status),
    notes: row.notes == null ? null : String(row.notes),
    created_at:
      row.created_at != null ? String(row.created_at) : new Date().toISOString(),
    scopes: parseScopes(row.scopes),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiErrorEnvelope(data: Record<string, unknown>): boolean {
  if (data.status === "error") {
    return true;
  }
  const statusCode = data.statusCode;
  return typeof statusCode === "number" && statusCode >= 400;
}

function extractUserPayload(data: Record<string, unknown>): Record<string, unknown> | null {
  if (isApiErrorEnvelope(data)) {
    return null;
  }

  const nested = data.user ?? data.data ?? data.result;
  const decrypted = parseEncryptedAuthPayload(nested);
  if (decrypted) {
    return decrypted;
  }

  if (isRecord(nested)) {
    return nested;
  }

  if (data.username != null || data.id != null) {
    return data;
  }

  if (data.success === true || data.status === "success" || data.statusCode === 200) {
    return { username: String(data.username ?? "") };
  }

  return null;
}

function parseLoginResponse(data: unknown, username: string): AppUser {
  if (!isRecord(data)) {
    throw new Error("Invalid response from auth API.");
  }

  if (isApiErrorEnvelope(data)) {
    const message =
      typeof data.message === "string" ? data.message : "Sign in failed.";
    throw new Error(formatLoginApiMessage(message));
  }

  const row = extractUserPayload(data);
  if (!row) {
    throw new Error("Sign in failed. Unexpected response from auth API.");
  }

  return mapRow(row, username);
}

/** Browser-only fallback: POST auth API from the frontend (make local). */
export async function signInWithUsernameHttp(
  username: string,
  password: string,
): Promise<AppUser> {
  const trimmed = username.trim();
  if (!trimmed || !password) {
    throw new Error("Enter username and password.");
  }

  const body: LoginPayload = { username: trimmed, password };

  try {
    const response = await fetch(getAuthApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      throw new Error(
        response.ok
          ? "Invalid response from auth API."
          : `Sign in failed (${response.status}).`,
      );
    }

    if (!response.ok && isRecord(data) && isApiErrorEnvelope(data)) {
      const message =
        typeof data.message === "string" ? data.message : `Sign in failed (${response.status}).`;
      throw new Error(formatLoginApiMessage(message));
    }

    if (!response.ok) {
      throw new Error(`Sign in failed (${response.status}).`);
    }

    return parseLoginResponse(data, trimmed);
  } catch (error) {
    throw new Error(formatLoginError(error));
  }
}
