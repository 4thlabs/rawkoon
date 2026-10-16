import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickActionPalette } from "@/components/QuickActionPalette";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useRouterState: () => ({ location: { pathname: "/" } }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { page?: string; query?: string }) =>
      o?.page ? `${k}:${o.page}` : o?.query ? `${k}:${o.query}` : k,
    i18n: { language: "en" },
  }),
}));
vi.mock("@/lib/search/useSearch", () => ({
  useQuickSearch: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@/lib/routing/navigation", () => ({
  navItems: [{ path: "/find", translationKey: "nav.find", icon: () => null }],
}));
vi.mock("@/lib/routing/usePrefetchAllRoutes", () => ({
  usePrefetchAllRoutes: () => vi.fn(),
}));

function setup() {
  const onClose = vi.fn();
  render(<QuickActionPalette isOpen onClose={onClose} onOpen={vi.fn()} />);
  const input = screen.getByPlaceholderText("common.quickActionsPlaceholder");
  return { onClose, input };
}

describe("QuickActionPalette", () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it("offers a Search Find action first when a title is typed", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "alpha" } });
    const rows = screen.getAllByRole("option");
    expect(rows[0].textContent).toContain(
      "common.quickActionsSearchFind:alpha",
    );
  });

  it("opens Find with the query on Enter and closes", () => {
    const { input, onClose } = setup();
    fireEvent.change(input, { target: { value: "  alpha " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(navigate).toHaveBeenCalledWith({
      to: "/find",
      search: { q: "alpha" },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not offer Search Find before anything is typed", () => {
    setup();
    expect(screen.queryByText(/quickActionsSearchFind/)).toBeNull();
  });

  it("ignores Enter while an IME composition is active", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "alpha" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("exposes a combobox over a listbox of options and moves with Home/End", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "find" } });
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
});
