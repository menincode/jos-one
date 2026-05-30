import { describe, expect, it } from "vitest";

import {
  APP_SCOPES,
  getDefaultAppPath,
  hasScope,
  isNavItemVisible,
  parseScopes,
} from "@/lib/auth/scopes";
import type { AppUser } from "@/types/app-user";

const baseUser: AppUser = {
  id: 1,
  username: "demo",
  role: null,
  status: true,
  notes: null,
  created_at: "2026-01-01T00:00:00Z",
  scopes: [APP_SCOPES.VIDEO_EDITOR_WRITE, APP_SCOPES.REMOVE_WATERMARK_WRITE],
};

describe("parseScopes", () => {
  it("parses comma-separated scopes", () => {
    expect(parseScopes("video_editor:write, remove_watermark:write")).toEqual([
      "video_editor:write",
      "remove_watermark:write",
    ]);
  });

  it("returns empty list for missing values", () => {
    expect(parseScopes(null)).toEqual([]);
    expect(parseScopes("")).toEqual([]);
  });
});

describe("hasScope", () => {
  it("checks assigned scopes", () => {
    expect(hasScope(baseUser, APP_SCOPES.VIDEO_EDITOR_WRITE)).toBe(true);
    expect(hasScope(baseUser, APP_SCOPES.REMOVE_WATERMARK_WRITE)).toBe(true);
  });

  it("denies missing scopes", () => {
    expect(hasScope({ ...baseUser, scopes: [] }, APP_SCOPES.VIDEO_EDITOR_WRITE)).toBe(
      false,
    );
  });
});

describe("getDefaultAppPath", () => {
  it("prefers video merge when available", () => {
    expect(getDefaultAppPath(baseUser)).toBe("/");
  });

  it("falls back to watermark or no-access", () => {
    expect(
      getDefaultAppPath({ ...baseUser, scopes: [APP_SCOPES.REMOVE_WATERMARK_WRITE] }),
    ).toBe("/watermark");
    expect(getDefaultAppPath({ ...baseUser, scopes: [] })).toBe("/no-access");
  });
});

describe("isNavItemVisible", () => {
  it("hides scoped nav items without permission", () => {
    expect(
      isNavItemVisible(
        { requiredScope: APP_SCOPES.VIDEO_EDITOR_WRITE },
        { ...baseUser, scopes: [APP_SCOPES.REMOVE_WATERMARK_WRITE] },
      ),
    ).toBe(false);
  });
});
