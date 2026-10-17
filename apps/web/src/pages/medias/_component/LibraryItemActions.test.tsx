import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { LibraryMedia } from "@rawkoon/shared/types";
import { LibraryItemActions } from "./LibraryItemActions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    i18n: { language: "en" },
  }),
}));

const announceSearch = vi.fn();
vi.mock("@/features/medias/hooks/useLiveSearchToast", () => ({
  useLiveSearchToast: () => ({ announceSearch }),
}));
vi.mock("@/features/medias/hooks/useSearchLibraryMovie", () => ({
  useSearchLibraryMovie: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
const retryMutateAsync = vi.fn(async () => ({}));
vi.mock("@/features/medias/hooks/useRetrySkippedMedia", () => ({
  useRetrySkippedMedia: () => ({
    isPending: false,
    mutateAsync: retryMutateAsync,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/medias/hooks/useActiveDownloads", () => ({
  useDownloadProgress: () => ({ percent: 42, count: 1 }),
  useDownloadEta: () => 780,
}));

function item(over: Partial<LibraryMedia> = {}): LibraryMedia {
  return {
    id: 7,
    type: "movie",
    title: "Film",
    status: "wanted",
    quality_profile: { id: 1, name: "HD 1080p" },
    ...over,
  } as LibraryMedia;
}

const handlers = () => ({
  onChooseRelease: vi.fn(),
  onUpgradeSearch: vi.fn(),
});

describe("LibraryItemActions", () => {
  beforeEach(() => announceSearch.mockReset());

  it("offers Search now and Choose release on a missing movie", () => {
    const h = handlers();
    render(<LibraryItemActions item={item()} isAdmin {...h} />);

    fireEvent.click(screen.getByText("library.management.searchNow"));
    expect(announceSearch).toHaveBeenCalledOnce();
    expect(announceSearch.mock.calls[0][0]).toMatchObject({
      mediaId: 7,
      profileName: "HD 1080p",
    });

    fireEvent.click(screen.getByText("library.itemActions.chooseRelease"));
    expect(h.onChooseRelease).toHaveBeenCalledOnce();
  });

  it("offers only Choose release on a missing show", () => {
    render(
      <LibraryItemActions
        item={item({ type: "show" })}
        isAdmin
        {...handlers()}
      />,
    );
    expect(screen.queryByText("library.management.searchNow")).toBeNull();
    expect(screen.getByText("library.itemActions.chooseRelease")).toBeTruthy();
  });

  it("shows progress and ETA while downloading", () => {
    render(
      <LibraryItemActions
        item={item({ status: "downloading" })}
        isAdmin
        {...handlers()}
      />,
    );
    expect(
      screen.getByText('library.itemActions.downloadingPercent:{"percent":42}'),
    ).toBeTruthy();
    expect(
      screen.getByText(/library.itemActions.eta:\{"eta":"13m"\}/),
    ).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "42",
    );
  });

  it("offers a search for an upgrade once downloaded", () => {
    const h = handlers();
    render(
      <LibraryItemActions
        item={item({ status: "downloaded" })}
        isAdmin
        {...h}
      />,
    );
    fireEvent.click(screen.getByText("library.itemActions.searchUpgrade"));
    expect(h.onUpgradeSearch).toHaveBeenCalledOnce();
  });

  it("offers Search again once the search gave up and re-queues it", () => {
    render(
      <LibraryItemActions
        item={item({ status: "skipped" })}
        isAdmin
        {...handlers()}
      />,
    );
    fireEvent.click(screen.getByText("library.itemActions.searchAgain"));
    expect(retryMutateAsync).toHaveBeenCalledWith({ mediaId: 7 });
  });

  it("adds nothing for non-admins", () => {
    const { container } = render(
      <LibraryItemActions item={item()} isAdmin={false} {...handlers()} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
