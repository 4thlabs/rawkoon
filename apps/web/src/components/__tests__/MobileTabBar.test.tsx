import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MobileTabBar } from "@/components/MobileTabBar";
import { isNavRouteActive } from "@/lib/routing/navigation";

let pathname = "/";
let badge = 0;

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
vi.mock("@/components/AccountMenu", () => ({
  AccountMenu: () => <button type="button">account</button>,
}));
vi.mock("@/lib/notifications/useActivityBadge", () => ({
  useActivityBadge: () => badge,
}));

beforeEach(() => {
  pathname = "/";
  badge = 0;
});

describe("isNavRouteActive", () => {
  it("matches the root exactly and other entries by prefix", () => {
    expect(isNavRouteActive("/", "/")).toBe(true);
    expect(isNavRouteActive("/", "/library")).toBe(false);
    expect(isNavRouteActive("/library", "/library/12")).toBe(true);
    expect(isNavRouteActive("/library", "/libraryfoo")).toBe(false);
  });

  it("keeps Library lit on book pages and Find on its sub-pages", () => {
    expect(isNavRouteActive("/library", "/books/4")).toBe(true);
    expect(isNavRouteActive("/find", "/find/swipe")).toBe(true);
    expect(isNavRouteActive("/activity", "/activity/requests")).toBe(true);
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

  it("shows Home, Library, Find, Activity and the account slot", () => {
    pathname = "/library/3";
    render(<MobileTabBar />);
    const nav = screen.getByRole("navigation");
    for (const key of [
      "nav.dashboard",
      "nav.library",
      "nav.find",
      "nav.activity",
    ]) {
      expect(nav.textContent).toContain(key);
    }
    expect(screen.getByText("account")).toBeTruthy();
    expect(nav.textContent).not.toContain("nav.search");
    expect(nav.textContent).not.toContain("nav.more");
    expect(
      screen
        .getByText("nav.library")
        .closest("a")
        ?.getAttribute("aria-current"),
    ).toBe("page");
  });

  it("puts the activity count on the Activity tab only", () => {
    badge = 3;
    render(<MobileTabBar />);
    const badges = screen.getAllByTestId("nav-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toBe("3");
    expect(screen.getByText("nav.activity").closest("a")).toContainElement(
      badges[0],
    );
  });
});
