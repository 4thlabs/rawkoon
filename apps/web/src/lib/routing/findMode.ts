export type FindMode = "browse" | "swipe";

const KEY = "rawkoon.find.mode";

/** The last Find mode used this session, so the nav entry reopens it. */
export function readFindMode(): FindMode {
  try {
    return sessionStorage.getItem(KEY) === "swipe" ? "swipe" : "browse";
  } catch {
    return "browse";
  }
}

export function rememberFindMode(mode: FindMode): void {
  try {
    sessionStorage.setItem(KEY, mode);
  } catch {
    // Storage can be blocked; the mode just isn't remembered.
  }
}
