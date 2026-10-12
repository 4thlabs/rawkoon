import { describe, expect, it } from "vitest";
import { statusClass } from "./hookStatusClass";

describe("statusClass", () => {
  it("styles active as green", () => {
    expect(statusClass("active")).toContain("bg-green-900/20");
  });

  it("styles foreign-program with the stronger amber border", () => {
    expect(statusClass("foreign-program")).toContain("border-amber-700");
  });

  it("shares one style between stale and awaiting-first", () => {
    expect(statusClass("stale")).toBe(statusClass("awaiting-first"));
    expect(statusClass("stale")).toContain("border-amber-800");
  });

  it("falls back to neutral for other statuses", () => {
    expect(statusClass("not-configured")).toContain("bg-neutral-900/60");
  });
});
