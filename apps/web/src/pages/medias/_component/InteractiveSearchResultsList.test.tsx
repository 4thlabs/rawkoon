import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InteractiveSearchResultsList } from "./InteractiveSearchResultsList";
import type { InteractiveReleaseItem } from "@rawkoon/shared/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    i18n: { language: "en" },
  }),
}));

function release(
  title: string,
  extra: Partial<InteractiveReleaseItem> = {},
): InteractiveReleaseItem {
  return {
    guid: title,
    title,
    indexer: "idx",
    indexer_id: 1,
    languages: [],
    protocol: "torrent",
    size_bytes: 1e9,
    age: 1,
    seeders: 5,
    leechers: 1,
    rejected: false,
    rejection_reason: null,
    info_url: null,
    source: "jackett",
    download_url: "magnet:?xt=1",
    ...extra,
  };
}

const fallback = (title: string, tag: string) =>
  release(title, {
    rejected: true,
    language_fallback: true,
    language_fallback_tag: tag,
  });

function renderList(
  releases: InteractiveReleaseItem[],
  summary: { missing: string[]; counts: Record<string, number> } | null,
) {
  return render(
    <InteractiveSearchResultsList
      releases={releases}
      isLoading={false}
      needsSearchQuery={false}
      errorMessage={null}
      grabBusy={false}
      pendingReleaseKey={null}
      grabbedTitles={new Set()}
      onDownload={vi.fn()}
      onRefetch={vi.fn()}
      totalReleases={releases.length}
      isError={false}
      onResetView={vi.fn()}
      languageFallbackSummary={summary}
    />,
  );
}

describe("InteractiveSearchResultsList language fallback", () => {
  it("leads with the banner and an expanded group when no preferred release exists", () => {
    renderList([fallback("Film VFF A", "VFF"), fallback("Film VFF B", "VFF")], {
      missing: ["VFQ", "VF2"],
      counts: { VFF: 2 },
    });
    expect(screen.getByRole("status").textContent).toContain(
      "medias.interactive.languageFallback.bannerTitle",
    );
    expect(screen.getByRole("status").textContent).toContain("VFF (2)");
    expect(screen.getByText("Film VFF A")).toBeTruthy();
    expect(screen.getAllByText("medias.interactive.download")).toHaveLength(2);
  });

  it("collapses the group to one row when a preferred release exists", () => {
    renderList([release("Film VFQ"), fallback("Film VFF A", "VFF")], null);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Film VFQ")).toBeTruthy();
    expect(screen.queryByText("Film VFF A")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /collapsedFrench/ }));
    expect(screen.getByText("Film VFF A")).toBeTruthy();
  });
});
