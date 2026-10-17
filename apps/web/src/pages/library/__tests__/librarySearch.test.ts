import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/routing/prefetch", () => ({ prefetchRouteData: vi.fn() }));
vi.mock("@/pages/medias/_component/LibraryPage", () => ({
  LibraryPage: () => null,
}));

import { Route } from "../index";

const validate = (search: Record<string, unknown>) =>
  (
    Route.options.validateSearch as (
      s: Record<string, unknown>,
    ) => Record<string, unknown>
  )(search);

describe("/library search params", () => {
  it("keeps valid filter, sort and view values", () => {
    expect(
      validate({
        type: "show",
        status: "skipped",
        language: "fr",
        sortBy: "title",
        sortDir: "asc",
        view: "list",
      }),
    ).toMatchObject({
      type: "show",
      status: "skipped",
      language: "fr",
      sortBy: "title",
      sortDir: "asc",
      view: "list",
    });
  });

  it("drops unknown values so the defaults apply", () => {
    expect(
      validate({
        type: "anime",
        status: "archived",
        sortBy: "rating",
        sortDir: "up",
        view: "table",
        language: "",
      }),
    ).toMatchObject({
      type: undefined,
      status: undefined,
      sortBy: undefined,
      sortDir: undefined,
      view: undefined,
      language: undefined,
    });
  });
});
