import { normalizeNotificationUrl } from "@rawkoon/shared/utils";
function getNotificationTargetUrl(
  url: string | null | undefined,
  fallback = "/notifications",
): string {
  return normalizeNotificationUrl(url) ?? fallback;
}

/** The in-app path (with search and hash) for same-origin targets, else null. */
function toInAppHref(target: string): string | null {
  if (target.startsWith("/") && !target.startsWith("//")) return target;
  try {
    const parsed = new URL(target);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function openNotificationTarget(
  url: string | null | undefined,
  fallback = "/notifications",
): void {
  const target = getNotificationTargetUrl(url, fallback);
  const href = toInAppHref(target);
  if (href === null) {
    window.location.assign(target);
    return;
  }
  // Imported lazily: the router module pulls in every page, which import this file.
  void import("@/router")
    .then(({ router }) => router.navigate({ href }))
    .catch(() => window.location.assign(target));
}
