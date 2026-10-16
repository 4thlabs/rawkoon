import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MobileTabBar, isTabBarRoute } from "@/components/MobileTabBar";

let pathname = "/";
let modalProps: { onAdded?: () => void } = {};

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname } }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/lib/routing/useFeatures", () => ({
  useFeatures: () => ({ data: { books_enabled: false } }),
}));
vi.mock("@/lib/app/useLanguageToggle", () => ({
  useLanguageToggle: () => ({ currentName: "English", toggle: vi.fn() }),
}));
vi.mock("@/lib/auth/useSignOut", () => ({ useSignOut: () => vi.fn() }));
// Mirrors the real modal: the input is inert until the sheet is open.
vi.mock("@/pages/medias/_component/TmdbSearchModal", () => ({
  TmdbSearchModal: (props: {
    isOpen: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onAdded?: () => void;
  }) => {
    modalProps = props;
    return (
      <div data-testid="sheet" data-open={props.isOpen} inert={!props.isOpen}>
        <input ref={props.inputRef} aria-label="q" />
      </div>
    );
  },
}));

beforeEach(() => {
  pathname = "/";
  modalProps = {};
});

describe("isTabBarRoute", () => {
  it("matches the root exactly and other tabs by prefix", () => {
    expect(isTabBarRoute("/", "/")).toBe(true);
    expect(isTabBarRoute("/", "/library")).toBe(false);
    expect(isTabBarRoute("/library", "/library/12")).toBe(true);
    expect(isTabBarRoute("/library", "/library")).toBe(true);
    expect(isTabBarRoute("/library", "/libraryfoo")).toBe(false);
  });
});

describe("MobileTabBar", () => {
  it("hides while a text field has focus and comes back on blur", () => {
    render(
      <>
        <input aria-label="field" />
        <MobileTabBar />
      </>,
    );
    const nav = screen.getByRole("navigation");
    const field = screen.getByLabelText("field");
    act(() => field.focus());
    expect(nav.hidden).toBe(true);
    act(() => field.blur());
    expect(nav.hidden).toBe(false);
  });

  it("shows the five tabs and marks the current page", () => {
    pathname = "/library/3";
    render(<MobileTabBar />);
    const nav = screen.getByRole("navigation");
    expect(nav.textContent).toContain("nav.dashboard");
    expect(nav.textContent).toContain("nav.search");
    expect(nav.textContent).toContain("nav.requests");
    expect(nav.textContent).toContain("nav.more");
    expect(
      screen
        .getByText("nav.library")
        .closest("a")
        ?.getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByText("nav.dashboard")
        .closest("a")
        ?.getAttribute("aria-current"),
    ).toBeNull();
  });

  it("opens the search sheet with its input focused in the same tap", () => {
    render(<MobileTabBar />);
    fireEvent.click(screen.getByText("nav.search"));
    expect(screen.getByTestId("sheet").getAttribute("data-open")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("q"));
  });

  it("closes the search sheet after an item is added", () => {
    render(<MobileTabBar />);
    fireEvent.click(screen.getByText("nav.search"));
    React.act(() => modalProps.onAdded?.());
    expect(screen.getByTestId("sheet").getAttribute("data-open")).toBe("false");
  });

  it("lists the remaining pages and account actions under More", () => {
    render(<MobileTabBar />);
    fireEvent.click(screen.getByText("nav.more"));
    expect(screen.getByText("settings.title")).toBeTruthy();
    expect(screen.getByText("nav.logout")).toBeTruthy();
    expect(screen.getByText("common.language")).toBeTruthy();
  });
});
