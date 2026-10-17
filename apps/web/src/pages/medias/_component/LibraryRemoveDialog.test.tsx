import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const removeMutateAsync = vi.fn(async () => ({ success: true }));
const downloadsMock = vi.fn();
const seedingMock = vi.fn();
vi.mock("@/features/medias/hooks/useRemoveFromLibrary", () => ({
  useRemoveFromLibrary: () => ({
    mutateAsync: removeMutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/features/medias/hooks/useLibraryDownloads", () => ({
  useLibraryDownloads: () => downloadsMock(),
}));
vi.mock("@/features/seeding/hooks/useSeeding", () => ({
  useSeeding: () => seedingMock(),
}));

import { LibraryRemoveDialog } from "./LibraryRemoveDialog";

const HELD = {
  items: [
    {
      id: 1,
      torrent_hash: "AA",
      seed: {
        state: "seeding",
        reason: null,
        ratio: 0.2,
        seeding_time_secs: 10,
      },
    },
  ],
};

describe("LibraryRemoveDialog", () => {
  beforeEach(() => {
    removeMutateAsync.mockClear();
    onRemoved.mockClear();
    seedingMock.mockReturnValue({
      data: {
        torrents: [
          {
            hash: "aa",
            owes_seed_time: true,
            target_met: false,
            ratio: 0.4,
            rule: { ratio: 10, seed_time_mins: null },
            size_bytes: 2 * 1024 ** 3,
          },
        ],
      },
    });
  });

  const onRemoved = vi.fn();
  const mount = () =>
    render(
      <LibraryRemoveDialog
        open
        libraryId={5}
        title="Film"
        onClose={vi.fn()}
        onRemoved={onRemoved}
      />,
    );

  it("offers keep-seeding vs remove-now when torrents are held, warning about a hit-and-run", async () => {
    downloadsMock.mockReturnValue({ data: HELD });
    mount();
    expect(
      screen.getByText(/^library\.remove\.seedingTitle/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("library.remove.releaseNow"));
    expect(screen.getByText("library.remove.hnrWarning")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /library.remove.confirm/ }),
    );
    await waitFor(() =>
      expect(removeMutateAsync).toHaveBeenCalledWith({
        id: 5,
        deleteFiles: true,
        releaseTorrents: true,
      }),
    );
    await waitFor(() => expect(onRemoved).toHaveBeenCalledOnce());
  });

  it("shows no seeding choice when nothing is held", () => {
    downloadsMock.mockReturnValue({ data: { items: [] } });
    mount();
    expect(screen.queryByText(/^library\.remove\.seedingTitle/)).toBeNull();
  });

  it("says what is still owed and how much space removing frees", () => {
    downloadsMock.mockReturnValue({ data: HELD });
    mount();
    expect(
      screen.getByText(
        /^library\.remove\.keepSeedingHintRatio ratio:0\.40 target:10\.0/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^library\.remove\.releaseNowHintSize size:2/),
    ).toBeInTheDocument();
  });
});
