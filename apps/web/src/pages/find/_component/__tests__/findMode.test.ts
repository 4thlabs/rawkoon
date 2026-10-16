import { beforeEach, describe, expect, it } from "vitest";
import { readFindMode, rememberFindMode } from "../findMode";

describe("findMode", () => {
  beforeEach(() => sessionStorage.clear());

  it("defaults to browse", () => {
    expect(readFindMode()).toBe("browse");
  });

  it("remembers swipe for the session and switches back", () => {
    rememberFindMode("swipe");
    expect(readFindMode()).toBe("swipe");
    rememberFindMode("browse");
    expect(readFindMode()).toBe("browse");
  });
});
