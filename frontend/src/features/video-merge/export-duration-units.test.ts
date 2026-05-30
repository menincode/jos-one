import { describe, expect, it } from "vitest";

import {
  DEFAULT_DURATION_MAX_SEC,
  DEFAULT_DURATION_MIN_SEC,
  minutesInputValueToSeconds,
  secondsToMinutesInputValue,
} from "@/features/video-merge/export-duration-units";
import { DEFAULT_EXPORT_SETTINGS } from "@/features/video-merge/video-merge-export-types";

describe("export-duration-units", () => {
  it("defaults to 60 and 90 minutes in storage", () => {
    expect(DEFAULT_DURATION_MIN_SEC).toBe("3600");
    expect(DEFAULT_DURATION_MAX_SEC).toBe("5400");
    expect(DEFAULT_EXPORT_SETTINGS.durationMinSec).toBe(DEFAULT_DURATION_MIN_SEC);
    expect(DEFAULT_EXPORT_SETTINGS.durationMaxSec).toBe(DEFAULT_DURATION_MAX_SEC);
    expect(secondsToMinutesInputValue(DEFAULT_EXPORT_SETTINGS.durationMinSec)).toBe(
      "60",
    );
    expect(secondsToMinutesInputValue(DEFAULT_EXPORT_SETTINGS.durationMaxSec)).toBe(
      "90",
    );
  });

  it("converts seconds to minutes for display", () => {
    expect(secondsToMinutesInputValue("60")).toBe("1");
    expect(secondsToMinutesInputValue("90")).toBe("1.5");
    expect(secondsToMinutesInputValue("3600")).toBe("60");
    expect(secondsToMinutesInputValue("7200")).toBe("120");
  });

  it("converts minutes input back to seconds for storage", () => {
    expect(minutesInputValueToSeconds("1")).toBe("60");
    expect(minutesInputValueToSeconds("1.5")).toBe("90");
    expect(minutesInputValueToSeconds("60")).toBe("3600");
    expect(minutesInputValueToSeconds("120")).toBe("7200");
  });

  it("round-trips common values", () => {
    for (const sec of ["60", "90", "3600", "7200"]) {
      const min = secondsToMinutesInputValue(sec);
      expect(minutesInputValueToSeconds(min)).toBe(sec);
    }
  });
});
