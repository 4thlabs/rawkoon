import { describe, expect, it } from "vitest";
import { formatBytes } from "./bookDetailFormat";

describe("formatBytes", () => {
  it("returns a dash for empty or zero values", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes("0")).toBe("—");
    expect(formatBytes("abc")).toBe("—");
  });

  it("scales between MB and GB", () => {
    expect(formatBytes(String(5 * 1_048_576))).toBe("5.0 MB");
    expect(formatBytes(String(50 * 1_048_576))).toBe("50 MB");
    expect(formatBytes(String(2 * 1024 * 1_048_576))).toBe("2.0 GB");
  });
});
