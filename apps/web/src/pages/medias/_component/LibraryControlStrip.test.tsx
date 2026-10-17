import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { LibraryMedia } from "@rawkoon/shared/types";

const toggleMutateAsync = vi.fn(async () => ({}));
const profileMutateAsync = vi.fn(async () => ({
  item: { needs_upgrade: false },
}));
const rescanMutate = vi.fn();

vi.mock("@/features/medias/hooks/useToggleMediaMonitored", () => ({
  useToggleMediaMonitored: () => ({
    mutateAsync: toggleMutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/features/medias/hooks/useUpdateLibraryQualityProfile", () => ({
  useUpdateLibraryQualityProfile: () => ({
    mutateAsync: profileMutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/features/medias/hooks/useUpgradeLibraryMedia", () => ({
  useUpgradeLibraryMedia: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/features/medias/hooks/useRescanLibraryItem", () => ({
  useRescanLibraryItem: () => ({ mutate: rescanMutate, isPending: false }),
}));
vi.mock("@/pages/settings/useQualityProfiles", () => ({
  useQualityProfilesList: () => ({
    data: { profiles: [{ id: 1, name: "HD" }] },
  }),
}));
vi.mock("@/features/transcode/ReencodeModal", () => ({
  ReencodeModal: () => <div data-testid="reencode-modal" />,
}));
vi.mock("./LibraryRemoveDialog", () => ({
  LibraryRemoveDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="remove-dialog" /> : null,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LibraryControlStrip } from "./LibraryControlStrip";

const item = {
  id: 7,
  type: "movie",
  title: "Film",
  status: "downloaded",
  monitored: true,
  quality_profile_id: 1,
} as LibraryMedia;

const handlers = () => ({
  onEditDetails: vi.fn(),
  onSearchReleases: vi.fn(),
  onUpgradeManualSearch: vi.fn(),
  onRemoved: vi.fn(),
});

describe("LibraryControlStrip", () => {
  beforeEach(() => {
    toggleMutateAsync.mockClear();
    rescanMutate.mockClear();
  });

  it("flips Monitored through the switch", () => {
    render(<LibraryControlStrip item={item} {...handlers()} />);
    fireEvent.click(
      screen.getByRole("switch", { name: "library.strip.monitored" }),
    );
    expect(toggleMutateAsync).toHaveBeenCalledWith({ id: 7, monitored: false });
  });

  it("lists the five actions, with Remove last and set apart", () => {
    render(<LibraryControlStrip item={item} {...handlers()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "library.strip.moreActions" }),
    );
    const labels = screen
      .getAllByRole("menuitem")
      .map((el) => el.textContent?.replace("medias.detail.tabReleases", ""));
    expect(labels).toEqual([
      "library.strip.editDetails",
      "library.strip.rescan",
      "library.strip.reencode",
      "library.strip.searchReleases",
      "library.strip.remove",
    ]);
    expect(screen.getByRole("separator")).toBeTruthy();
  });

  it("runs Edit details, Search releases, Rescan, Re-encode and Remove", async () => {
    const h = handlers();
    render(<LibraryControlStrip item={item} {...h} />);
    const open = () =>
      fireEvent.click(
        screen.getByRole("button", { name: "library.strip.moreActions" }),
      );

    open();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "library.strip.editDetails" }),
    );
    expect(h.onEditDetails).toHaveBeenCalledOnce();

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    open();
    fireEvent.click(
      screen.getByRole("menuitem", { name: /library.strip.searchReleases/ }),
    );
    expect(h.onSearchReleases).toHaveBeenCalledOnce();

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    open();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "library.strip.rescan" }),
    );
    expect(rescanMutate).toHaveBeenCalledOnce();

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    open();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "library.strip.reencode" }),
    );
    expect(screen.getByTestId("reencode-modal")).toBeTruthy();

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    open();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "library.strip.remove" }),
    );
    expect(screen.getByTestId("remove-dialog")).toBeTruthy();
  });
});
