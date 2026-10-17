import { describe, expect, it } from "vitest";
import { inlineActionFor } from "@/lib/notifications/notificationActions";

describe("inlineActionFor", () => {
  it("offers Search again for a movie-level search that gave up", () => {
    expect(
      inlineActionFor(
        { type: "library_grab_skipped", url: "/library/7?tab=files" },
        true,
      ),
    ).toEqual({ kind: "searchAgain", mediaId: 7, season: null, episode: null });
  });

  it("carries the season and episode of a narrower search", () => {
    expect(
      inlineActionFor(
        {
          type: "library_grab_skipped",
          url: "/library/7?tab=files&season=2&episode=5",
        },
        true,
      ),
    ).toEqual({ kind: "searchAgain", mediaId: 7, season: 2, episode: 5 });
  });

  it("offers Review on a pending request", () => {
    expect(
      inlineActionFor(
        { type: "request_pending", url: "/activity/requests" },
        true,
      ),
    ).toEqual({ kind: "reviewRequest" });
  });

  it("offers nothing to non-admins or for other types", () => {
    expect(
      inlineActionFor({ type: "request_pending", url: null }, false),
    ).toBeNull();
    expect(
      inlineActionFor(
        { type: "library_media_downloaded", url: "/library/7" },
        true,
      ),
    ).toBeNull();
    expect(
      inlineActionFor(
        { type: "library_grab_skipped", url: "/somewhere" },
        true,
      ),
    ).toBeNull();
  });
});
