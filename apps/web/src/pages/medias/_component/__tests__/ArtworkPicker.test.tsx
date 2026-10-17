import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ArtworkCandidate, LibraryMedia } from "@rawkoon/shared/types";
import {
  ArtworkPicker,
  type ArtworkPicks,
} from "@/pages/medias/_component/ArtworkPicker";

const onPick = vi.fn();
let candidates: ArtworkCandidate[] = [];
let lastKind = "";
let isLoading = false;

vi.mock("@/features/medias/hooks/useArtworkCandidates", () => ({
  useArtworkCandidates: (_id: number, kind: string, enabled: boolean) => {
    lastKind = kind;
    return {
      data: enabled ? { candidates } : undefined,
      isLoading,
      isError: false,
    };
  },
}));

// Radix Select needs pointer events happy-dom lacks; a native select keeps the filter testable.
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
      data-testid="artwork-lang-select"
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

const Picker = ({
  item: media = item(),
  picks = {},
  defaultBackdropUrl,
}: {
  item?: LibraryMedia;
  picks?: ArtworkPicks;
  defaultBackdropUrl?: string | null;
}) => (
  <ArtworkPicker
    libraryId={7}
    item={media}
    picks={picks}
    onPick={onPick}
    defaultBackdropUrl={defaultBackdropUrl}
  />
);

const candidate = (
  url: string,
  language: string | null,
  source: "tmdb" | "fanart" = "tmdb",
): ArtworkCandidate => ({
  url,
  thumb_url: `${url}?thumb`,
  width: 100,
  height: 150,
  language,
  vote: 1,
  source,
});

const item = (patch: Partial<LibraryMedia> = {}) =>
  ({
    id: 7,
    title: "X",
    poster_url: null,
    backdrop_url: null,
    overrides: {},
    ...patch,
  }) as LibraryMedia;

/** A media whose artwork has been overridden to `url`. */
const overridden = (url: string) =>
  item({ poster_url: url, overrides: { poster_url: url } });

const grid = () => screen.getByTestId("artwork-grid");

describe("ArtworkPicker", () => {
  beforeEach(() => {
    onPick.mockClear();
    isLoading = false;
    candidates = [
      candidate("https://a/1.jpg", "en"),
      candidate("https://a/2.jpg", "fr"),
      candidate("https://a/3.jpg", null, "fanart"),
    ];
  });

  it("renders a cell per candidate for the active kind", () => {
    render(<Picker item={item()} />);
    expect(within(grid()).getAllByRole("button")).toHaveLength(3);
  });

  it("requests posters first", () => {
    render(<Picker item={item()} />);
    expect(lastKind).toBe("poster");
  });

  it("describes the artwork in use rather than badging every tile", () => {
    render(<Picker item={overridden("https://a/3.jpg")} />);
    // The language-neutral fanart candidate is the one in use.
    expect(screen.getByText("fanart.tv")).toBeTruthy();
    expect(screen.queryAllByText("TMDB")).toHaveLength(0);
  });

  it("switching to the backdrop tab requests backdrops", () => {
    render(<Picker item={item()} />);
    fireEvent.click(
      screen.getByRole("tab", { name: /library.edit.artworkBackdrop/i }),
    );
    expect(lastKind).toBe("backdrop");
  });

  it("marks the default backdrop shown in the hero as current", () => {
    render(<Picker item={item()} defaultBackdropUrl="https://a/2.jpg" />);
    fireEvent.click(
      screen.getByRole("tab", { name: /library.edit.artworkBackdrop/i }),
    );
    const current = within(grid())
      .getAllByRole("button")
      .filter((cell) => cell.getAttribute("data-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("data-url")).toBe("https://a/2.jpg");
  });

  it("offers one option per distinct language, plus all and no-text", () => {
    render(<Picker item={item()} />);
    const values = Array.from(
      screen.getByTestId("artwork-lang-select").querySelectorAll("option"),
    ).map((o) => o.getAttribute("value"));
    expect(values).toEqual(["all", "en", "fr", "none"]);
  });

  it("hides the language filter when there is nothing to filter", () => {
    candidates = [candidate("https://a/1.jpg", "en")];
    render(<Picker item={item()} />);
    expect(screen.queryByTestId("artwork-lang-select")).toBeNull();
  });

  it("narrows the grid to the selected language", () => {
    render(<Picker item={item()} />);
    fireEvent.change(screen.getByTestId("artwork-lang-select"), {
      target: { value: "fr" },
    });
    const cells = within(grid()).getAllByRole("button");
    expect(cells).toHaveLength(1);
    expect(cells[0].getAttribute("data-url")).toBe("https://a/2.jpg");
  });

  it("the no-text option shows only language-neutral candidates", () => {
    render(<Picker item={item()} />);
    fireEvent.change(screen.getByTestId("artwork-lang-select"), {
      target: { value: "none" },
    });
    const cells = within(grid()).getAllByRole("button");
    expect(cells).toHaveLength(1);
    expect(cells[0].getAttribute("data-url")).toBe("https://a/3.jpg");
  });

  it("says nothing matched the filter, not that there is no artwork", () => {
    candidates = [
      candidate("https://a/1.jpg", "en"),
      candidate("https://a/2.jpg", "fr"),
    ];
    render(<Picker item={item()} />);
    fireEvent.change(screen.getByTestId("artwork-lang-select"), {
      target: { value: "none" },
    });
    expect(screen.getByTestId("artwork-empty").textContent).toContain(
      "artworkNoneInLanguage",
    );
  });

  it("puts the artwork in use first so it is visible without scrolling", () => {
    render(<Picker item={overridden("https://a/3.jpg")} />);
    const cells = within(grid()).getAllByRole("button");
    expect(cells[0].getAttribute("data-url")).toBe("https://a/3.jpg");
    expect(cells[0].getAttribute("data-current")).toBe("true");
  });

  it("marks the cell matching the current poster", () => {
    render(<Picker item={overridden("https://a/2.jpg")} />);
    const cells = within(grid()).getAllByRole("button");
    const current = cells.filter(
      (c) => c.getAttribute("data-current") === "true",
    );
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("data-url")).toBe("https://a/2.jpg");
  });

  it("clicking a cell stages that candidate's full url", () => {
    render(<Picker item={item()} />);
    fireEvent.click(within(grid()).getAllByRole("button")[1]);
    expect(onPick).toHaveBeenCalledWith("poster", "https://a/2.jpg");
  });

  it("marks a staged pick as current before it is saved", () => {
    render(<Picker item={item()} picks={{ poster: "https://a/2.jpg" }} />);
    const current = within(grid())
      .getAllByRole("button")
      .filter((c) => c.getAttribute("data-current") === "true");
    expect(current.map((c) => c.getAttribute("data-url"))).toEqual([
      "https://a/2.jpg",
    ]);
  });

  it("stages a pasted image url and rejects one that is not a web address", () => {
    const { rerender } = render(<Picker item={item()} />);
    const input = screen.getByLabelText("library.edit.pasteImageUrl");
    fireEvent.change(input, { target: { value: "https://cdn.example/p.jpg" } });
    expect(onPick).toHaveBeenLastCalledWith(
      "poster",
      "https://cdn.example/p.jpg",
    );

    rerender(<Picker item={item()} />);
    fireEvent.change(input, { target: { value: "not a url" } });
    expect(screen.getByRole("alert").textContent).toBe(
      "library.edit.imageUrlInvalid",
    );
  });

  it("reset clears the override and is hidden with no override set", () => {
    const { rerender } = render(<Picker item={item()} />);
    expect(screen.queryByTestId("artwork-reset")).toBeNull();

    rerender(<Picker item={overridden("https://a/1.jpg")} />);
    fireEvent.click(screen.getByTestId("artwork-reset"));
    expect(onPick).toHaveBeenCalledWith("poster", null);
  });

  it("marks the stored poster even when it is a different size variant", () => {
    // The library stores a w500 URL; candidates come back as `original`.
    render(
      <Picker
        item={item({ poster_url: "https://image.tmdb.org/t/p/w500/2.jpg" })}
      />,
    );
    const cells = within(grid()).getAllByRole("button");
    const current = cells.filter(
      (c) => c.getAttribute("data-current") === "true",
    );
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("data-url")).toBe("https://a/2.jpg");
  });

  it("offers no reset when the artwork is the untouched default", () => {
    render(<Picker item={item({ poster_url: "https://a/1.jpg" })} />);
    expect(screen.queryByTestId("artwork-reset")).toBeNull();
  });

  it("renders an empty state rather than a blank grid", () => {
    candidates = [];
    render(<Picker item={item()} />);
    expect(screen.queryByTestId("artwork-grid")).toBeNull();
    expect(screen.getByTestId("artwork-empty")).toBeTruthy();
  });
});
