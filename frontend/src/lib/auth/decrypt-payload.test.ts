import { describe, expect, it } from "vitest";

import { decryptAuthPayload, parseEncryptedAuthPayload } from "@/lib/auth/decrypt-payload";

describe("decryptAuthPayload", () => {
  it("decrypts Google Apps Script auth payloads", () => {
    const plain = JSON.stringify({
      id: 1,
      username: "demo",
      scopes: ["video_editor:write"],
    });
    const hexParts = Array.from(plain, (char) => char.charCodeAt(0).toString(16));
    const encoded = btoa(hexParts.join("-"));

    expect(decryptAuthPayload(encoded)).toBe(plain);
    expect(parseEncryptedAuthPayload(encoded)).toEqual({
      id: 1,
      username: "demo",
      scopes: ["video_editor:write"],
    });
  });

  it("returns objects unchanged", () => {
    const payload = { username: "demo", scopes: [] };
    expect(parseEncryptedAuthPayload(payload)).toEqual(payload);
  });
});
