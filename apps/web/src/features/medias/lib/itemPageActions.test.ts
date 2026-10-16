import { describe, expect, it } from "vitest";
import {
  defaultItemTab,
  headerActionKind,
  parseItemTab,
  statusLineParts,
} from "./itemPageActions";

describe("parseItemTab", () => {
  it("accepts the old search value as releases", () => {
    expect(parseItemTab("search")).toBe("releases");
    expect(parseItemTab("releases")).toBe("releases");
    expect(parseItemTab("management")).toBe("management");
  });

  it("drops anything it does not know", () => {
    expect(parseItemTab("nope")).toBeUndefined();
    expect(parseItemTab(3)).toBeUndefined();
  });
});

describe("defaultItemTab", () => {
  it("opens a missing item on its releases, for admins only", () => {
    expect(
      defaultItemTab({
        isAdmin: true,
        status: "wanted",
        focusedEpisode: false,
      }),
    ).toBe("releases");
    expect(
      defaultItemTab({
        isAdmin: false,
        status: "wanted",
        focusedEpisode: false,
      }),
    ).toBe("info");
  });

  it("opens every other status on Info", () => {
    for (const status of ["downloaded", "downloading", "returning"] as const)
      expect(
        defaultItemTab({ isAdmin: true, status, focusedEpisode: false }),
      ).toBe("info");
  });

  it("keeps a season or episode link on Management", () => {
    expect(
      defaultItemTab({ isAdmin: true, status: "wanted", focusedEpisode: true }),
    ).toBe("management");
  });
});

describe("headerActionKind", () => {
  it("follows the status for admins", () => {
    expect(headerActionKind("wanted", true)).toBe("missing");
    expect(headerActionKind("downloading", true)).toBe("downloading");
    expect(headerActionKind("upgrading", true)).toBe("downloading");
    expect(headerActionKind("downloaded", true)).toBe("downloaded");
    expect(headerActionKind("returning", true)).toBeNull();
  });

  it("adds nothing for non-admins", () => {
    expect(headerActionKind("wanted", false)).toBeNull();
    expect(headerActionKind("downloaded", false)).toBeNull();
  });
});

describe("statusLineParts", () => {
  const t = ((key: string, opts?: Record<string, unknown>) =>
    opts ? `${key}:${Object.values(opts).join(",")}` : key) as never;

  it("joins profile, last search and outcome", () => {
    const parts = statusLineParts(
      {
        quality_profile: { id: 1, name: "HD 1080p" },
        last_search_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        last_search_outcome: "no_match",
      },
      t,
      "en",
    );
    expect(parts).toEqual([
      "library.statusLine.profile:HD 1080p",
      "library.statusLine.lastSearched:2 hours ago",
      "library.statusLine.outcome.no_match",
    ]);
  });

  it("omits what is unknown", () => {
    expect(
      statusLineParts(
        {
          quality_profile: null,
          last_search_at: null,
          last_search_outcome: null,
        },
        t,
        "en",
      ),
    ).toEqual([]);
  });
});
