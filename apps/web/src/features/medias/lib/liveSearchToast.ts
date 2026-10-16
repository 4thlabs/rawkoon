import { toast } from "sonner";
import type { SearchResultPayload } from "@rawkoon/shared/types";
import {
  outcomeRank,
  searchResultView,
  type SearchToastAction,
} from "./searchResultView";

type T = (key: string, options?: Record<string, unknown>) => string;

/** A search that has not answered by now keeps going; the grab lands as a notification. */
export const STILL_SEARCHING_MS = 120_000;
/** A grab notification can trail the result a little; keep hiding its popup. */
const MOVIE_GRACE_MS = 20_000;
/** A show reports one season at a time, so later seasons may still upgrade the toast. */
const SHOW_GRACE_MS = 120_000;
const RESULT_TOAST_MS = 12_000;

export interface LiveSearchContext {
  mediaId: number;
  title: string;
  profileName: string | null;
  isShow: boolean;
  t: T;
  language: string;
  /** Opens the item page, on its release list when `releases` is set. */
  openItem: (releases: boolean) => void;
  /** Grabs every held target of a delayed result early. */
  grabNow: (targetKeys: string[]) => void;
}

interface Entry {
  ctx: LiveSearchContext;
  stillSearching: ReturnType<typeof setTimeout> | null;
  cleanup: ReturnType<typeof setTimeout> | null;
  settledRank: number | null;
}

const entries = new Map<number, Entry>();

const toastIdFor = (mediaId: number) => `search-${mediaId}`;

function clearTimers(entry: Entry) {
  if (entry.stillSearching) clearTimeout(entry.stillSearching);
  if (entry.cleanup) clearTimeout(entry.cleanup);
}

/** Starts (or restarts) the one toast for an item whose search is running. */
export function trackSearch(ctx: LiveSearchContext): void {
  const previous = entries.get(ctx.mediaId);
  if (previous) clearTimers(previous);

  const entry: Entry = {
    ctx,
    stillSearching: null,
    cleanup: null,
    settledRank: null,
  };
  entries.set(ctx.mediaId, entry);

  const id = toastIdFor(ctx.mediaId);
  toast.loading(ctx.t("medias.searchToast.searching", { title: ctx.title }), {
    id,
    duration: Infinity,
    action: undefined,
    cancel: undefined,
  });
  entry.stillSearching = setTimeout(() => {
    if (entry.settledRank != null) return;
    toast.info(ctx.t("medias.searchToast.stillSearching"), {
      id,
      duration: RESULT_TOAST_MS,
    });
    // Stop hiding this item's grab popup once the toast has given up waiting.
    scheduleCleanup(ctx.mediaId, entry);
  }, STILL_SEARCHING_MS);
}

function scheduleCleanup(mediaId: number, entry: Entry) {
  if (entry.cleanup) clearTimeout(entry.cleanup);
  entry.cleanup = setTimeout(
    () => {
      if (entries.get(mediaId) === entry) entries.delete(mediaId);
    },
    entry.ctx.isShow ? SHOW_GRACE_MS : MOVIE_GRACE_MS,
  );
}

function button(
  ctx: LiveSearchContext,
  action: SearchToastAction,
  targetKeys: string[],
) {
  switch (action) {
    case "view":
      return {
        label: ctx.t("medias.searchToast.view"),
        onClick: () => ctx.openItem(false),
      };
    case "changeRelease":
      return {
        label: ctx.t("medias.searchToast.changeRelease"),
        onClick: () => ctx.openItem(true),
      };
    case "choose":
      return {
        label: ctx.t("medias.searchToast.chooseRelease"),
        onClick: () => ctx.openItem(true),
      };
    case "grabNow":
      if (!targetKeys.length) return undefined;
      return {
        label: ctx.t("medias.searchToast.grabNow"),
        // Keep the toast: sonner would otherwise dismiss the one the new search just reused.
        onClick: (event: { preventDefault: () => void }) => {
          event.preventDefault();
          ctx.grabNow(targetKeys);
        },
      };
  }
}

function heldKeys(result: SearchResultPayload): string[] {
  if (result.target_keys?.length) return result.target_keys;
  return result.target_key ? [result.target_key] : [];
}

/** Feeds a finished search into its toast; results for untracked items are ignored. */
export function applySearchResult(result: SearchResultPayload): void {
  const entry = entries.get(result.media_id);
  if (!entry) return;
  const rank = outcomeRank(result.outcome);
  if (entry.settledRank != null && rank <= entry.settledRank) return;

  const { ctx } = entry;
  const view = searchResultView(ctx, result);
  const [first, second] = view.actions;
  const options = {
    id: toastIdFor(result.media_id),
    duration: RESULT_TOAST_MS,
    action: first ? button(ctx, first, heldKeys(result)) : undefined,
    cancel: second ? button(ctx, second, heldKeys(result)) : undefined,
  };
  if (view.variant === "error") toast.error(view.message, options);
  else if (view.variant === "success") toast.success(view.message, options);
  else toast.info(view.message, options);

  settle(result.media_id, entry, rank);
}

function settle(mediaId: number, entry: Entry, rank: number) {
  entry.settledRank = rank;
  clearTimers(entry);
  scheduleCleanup(mediaId, entry);
}

/** The answer to "Grab now" on a held item: a grab, or why nothing was grabbed. */
export function applyGrabNowResult(
  mediaId: number,
  res: { grabbed: boolean; reason?: string | null },
): void {
  if (res.grabbed) {
    applySearchResult({ media_id: mediaId, outcome: "grabbed" });
    return;
  }
  const entry = entries.get(mediaId);
  if (!entry) return;
  const { t } = entry.ctx;
  toast.info(t("dashboard.home.nothingGrabbed"), {
    id: toastIdFor(mediaId),
    duration: RESULT_TOAST_MS,
    description: res.reason
      ? t(`dashboard.home.grabMiss.${res.reason}`)
      : undefined,
    action: undefined,
    cancel: undefined,
  });
  settle(mediaId, entry, outcomeRank("delayed"));
}

/** True while an item's live toast owns its grab news, so its popup stays quiet. */
export function isGrabPopupSuppressed(mediaId: number): boolean {
  return entries.has(mediaId);
}

/** Test seam: forget every tracked search. */
export function resetLiveSearchToasts(): void {
  for (const entry of entries.values()) clearTimers(entry);
  entries.clear();
}
