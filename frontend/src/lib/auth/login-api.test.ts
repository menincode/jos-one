import { describe, expect, it, vi, afterEach } from "vitest";

import { signInWithUsernameHttp } from "@/lib/auth/login-http";

describe("signInWithUsernameHttp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a successful user payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            status: "success",
            user: {
              id: 1,
              username: "test",
              role: "admin",
              status: true,
              notes: null,
              created_at: "2026-01-01T00:00:00Z",
              scopes: ["video_editor:write", "remove_watermark:write"],
            },
          }),
      }),
    );

    const user = await signInWithUsernameHttp("test", "123456");
    expect(user).toEqual({
      id: 1,
      username: "test",
      role: "admin",
      status: true,
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      scopes: ["video_editor:write", "remove_watermark:write"],
    });
  });

  it("decrypts Google Apps Script auth payloads", async () => {
    const plain = JSON.stringify({
      id: 2,
      username: "gas-user",
      role: "Reup",
      scopes: ["remove_watermark:write"],
    });
    const encoded = btoa(
      Array.from(plain, (char) => char.charCodeAt(0).toString(16)).join("-"),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            statusCode: 200,
            status: "success",
            data: encoded,
          }),
      }),
    );

    const user = await signInWithUsernameHttp("gas-user", "secret");
    expect(user.username).toBe("gas-user");
    expect(user.role).toBe("Reup");
    expect(user.scopes).toEqual(["remove_watermark:write"]);
  });

  it("surfaces API error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            statusCode: 401,
            status: "error",
            message: "invalid credentials",
          }),
      }),
    );

    await expect(signInWithUsernameHttp("test", "wrong")).rejects.toThrow(
      "Username or password is incorrect.",
    );
  });
});
