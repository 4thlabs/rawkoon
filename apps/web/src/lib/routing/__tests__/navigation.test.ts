import { beforeEach, describe, expect, it } from "vitest";
import { resolveNavPath } from "@/lib/routing/navigation";
import { rememberFindMode } from "@/lib/routing/findMode";

describe("resolveNavPath", () => {
  beforeEach(() => sessionStorage.clear());

  it("points Find at Browse by default", () => {
    expect(resolveNavPath("/find")).toBe("/find");
  });

  it("points Find at Swipe once Swipe was the last mode, and back", () => {
    rememberFindMode("swipe");
    expect(resolveNavPath("/find")).toBe("/find/swipe");
    rememberFindMode("browse");
    expect(resolveNavPath("/find")).toBe("/find");
  });

  it("leaves other entries alone", () => {
    rememberFindMode("swipe");
    expect(resolveNavPath("/library")).toBe("/library");
  });
});
