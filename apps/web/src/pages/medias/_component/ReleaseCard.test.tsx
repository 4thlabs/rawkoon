import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { InteractiveReleaseItem } from "@rawkoon/shared/types";
import { ReleaseCard } from "./ReleaseCard";

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t, i18n: { language: "en" } }),
}));

function release(
  extra: Partial<InteractiveReleaseItem> = {},
): InteractiveReleaseItem {
  return {
    guid: "g",
    title: "Film 2024 1080p",
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

function renderCard(
  r: InteractiveReleaseItem,
  props: Partial<Parameters<typeof ReleaseCard>[0]> = {},
) {
  const onBlock = vi.fn();
  const onDownload = vi.fn();
  render(
    <ReleaseCard
      release={r}
      onDownload={onDownload}
      onBlock={onBlock}
      isDownloading={false}
      isBusy={false}
      t={t}
      {...props}
    />,
  );
  return { onBlock, onDownload };
}

describe("ReleaseCard actions", () => {
  it("keeps Block out of the row and inside the more-actions menu", async () => {
    const { onBlock, onDownload } = renderCard(release());
    expect(screen.queryByText("medias.interactive.block")).toBeNull();

    fireEvent.click(screen.getByText("medias.interactive.download"));
    expect(onDownload).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole("button", { name: "medias.interactive.moreActions" }),
    );
    fireEvent.click(await screen.findByText("medias.interactive.block"));
    expect(onBlock).toHaveBeenCalledOnce();
  });

  it("offers the score breakdown from the menu", async () => {
    renderCard(
      release({
        quality_score: 10,
        score_breakdown: {
          rejected: false,
          total: 10,
          components: [{ code: "resolution_tier", value: 10 }],
          matched_formats: [],
        },
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "medias.interactive.moreActions" }),
    );
    fireEvent.click(await screen.findByText("customFormats.scoreBreakdown"));
    expect((await screen.findAllByText("+10")).length).toBeGreaterThan(0);
  });

  it("says in plain words why a rejected row was rejected", () => {
    renderCard(
      release({
        rejected: true,
        quality_rejection_reasons: ["resolution_above_cutoff"],
      }),
      { profileName: "HD 1080p" },
    );
    expect(
      screen.getByText(
        'scoring.reject.resolutionAboveCutoff:{"profile":"HD 1080p"}',
      ),
    ).toBeTruthy();
  });

  it("names the profile and the reasons on the best match", () => {
    renderCard(
      release({
        languages: ["VFQ"],
        parsed_quality: {
          resolution: 1080,
          source: "BluRay",
          codec: null,
          hdr: null,
        },
      }),
      { variant: "best", profileName: "HD 1080p" },
    );
    expect(
      screen.getByText(
        'medias.interactive.bestMatch.title:{"profile":"HD 1080p"}',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'medias.interactive.bestMatch.reasonQuality:{"quality":"1080p BluRay"}',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'medias.interactive.bestMatch.reasonSeeders:{"count":5}',
      ),
    ).toBeTruthy();
  });
});
