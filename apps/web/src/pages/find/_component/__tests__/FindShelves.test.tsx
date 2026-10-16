import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FindShelves } from "../FindShelves";

let booksEnabled = true;

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
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/lib/routing/useFeatures", () => ({
  useFeatures: () => ({ data: { books_enabled: booksEnabled } }),
}));

describe("FindShelves", () => {
  it("links the three shelf pages", () => {
    booksEnabled = true;
    render(<FindShelves />);
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/find/watchlist",
      "/find/collections",
      "/find/bestsellers",
    ]);
  });

  it("hides Bestsellers when books are off", () => {
    booksEnabled = false;
    render(<FindShelves />);
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/find/watchlist", "/find/collections"]);
  });
});
