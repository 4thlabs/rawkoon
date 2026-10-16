import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { addToastMessage } from "./addToastMessage";

// Echo the key and params so the test checks which message is chosen, not its copy.
const t = ((key: string, params?: Record<string, string>) =>
  `${key}|${JSON.stringify(params)}`) as unknown as TFunction;

describe("addToastMessage", () => {
  it("says a search is running when one was queued", () => {
    expect(
      addToastMessage(
        t,
        "X",
        { search_queued: true, search_skipped_reason: null },
        "en",
      ),
    ).toBe('medias.addToast.searching|{"title":"X"}');
  });

  it("names the digital release day for an unreleased movie", () => {
    const msg = addToastMessage(
      t,
      "X",
      {
        search_queued: false,
        search_skipped_reason: "not_released",
        digital_release_date: "2031-03-04",
      },
      "en",
    );
    expect(msg).toContain("medias.addToast.notReleased|");
    expect(msg).toContain("Mar 4, 2031");
  });

  it("handles an unreleased movie with no known date", () => {
    expect(
      addToastMessage(
        t,
        "X",
        {
          search_queued: false,
          search_skipped_reason: "not_released",
          digital_release_date: null,
        },
        "en",
      ),
    ).toContain("medias.addToast.notReleasedNoDate");
  });

  it("is a plain added message when no search was involved", () => {
    for (const reason of ["setting_off", "override_off", null] as const) {
      expect(
        addToastMessage(
          t,
          "X",
          { search_queued: false, search_skipped_reason: reason },
          "en",
        ),
      ).toBe('medias.addSuccess|{"title":"X"}');
    }
  });
});
