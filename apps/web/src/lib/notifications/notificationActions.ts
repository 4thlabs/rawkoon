import type { Notification } from "@rawkoon/shared/types";

export type InlineAction =
  | {
      kind: "searchAgain";
      mediaId: number;
      season: number | null;
      episode: number | null;
    }
  | { kind: "reviewRequest" };

/** Only the two actionable notification types get a button; everything else just opens. */
export function inlineActionFor(
  notification: Pick<Notification, "type" | "url">,
  isAdmin: boolean,
): InlineAction | null {
  if (!isAdmin) return null;
  if (notification.type === "request_pending") return { kind: "reviewRequest" };
  if (notification.type !== "library_grab_skipped" || !notification.url) {
    return null;
  }

  try {
    const url = new URL(notification.url, "https://rawkoon.local");
    const match = /^\/library\/(\d+)\/?$/.exec(url.pathname);
    if (!match) return null;
    const num = (key: string) => {
      const raw = url.searchParams.get(key);
      return raw != null && /^\d+$/.test(raw) ? Number(raw) : null;
    };
    return {
      kind: "searchAgain",
      mediaId: Number(match[1]),
      season: num("season"),
      episode: num("episode"),
    };
  } catch {
    return null;
  }
}
