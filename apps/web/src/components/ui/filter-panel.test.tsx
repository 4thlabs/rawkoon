import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ActiveFilterChips,
  FilterButton,
  FilterGroup,
  FilterPanel,
  FilterSegmented,
} from "./filter-panel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

function mockViewport(desktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: desktop,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function renderPanel(
  props: { onReset?: () => void; onDone?: () => void } = {},
) {
  return render(
    <FilterPanel
      trigger={<FilterButton count={2} />}
      title="Filters"
      resultCount="7 titles"
      {...props}
    >
      <FilterGroup label="Type">
        <FilterSegmented
          ariaLabel="Type"
          options={[
            { id: "a", label: "All" },
            { id: "b", label: "Shows", count: 61 },
          ]}
          value="a"
          onChange={() => {}}
        />
      </FilterGroup>
    </FilterPanel>,
  );
}

describe("FilterPanel", () => {
  beforeEach(() => mockViewport(true));

  it("shows the active count on the trigger and keeps groups closed until opened", () => {
    renderPanel();
    expect(
      screen.getByRole("button", { name: /filters\.button/ }),
    ).toHaveTextContent("2");
    expect(screen.queryByRole("group", { name: "Type" })).toBeNull();
  });

  it("opens a popover on desktop with groups, the count, Reset and Done", () => {
    const onReset = vi.fn();
    const onDone = vi.fn();
    renderPanel({ onReset, onDone });
    fireEvent.click(screen.getByRole("button", { name: /filters\.button/ }));

    expect(screen.getByRole("group", { name: "Type" })).toBeInTheDocument();
    expect(screen.getByText("7 titles")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Shows/ })).toHaveTextContent(
      "61",
    );

    fireEvent.click(screen.getByRole("button", { name: "filters.reset" }));
    expect(onReset).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "filters.done" }));
    expect(onDone).toHaveBeenCalledOnce();
    expect(screen.queryByRole("group", { name: "Type" })).toBeNull();
  });

  it("omits Reset when no reset handler is given", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /filters\.button/ }));
    expect(screen.queryByRole("button", { name: "filters.reset" })).toBeNull();
  });

  it("renders a bottom sheet dialog below 640px", () => {
    mockViewport(false);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /filters\.button/ }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Type" })).toBeInTheDocument();
  });
});

describe("ActiveFilterChips", () => {
  it("removes one chip or clears all", () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(
      <ActiveFilterChips
        chips={[
          { id: "type", label: "Shows", onRemove },
          { id: "status", label: "Gave up", onRemove: () => {} },
        ]}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Shows/ }));
    expect(onRemove).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "filters.clearAll" }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it("renders nothing without chips and hides Clear all for a single chip", () => {
    const { container, rerender } = render(
      <ActiveFilterChips chips={[]} onClearAll={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <ActiveFilterChips
        chips={[{ id: "a", label: "A", onRemove: () => {} }]}
        onClearAll={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "filters.clearAll" }),
    ).toBeNull();
  });
});
