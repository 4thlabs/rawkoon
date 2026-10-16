import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityLanes } from "../ActivityLanes";

let isAdmin = false;
let pathname = "/activity";

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
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { is_admin: isAdmin } }),
}));

describe("ActivityLanes", () => {
  it("shows Inbox, Requests, Calendar and History to everyone", () => {
    isAdmin = false;
    render(<ActivityLanes />);
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/activity",
      "/activity/requests",
      "/activity/calendar",
      "/activity/history",
    ]);
  });

  it("adds Queue for admins, second after Inbox", () => {
    isAdmin = true;
    render(<ActivityLanes />);
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs[1]).toBe("/activity/queue");
    expect(hrefs).toHaveLength(5);
  });

  it("marks only the current lane, with Inbox matched exactly", () => {
    isAdmin = true;
    pathname = "/activity/requests";
    render(<ActivityLanes />);
    const current = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.getAttribute("href"))).toEqual([
      "/activity/requests",
    ]);
  });
});
