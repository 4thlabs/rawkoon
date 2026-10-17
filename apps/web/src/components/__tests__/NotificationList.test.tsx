import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Notification } from "@rawkoon/shared/types";
import { NotificationList } from "@/components/NotificationList";

const navigate = vi.fn();
const markRead = vi.fn();
const searchAgain = vi.fn();
const openTarget = vi.fn();
let isAdmin = true;

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));
vi.mock("@/components/confirm/ConfirmContext", () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { is_admin: isAdmin } }),
}));
vi.mock("@/lib/notifications/useDeleteNotification", () => ({
  useDeleteNotification: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/lib/notifications/useMarkAsReadOptimistic", () => ({
  useMarkAsReadOptimistic: () => ({ mutate: markRead, mutateAsync: markRead }),
}));
vi.mock("@/lib/notifications/useSearchAgain", () => ({
  useSearchAgain: () => ({ mutate: searchAgain, isPending: false }),
}));
vi.mock("@/lib/notifications/navigation", () => ({
  openNotificationTarget: (url: string) => openTarget(url),
}));
vi.mock("@/components/NotificationLeadingVisual", () => ({
  NotificationLeadingVisual: () => <span />,
}));
vi.mock("@rawkoon/shared/utils", () => ({
  formatDate: () => "d",
  formatTime: () => "t",
}));

const note = (over: Partial<Notification>): Notification => ({
  id: 1,
  title: "Title",
  body: "Body",
  type: "library_grab_skipped",
  read: false,
  read_at: null,
  url: "/library/7?tab=files&season=2&episode=5",
  image_url: null,
  metadata: null,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("NotificationList inline actions", () => {
  beforeEach(() => {
    navigate.mockReset();
    markRead.mockReset();
    searchAgain.mockReset();
    openTarget.mockReset();
    isAdmin = true;
  });

  it("Search again runs the search without opening the notification", () => {
    render(<NotificationList notifications={[note({})]} />);
    fireEvent.click(screen.getByText("notifications.searchAgain"));
    expect(searchAgain).toHaveBeenCalledWith({
      kind: "searchAgain",
      mediaId: 7,
      season: 2,
      episode: 5,
    });
    expect(openTarget).not.toHaveBeenCalled();
  });

  it("Review opens the requests lane", () => {
    render(
      <NotificationList
        notifications={[
          note({ type: "request_pending", url: "/activity/requests" }),
        ]}
      />,
    );
    fireEvent.click(screen.getByText("notifications.review"));
    expect(navigate).toHaveBeenCalledWith({ to: "/activity/requests" });
    expect(openTarget).not.toHaveBeenCalled();
  });

  it("keys pressed on an inline button do not open the row", () => {
    render(<NotificationList notifications={[note({})]} />);
    const button = screen.getByText("notifications.searchAgain");
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(openTarget).not.toHaveBeenCalled();
    fireEvent.keyDown(
      screen.getByRole("button", { name: "a11y.openNotification" }),
      {
        key: "Enter",
      },
    );
    expect(markRead).toHaveBeenCalled();
  });

  it("offers no inline action to non-admins", () => {
    isAdmin = false;
    render(<NotificationList notifications={[note({})]} />);
    expect(screen.queryByText("notifications.searchAgain")).toBeNull();
  });
});
