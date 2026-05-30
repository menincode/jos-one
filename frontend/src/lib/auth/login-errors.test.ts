import { describe, expect, it } from "vitest";

import { formatLoginApiMessage } from "@/lib/auth/login-errors";

describe("formatLoginApiMessage", () => {
  it("maps invalid credentials", () => {
    expect(formatLoginApiMessage("invalid credentials")).toBe(
      "Username or password is incorrect.",
    );
  });

  it("passes through server errors", () => {
    expect(formatLoginApiMessage("Server error: something broke")).toBe(
      "Server error: something broke",
    );
  });
});
