import { describe, expect, it } from "vitest";
import type { BookEdition } from "@rawkoon/shared";
import { stepsFor } from "./acquisitionSteps";

const edition = (over: Partial<BookEdition>) =>
  ({
    last_grabbed_at: null,
    status: "wanted",
    file_count: 0,
    ...over,
  }) as BookEdition;

describe("stepsFor", () => {
  it("marks wanted as active before any grab", () => {
    const s = stepsFor(edition({}));
    expect(s.map((x) => x.reached)).toEqual([true, false, false]);
    expect(s[0].active).toBe(true);
  });

  it("marks grabbed as active while downloading", () => {
    const s = stepsFor(edition({ status: "downloading" }));
    expect(s.map((x) => x.active)).toEqual([false, true, false]);
  });

  it("marks imported once files exist", () => {
    const s = stepsFor(edition({ file_count: 2, status: "downloaded" }));
    expect(s.map((x) => x.reached)).toEqual([true, true, true]);
    expect(s.map((x) => x.active)).toEqual([false, false, true]);
  });
});
