import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2, Search } from "lucide-react";
import type { BookEditionKind, BookRelease } from "@rawkoon/shared";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  useClearReleaseSearch,
  useGrabRelease,
  useReleaseSearch,
} from "../_hooks/useBooks";
import { formatBytes } from "./bookDetailFormat";

export function ReleaseList({
  bookId,
  kind,
  isPrimary,
}: {
  bookId: number;
  kind: BookEditionKind;
  /** True when the edition holds no files, making the search THE next step. */
  isPrimary: boolean;
}) {
  const { t } = useTranslation("common");
  const [enabled, setEnabled] = useState(false);
  const { data, isFetching, error } = useReleaseSearch(bookId, kind, enabled);
  const grab = useGrabRelease(bookId);
  const [showRejected, setShowRejected] = useState(false);
  const clearResults = useClearReleaseSearch(bookId, kind);

  /**
   * Once a release is grabbed the rest of the list is spent: the choice is made,
   * the edition is downloading, and a second grab on the same edition is
   * refused by the server anyway. Leaving the list up only invites that. So
   * clear it and let the confirmation stand on its own.
   */
  const grabRelease = (release: BookRelease) =>
    grab.mutate(
      {
        kind,
        release_title: release.title,
        download_url: release.download_url ?? undefined,
        magnet_url: release.magnet_url ?? undefined,
        indexer: release.indexer,
      },
      {
        onSuccess: (result) => {
          if (!result.grabbed) return; // rejected — keep the list to retry
          setEnabled(false);
          setShowRejected(false);
          clearResults();
        },
      },
    );

  const releases = data?.releases ?? [];
  const accepted = releases.filter((r) => !r.rejected);
  const rejected = releases.filter((r) => r.rejected);
  const visible: BookRelease[] = showRejected ? releases : accepted;

  const searchError =
    error instanceof ApiError
      ? error.message
      : error
        ? t("books.releases.searchFailed")
        : null;

  return (
    <div className="mt-4 border-t border-neutral-800 pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          // An edition with no files has exactly one useful next step, so the
          // search reads as primary there and recedes once files exist.
          variant={isPrimary ? "default" : "secondary"}
          onClick={() => {
            // Drop the previous grab's banner; it refers to the old list.
            grab.reset();
            setEnabled(true);
          }}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="mr-1.5 h-3.5 w-3.5" />
          )}
          {t("books.releases.searchIndexers")}
        </Button>
        {rejected.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRejected((v) => !v)}
            className="focus-ring rounded text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
          >
            {showRejected
              ? t("books.releases.hideRejected", { count: rejected.length })
              : t("books.releases.showRejected", { count: rejected.length })}
          </button>
        )}
      </div>

      {searchError && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {searchError}
        </p>
      )}

      {data?.indexer_warnings.map((w) => (
        <p
          key={w.id}
          className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
        >
          {t("books.releases.indexerWarning", {
            name: w.name,
            error: w.error,
          })}
        </p>
      ))}

      {enabled && !isFetching && releases.length === 0 && !searchError && (
        <p className="mt-3 text-sm text-neutral-500">
          {t("books.releases.none")}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {visible.map((r) => (
            <li
              key={r.guid}
              className={`rounded-lg border px-3 py-2.5 ${
                r.rejected
                  ? "border-neutral-800 bg-neutral-950/40"
                  : "border-neutral-700 bg-neutral-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* A release name is a machine string, so it gets the mono face. */}
                  <p
                    className={`break-all font-mono text-xs leading-relaxed ${
                      r.rejected ? "text-neutral-500" : "text-neutral-200"
                    }`}
                  >
                    {r.title}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                    {r.format && (
                      <span className="font-medium uppercase tracking-wider text-primary-400">
                        {r.format}
                      </span>
                    )}
                    {r.audio_bitrate && (
                      <span>
                        {t("books.releases.bitrateKbps", {
                          value: r.audio_bitrate,
                        })}
                      </span>
                    )}
                    <span>{formatBytes(String(r.size_bytes ?? 0))}</span>
                    <span>
                      {t("books.releases.seeders", { count: r.seeders ?? 0 })}
                    </span>
                    {r.language && <span>{r.language.toUpperCase()}</span>}
                    {r.indexer && <span>{r.indexer}</span>}
                  </p>
                  {/* Rejections are shown verbatim: freetext book search is the
                      weakest link in the pipeline, and seeing exactly why a
                      release was dropped is how a profile gets tuned. */}
                  {r.rejected && (
                    <p className="mt-1.5 text-xs text-rose-400/80">
                      {r.rejections.join(" · ")}
                    </p>
                  )}
                </div>

                {!r.rejected && (
                  <Button
                    size="sm"
                    disabled={grab.isPending}
                    onClick={() => grabRelease(r)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="sr-only">
                      {t("books.releases.grabAction", { title: r.title })}
                    </span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* A refused grab is a 409, so it arrives as an error, not as data. The
          old check read grab.data — which is undefined on a throw — so reasons
          like "Already downloading" were never shown at all. */}
      {grab.isError && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {grab.error instanceof ApiError
            ? grab.error.message
            : t("books.releases.grabFailed")}
        </p>
      )}
      {grab.data?.grabbed && (
        <p className="mt-3 rounded-lg bg-primary-500/10 px-3 py-2 text-sm text-primary-200">
          {t("books.releases.grabbed", { title: grab.data.release_title })}
        </p>
      )}
    </div>
  );
}
