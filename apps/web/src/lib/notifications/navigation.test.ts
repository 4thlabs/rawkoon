import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("@/router", () => ({ router: { navigate } }));

import { openNotificationTarget } from "./navigation";

describe("openNotificationTarget", () => {
  const assign = vi.fn();
  const original = window.location;

  beforeEach(() => {
    navigate.mockReset().mockResolvedValue(undefined);
    assign.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://app.test", assign },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });

  it("routes a relative path in-app, keeping search and hash", async () => {
    openNotificationTarget("/library/5?tab=management#ep");
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        href: "/library/5?tab=management#ep",
      }),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("routes a same-origin absolute URL as a path", async () => {
    openNotificationTarget("https://app.test/library/4?x=1#top");
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ href: "/library/4?x=1#top" }),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("does a full navigation for an external URL", () => {
    openNotificationTarget("https://example.com/x");
    expect(assign).toHaveBeenCalledWith("https://example.com/x");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("falls back to a full navigation when the router fails", async () => {
    navigate.mockRejectedValueOnce(new Error("boom"));
    openNotificationTarget("/library/5");
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/library/5"));
  });
});
