import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { TmdbMediaSearchItem } from "@rawkoon/shared/types";
import { QuickActionPalette } from "@/components/QuickActionPalette";

const navigate = vi.fn();
const addTitle = vi.fn();
let titleItems: TmdbMediaSearchItem[] = [];

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useRouterState: () => ({ location: { pathname: "/" } }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { page?: string }) => (o?.page ? `${k}:${o.page}` : k),
    i18n: { language: "en" },
  }),
}));
vi.mock("@/lib/search/useSearch", () => ({
  useQuickSearch: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@/lib/routing/navigation", () => ({
  visibleNavSections: () => [
    {
      labelKey: null,
      items: [
        { path: "/explore", translationKey: "nav.browse", icon: () => null },
      ],
    },
  ],
}));
vi.mock("@/lib/routing/useFeatures", () => ({
  useFeatures: () => ({ data: { books_enabled: false } }),
}));
vi.mock("@/lib/routing/usePrefetchAllRoutes", () => ({
  usePrefetchAllRoutes: () => vi.fn(),
}));
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { is_admin: true } }),
}));
vi.mock("@/features/medias/hooks/useTmdbMediaSearch", () => ({
  useTmdbMediaSearch: (_q: string, o?: { enabled?: boolean }) => ({
    data: o?.enabled ? { enabled: true, items: titleItems } : undefined,
    isLoading: false,
  }),
}));
vi.mock("@/features/medias/hooks/useAddTitle", () => ({
  useAddTitle: () => ({ addTitle, isAdding: false }),
}));
vi.mock("@/pages/medias/_component/ExploreCardDetailDialog", () => ({
  ExploreCardDetailDialog: ({ item }: { item: TmdbMediaSearchItem }) => (
    <div data-testid="details">{item.title}</div>
  ),
}));

const title = (over: Partial<TmdbMediaSearchItem>): TmdbMediaSearchItem => ({
  id: "movie-1",
  tmdb_id: 1,
  media_type: "movie",
  title: "Alpha",
  release_year: 2020,
  poster_url: null,
  overview: null,
  vote_average: null,
  already_exists: false,
  can_add: true,
  source_id: null,
  library_id: null,
  library_status: null,
  ...over,
});

function setup() {
  const onClose = vi.fn();
  render(<QuickActionPalette isOpen onClose={onClose} onOpen={vi.fn()} />);
  const input = screen.getByPlaceholderText("common.quickActionsPlaceholder");
  return { onClose, input };
}

async function typeQuery(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
}

describe("QuickActionPalette title search", () => {
  beforeEach(() => {
    navigate.mockReset();
    addTitle.mockReset();
    titleItems = [
      title({}),
      title({ id: "movie-2", tmdb_id: 2, title: "Beta" }),
    ];
  });

  it("lists titles above pages", async () => {
    const { input } = setup();
    await typeQuery(input, "nav");
    const rows = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const alpha = rows.findIndex((r) => r.includes("Alpha"));
    const page = rows.findIndex((r) => r.includes("nav.browse"));
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(page).toBeGreaterThan(alpha);
  });

  it("adds the highlighted title on Enter and closes", async () => {
    addTitle.mockResolvedValue({ item: { id: 3 } });
    const { input, onClose } = setup();
    await typeQuery(input, "alpha");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(addTitle).toHaveBeenCalledWith(
      expect.objectContaining({ tmdb_id: 1 }),
    );
  });

  it("keeps the palette open when the add fails", async () => {
    addTitle.mockResolvedValue(null);
    const { input, onClose } = setup();
    await typeQuery(input, "alpha");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(addTitle).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens details on Shift+Enter without adding", async () => {
    const { input, onClose } = setup();
    await typeQuery(input, "alpha");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(await screen.findByTestId("details")).toHaveTextContent("Alpha");
    expect(addTitle).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the library item for a title already in the library", async () => {
    titleItems = [
      title({
        already_exists: true,
        library_id: 9,
        library_status: "downloaded",
      }),
    ];
    const { input } = setup();
    await typeQuery(input, "alpha");
    expect(
      screen.getByText("medias.library.itemStatus.downloaded"),
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(addTitle).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({
      to: "/library/$libraryId",
      params: { libraryId: "9" },
    });
  });

  it("ignores Enter on title rows left over from the previous query", async () => {
    const { input, onClose } = setup();
    await typeQuery(input, "alpha");
    fireEvent.change(input, { target: { value: "alphab" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(addTitle).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores Enter while an IME composition is active", async () => {
    const { input } = setup();
    await typeQuery(input, "alpha");
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(addTitle).not.toHaveBeenCalled();
  });

  it("exposes a combobox over a listbox of options and moves with Home/End", async () => {
    const { input } = setup();
    await typeQuery(input, "nav");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute(
      "aria-controls",
      screen.getByRole("listbox").id,
    );
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
    fireEvent.keyDown(input, { key: "End" });
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      options[options.length - 1].id,
    );
    fireEvent.keyDown(input, { key: "Home" });
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the details button labelled", async () => {
    const { input } = setup();
    await typeQuery(input, "alpha");
    expect(
      screen.getAllByRole("button", { name: "common.quickActionsDetails" }),
    ).toHaveLength(2);
  });
});
