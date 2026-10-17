import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import type { NavPosition } from "@rawkoon/shared/types";

// Mock all heavy dependencies
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
  useNavigate: () => vi.fn(),
  useRouterState: ({
    select,
  }: {
    select: (r: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname: "/" } }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));
vi.mock("motion/react", () => ({
  motion: {
    span: ({
      children,
      ...p
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <span {...p}>{children}</span>,
  },
}));
vi.mock("@/lib/app/useTheme", () => ({ useTheme: () => ({}) }));
vi.mock("@/lib/routing/usePrefetchRoute", () => ({
  usePrefetchRoute: () => vi.fn(),
}));
vi.mock("@/components/AccountMenu", () => ({
  AccountMenu: ({ variant }: { variant: string }) => (
    <div data-testid="account-menu" data-variant={variant} />
  ),
}));
let badge = 0;
vi.mock("@/lib/notifications/useActivityBadge", () => ({
  useActivityBadge: () => badge,
}));

function renderSidebar(position: NavPosition) {
  return render(<Sidebar position={position} />);
}

describe("Sidebar", () => {
  it("lists exactly Home, Library, Find and Activity", () => {
    renderSidebar("left");
    const links = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(links).toEqual(
      expect.arrayContaining(["/", "/library", "/find", "/activity"]),
    );
    expect(links).not.toContain("/settings");
    expect(links).not.toContain("/notifications");
  });

  it("has no bell, user menu or separate settings and logout controls", () => {
    renderSidebar("left");
    expect(screen.queryByTestId("notifications")).toBeNull();
    expect(screen.queryByLabelText("nav.logout")).toBeNull();
    expect(screen.getAllByTestId("account-menu")).toHaveLength(1);
  });

  it("uses the compact account trigger on a horizontal bar", () => {
    renderSidebar("top");
    expect(screen.getByTestId("account-menu").dataset.variant).toBe("compact");
  });

  it("shows the activity count on the Activity entry", () => {
    badge = 5;
    renderSidebar("left");
    const activity = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href") === "/activity");
    expect(activity?.textContent).toContain("5");
    badge = 0;
  });
});
