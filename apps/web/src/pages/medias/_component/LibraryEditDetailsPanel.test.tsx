import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { LibraryMedia } from "@rawkoon/shared/types";

const overridesMutate = vi.fn(async () => ({}));
const searchTitleMutate = vi.fn(async () => ({}));
const artworkMutate = vi.fn(async () => ({}));
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/features/medias/hooks/useUpdateLibraryOverrides", () => ({
  useUpdateLibraryOverrides: () => ({ mutateAsync: overridesMutate }),
}));
vi.mock("@/features/medias/hooks/useUpdateLibrarySearchTitle", () => ({
  useUpdateLibrarySearchTitle: () => ({ mutateAsync: searchTitleMutate }),
}));
vi.mock("@/features/medias/hooks/useUpdateLibraryArtwork", () => ({
  useUpdateLibraryArtwork: () => ({ mutateAsync: artworkMutate }),
}));
vi.mock("@/features/medias/hooks/useArtworkCandidates", () => ({
  useArtworkCandidates: () => ({ data: { candidates: [] }, isLoading: false }),
}));
const loadedOptions = [
  { query: "Film", languageCode: "en", label: "English", isOriginal: false },
  { query: "Titre", languageCode: "fr", label: "French", isOriginal: false },
];
let titleOptions = loadedOptions;
vi.mock("@/features/medias/hooks/useLibraryTitleOptions", () => ({
  useLibraryTitleOptions: () => titleOptions,
}));
// Radix Select needs pointer events happy-dom lacks; a native select keeps it testable.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="search-title"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));
vi.mock("sonner", () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

import { LibraryEditDetailsPanel } from "./LibraryEditDetailsPanel";

const item = (over: Partial<LibraryMedia> = {}) =>
  ({
    id: 7,
    type: "movie",
    title: "Film",
    sort_title: null,
    year: 2023,
    overview: "Stored overview",
    search_title: null,
    overrides: {},
    poster_url: null,
    backdrop_url: null,
    ...over,
  }) as LibraryMedia;

const panel = (media: LibraryMedia, onClose = vi.fn()) => (
  <LibraryEditDetailsPanel
    open
    onClose={onClose}
    item={media}
    defaultBackdropUrl={null}
    tmdb={{ title: "Film (TMDB)", overview: "TMDB overview", year: 2023 }}
    tmdbOriginalTitle={null}
    tmdbOriginalLanguage={null}
    tmdbTitleTranslations={[]}
    tmdbPending={false}
  />
);

const mount = (media: LibraryMedia, onClose = vi.fn()) => {
  render(panel(media, onClose));
  return onClose;
};

describe("LibraryEditDetailsPanel", () => {
  beforeEach(() => {
    overridesMutate.mockClear();
    searchTitleMutate.mockClear();
    artworkMutate.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
    titleOptions = loadedOptions;
  });

  it("shows stored values as placeholders until a field is overridden", () => {
    mount(item());
    const title = screen.getByLabelText("library.edit.fieldTitle");
    expect((title as HTMLInputElement).value).toBe("");
    expect(title.getAttribute("placeholder")).toBe("Film");
    expect(screen.queryByText("editPanel.overridden")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "library.edit.save",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("marks a changed field Overridden and saves only what changed", async () => {
    const onClose = mount(item());
    fireEvent.change(screen.getByLabelText("library.edit.fieldYear"), {
      target: { value: "2024" },
    });
    expect(screen.getAllByText("editPanel.overridden")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "library.edit.save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(overridesMutate).toHaveBeenCalledWith({
      id: 7,
      overrides: { year: 2024 },
    });
    expect(searchTitleMutate).not.toHaveBeenCalled();
    expect(artworkMutate).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith("library.edit.saved");
  });

  it("resets an overridden field to TMDB on Save, with TMDB as its placeholder", async () => {
    mount(item({ title: "Mon titre", overrides: { title: "Mon titre" } }));
    const title = screen.getByLabelText(
      "library.edit.fieldTitle",
    ) as HTMLInputElement;
    expect(title.value).toBe("Mon titre");
    expect(title.getAttribute("placeholder")).toBe("Film (TMDB)");

    fireEvent.click(
      screen.getByRole("button", { name: /library.edit.resetToTmdb/ }),
    );
    expect(title.value).toBe("");
    expect(screen.queryByText("editPanel.overridden")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "library.edit.save" }));
    await waitFor(() =>
      expect(overridesMutate).toHaveBeenCalledWith({
        id: 7,
        overrides: { title: null },
      }),
    );
  });

  it("saves a changed search title and a pasted image through their own endpoints", async () => {
    mount(item());
    fireEvent.change(screen.getByTestId("search-title"), {
      target: { value: "Titre" },
    });
    fireEvent.change(screen.getByLabelText("library.edit.pasteImageUrl"), {
      target: { value: "https://cdn.example/p.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "library.edit.save" }));

    await waitFor(() => expect(artworkMutate).toHaveBeenCalled());
    expect(searchTitleMutate).toHaveBeenCalledWith({
      id: 7,
      body: { search_title_language: "fr", search_title: "Titre" },
    });
    expect(artworkMutate).toHaveBeenCalledWith({
      id: 7,
      kind: "poster",
      url: "https://cdn.example/p.jpg",
    });
    expect(overridesMutate).not.toHaveBeenCalled();
  });

  it("blocks Save while the pasted image address is not a web address", () => {
    mount(item());
    fireEvent.change(screen.getByLabelText("library.edit.pasteImageUrl"), {
      target: { value: "nope" },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "library.edit.save",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("does not count the search title as changed when options arrive after mount", () => {
    titleOptions = [];
    const media = item();
    const { rerender } = render(panel(media));
    titleOptions = loadedOptions;
    rerender(panel(media));

    expect(
      (screen.getByTestId("search-title") as HTMLSelectElement).value,
    ).toBe("Film");
    expect(
      (
        screen.getByRole("button", {
          name: "library.edit.save",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("names the part that failed, keeps the panel open and does not toast success", async () => {
    searchTitleMutate.mockRejectedValueOnce(new Error("boom"));
    const onClose = mount(item());
    fireEvent.change(screen.getByLabelText("library.edit.fieldYear"), {
      target: { value: "2024" },
    });
    fireEvent.change(screen.getByTestId("search-title"), {
      target: { value: "Titre" },
    });
    fireEvent.click(screen.getByRole("button", { name: "library.edit.save" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledOnce());
    expect(toastError.mock.calls[0][0]).toContain(
      "library.edit.saveFailedAfter",
    );
    expect(toastError.mock.calls[0][0]).toContain(
      "failed:library.edit.searchTitle",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
