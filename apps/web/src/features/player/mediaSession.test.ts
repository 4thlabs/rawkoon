import { afterEach, describe, expect, it, vi } from "vitest";
import { clearMediaSession } from "./mediaSession";

describe("clearMediaSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is a no-op when the browser has no media session", () => {
    vi.stubGlobal("navigator", {});
    expect(() => clearMediaSession()).not.toThrow();
  });

  it("clears metadata and every action handler, tolerating rejections", () => {
    const setActionHandler = vi.fn((action: string) => {
      if (action === "seekbackward") throw new Error("unsupported");
    });
    const mediaSession = { metadata: {} as unknown, setActionHandler };
    vi.stubGlobal("navigator", { mediaSession });
    clearMediaSession();
    expect(mediaSession.metadata).toBeNull();
    expect(setActionHandler.mock.calls).toEqual([
      ["play", null],
      ["pause", null],
      ["seekbackward", null],
      ["seekforward", null],
      ["previoustrack", null],
      ["nexttrack", null],
    ]);
  });
});
