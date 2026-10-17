import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Book } from "@rawkoon/shared/types";

let isAdmin = true;
const refreshMutate = vi.fn();
const addEditionMutate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/features/medias/hooks/useLibraryEvents", () => ({
  useLibraryEvents: () => undefined,
}));
vi.mock("@/components/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { is_admin: isAdmin } }),
}));
vi.mock("../_hooks/useRefreshBookMetadata", () => ({
  useRefreshBookMetadata: () => ({ mutate: refreshMutate, isPending: false }),
}));
vi.mock("../_hooks/useBooks", () => ({
  useBook: () => ({ data: { item: book }, isLoading: false }),
  useAddEdition: () => ({ mutate: addEditionMutate, isPending: false }),
  useDeleteBook: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetBookRead: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../_hooks/useUpdateBookOverrides", () => ({
  useUpdateBookOverrides: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/components/confirm/ConfirmContext", () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { BookDetailPage } from "./BookDetailPage";

const book = {
  id: 11,
  title: "A Book",
  subtitle: null,
  authors: ["Someone"],
  narrators: [],
  genres: [],
  language: "en",
  overview: null,
  cover_url: null,
  read_at: null,
  published_date: null,
  published_year: null,
  series_name: null,
  series_position: null,
  publisher: null,
  page_count: null,
  rating: null,
  rating_count: null,
  isbn13: null,
  metadata_sources: {},
  overrides: {},
  editions: [],
} as unknown as Book;

const openMenu = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "books.detail.moreActions" }),
  );

describe("BookDetailPage header", () => {
  beforeEach(() => {
    isAdmin = true;
    refreshMutate.mockClear();
    addEditionMutate.mockClear();
  });

  it("is Mark as read plus a menu with Edit details, Refresh metadata and Remove book", () => {
    render(<BookDetailPage bookId={11} />);
    expect(screen.getByRole("button", { name: "books.markRead" })).toBeTruthy();
    openMenu();
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual(
      [
        "library.strip.editDetails",
        "books.detail.metadata.refresh",
        "books.detail.remove",
      ],
    );
  });

  it("refreshes metadata from the menu", () => {
    render(<BookDetailPage bookId={11} />);
    openMenu();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "books.detail.metadata.refresh" }),
    );
    expect(refreshMutate).toHaveBeenCalledOnce();
  });

  it("opens the same Edit details panel for the book fields", () => {
    render(<BookDetailPage bookId={11} />);
    openMenu();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "library.strip.editDetails" }),
    );
    expect(
      screen.getByRole("dialog", { name: "library.edit.title" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("library.edit.pasteImageUrl")).toBeTruthy();
  });

  it("asks before removing", () => {
    render(<BookDetailPage bookId={11} />);
    openMenu();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "books.detail.remove" }),
    );
    expect(
      screen.getByRole("dialog", { name: "books.detail.removeTitle" }),
    ).toBeTruthy();
  });

  it("puts the add-edition actions in the Editions list, not the header", () => {
    render(<BookDetailPage bookId={11} />);
    const adds = screen.getAllByRole("button", {
      name: /books.detail.addEdition/,
    });
    expect(adds).toHaveLength(2);
    fireEvent.click(adds[0]);
    expect(addEditionMutate).toHaveBeenCalledWith({ kind: "ebook" });
  });

  it("gives a member Mark as read and nothing else", () => {
    isAdmin = false;
    render(<BookDetailPage bookId={11} />);
    expect(screen.getByRole("button", { name: "books.markRead" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "books.detail.moreActions" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /books.detail.addEdition/ }),
    ).toBeNull();
  });
});
