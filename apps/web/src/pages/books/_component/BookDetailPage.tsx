import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { providerHtmlParagraphs, type BookEditionKind } from "@rawkoon/shared";
import { useLibraryEvents } from "@/features/medias/hooks/useLibraryEvents";
import { PageLayout } from "@/components/PageLayout";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/useAuth";
import { MarkBookReadAction, BookReadBadge } from "./BookReadActions";
import { toast } from "sonner";
import { useAddEdition, useBook } from "../_hooks/useBooks";
import { useRefreshBookMetadata } from "../_hooks/useRefreshBookMetadata";
import { BookEditDetailsPanel } from "./BookEditDetailsPanel";
import { BookCover } from "./BookCover";
import { EditionPanel } from "./EditionPanel";
import { MetaField } from "./MetaField";
import { RemoveBookDialog } from "./RemoveBookDialog";

/**
 * Book detail.
 *
 * Two ideas drive the layout. First, a book is a physical object, so the cover
 * carries a spine and a page edge and each edition is presented as a spined
 * object rather than a flat card — this is the one place the page spends any
 * decoration. Second, acquisition really is a sequence (wanted, then grabbed,
 * then imported), which is what earns the stepped track: it encodes state the
 * reader needs, and answering "do I have this yet?" at a glance is the page's
 * whole job.
 *
 * Fira Code is reserved for machine strings — identifiers, release names, file
 * paths. Prose gets the body face. That split is semantic, not decorative.
 */

export function BookDetailPage({ bookId }: { bookId: number }) {
  const { t } = useTranslation("common");
  // Server-pushed updates, same stream the media pages use. No polling.
  useLibraryEvents();
  const { data, isLoading } = useBook(bookId);
  const refreshMetadata = useRefreshBookMetadata(bookId);
  const addEdition = useAddEdition(bookId);
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  // Grabbing, editing and removing are admin-only; members read and listen.
  const isAdmin = useCurrentUser().data?.is_admin ?? false;

  if (isLoading) {
    return (
      <PageLayout>
        <p className="py-16 text-center text-sm text-neutral-500">
          {t("books.detail.loading")}
        </p>
      </PageLayout>
    );
  }

  const book = data?.item;
  if (!book) {
    return (
      <PageLayout>
        <p className="py-16 text-center text-sm text-neutral-500">
          {t("books.detail.notFound")}
        </p>
      </PageLayout>
    );
  }

  const refresh = () => {
    refreshMetadata.mutate(undefined, {
      onSuccess: (res) => {
        // Naming a failed source matters: an Audnexus outage would
        // otherwise be indistinguishable from "this book has no narrators".
        if (res.failed_sources.length > 0) {
          toast.warning(
            t("books.detail.metadata.refreshedWithFailures", {
              count: res.changed_fields.length,
              sources: res.failed_sources.join(", "),
            }),
          );
          return;
        }
        if (res.changed_fields.length === 0) {
          toast.info(t("books.detail.metadata.refreshedNoChange"));
          return;
        }
        toast.success(
          t("books.detail.metadata.refreshed", {
            count: res.changed_fields.length,
          }),
        );
      },
      onError: () => toast.error(t("books.detail.metadata.refreshFailed")),
    });
  };

  const existingKinds = new Set(book.editions.map((e) => e.kind));
  const missingKinds = (["ebook", "audiobook"] as BookEditionKind[]).filter(
    (k) => !existingKinds.has(k),
  );

  // Provider descriptions are markup. Sanitized into paragraphs so the prose
  // can be set with real spacing rather than printed with tags showing.
  const paragraphs = providerHtmlParagraphs(book.overview);

  return (
    <PageLayout>
      <Link
        to="/books"
        className="focus-ring mb-6 inline-flex items-center gap-1.5 rounded text-sm text-neutral-400 transition-colors hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("books.detail.backToBooks")}
      </Link>

      <div className="flex flex-col gap-7 sm:flex-row sm:gap-9">
        {/* One cover component for the list and the hero, so a coverless book
            looks the same in both places — and, since Google Books often has no
            artwork, looks deliberate rather than broken. */}
        <div className="mx-auto shrink-0 sm:mx-0">
          <BookCover
            title={book.title}
            author={book.authors[0] ?? null}
            coverUrl={book.cover_url}
            size="hero"
            alt={t("books.detail.coverAlt", { title: book.title })}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl leading-tight text-neutral-50 sm:text-4xl">
            {book.title}
          </h1>
          {book.read_at && (
            <div className="mt-2">
              <BookReadBadge />
            </div>
          )}
          {book.subtitle && (
            <p className="mt-1.5 font-display text-lg text-neutral-300">
              {book.subtitle}
            </p>
          )}

          <p className="mt-3 text-sm text-neutral-300">
            {book.authors.join(", ") || t("books.unknownAuthor")}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500">
            {(book.published_date || book.published_year) && (
              <span
                title={
                  book.metadata_sources.publishedDate ??
                  book.metadata_sources.publishedYear
                }
              >
                {/* The full date when a source supplied one; the year is all
                    most records carry. */}
                {/* Formatted from the UTC components: providers store a
                    publication date as midnight UTC, and converting that to a
                    local timezone shows the previous day west of UTC. */}
                {book.published_date
                  ? new Date(book.published_date).toLocaleDateString(
                      undefined,
                      {
                        timeZone: "UTC",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : book.published_year}
              </span>
            )}
            <span aria-hidden>·</span>
            <span>{book.language.toUpperCase()}</span>
            {book.series_name && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {book.series_name}
                  {book.series_position != null
                    ? ` #${book.series_position}`
                    : ""}
                </span>
              </>
            )}
          </p>

          {/* The ISBN is a real identifier someone might look up or paste.
              The provider's volume id was also printed here; it is an internal
              key with no meaning outside this app, so it is gone. */}
          {book.isbn13 && (
            <p className="mt-4 font-mono text-[11px] text-neutral-500">
              {t("books.detail.isbn", { value: book.isbn13 })}
            </p>
          )}

          {/* Merged from the metadata source chain. Each renders only when a
              source supplied it, so a thin record stays visually quiet rather
              than showing a column of dashes. */}
          {(book.narrators.length > 0 ||
            book.genres.length > 0 ||
            book.publisher ||
            book.page_count != null ||
            book.rating != null) && (
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {book.narrators.length > 0 && (
                <MetaField
                  label={t("books.detail.metadata.narrators")}
                  value={book.narrators.join(", ")}
                  source={book.metadata_sources.narrators}
                />
              )}
              {book.publisher && (
                <MetaField
                  label={t("books.detail.metadata.publisher")}
                  value={book.publisher}
                  source={book.metadata_sources.publisher}
                />
              )}
              {book.page_count != null && (
                <MetaField
                  label={t("books.detail.metadata.pages")}
                  value={String(book.page_count)}
                  source={book.metadata_sources.pageCount}
                />
              )}
              {book.rating != null && (
                <MetaField
                  label={t("books.detail.metadata.rating")}
                  value={
                    book.rating_count != null
                      ? t("books.detail.metadata.ratingWithCount", {
                          rating: book.rating.toFixed(1),
                          count: book.rating_count,
                        })
                      : book.rating.toFixed(1)
                  }
                  source={book.metadata_sources.rating}
                />
              )}
              {book.genres.length > 0 && (
                <div className="col-span-2 sm:col-span-3">
                  <MetaField
                    label={t("books.detail.metadata.genres")}
                    value={book.genres.join(" · ")}
                    source={book.metadata_sources.genres}
                  />
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Actions sit at the top right rather than under the metadata, which
            left the whole right half of the header empty and put a destructive
            button in the middle of the reading path. */}
        <div className="flex shrink-0 items-start gap-2">
          <MarkBookReadAction book={book} />
          {isAdmin && (
            <ActionMenu
              label={t("books.detail.moreActions")}
              items={[
                {
                  id: "edit",
                  label: t("library.strip.editDetails"),
                  icon: <SlidersHorizontal size={15} />,
                  onSelect: () => setEditOpen(true),
                },
                {
                  id: "refresh",
                  label: t("books.detail.metadata.refresh"),
                  icon: <RefreshCw size={15} />,
                  disabled: refreshMetadata.isPending,
                  onSelect: refresh,
                },
                "separator",
                {
                  id: "remove",
                  label: t("books.detail.remove"),
                  icon: <X size={15} />,
                  destructive: true,
                  onSelect: () => setRemoveOpen(true),
                },
              ]}
              trigger={
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={t("books.detail.moreActions")}
                  className="w-9 px-0"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* The one piece of human writing on the page. It spans the full container
          width rather than a fixed reading measure. */}
      {paragraphs.length > 0 && (
        <div className="mt-10">
          {paragraphs.map((html, i) => (
            <p
              // Safe: sanitizeProviderHtml has already run twice on this string
              // — once on ingest, once in providerHtmlParagraphs. Only bare,
              // attribute-less tags from a fixed allowlist can survive it, so
              // there is no attribute, event handler, or URL vector to exploit.
              dangerouslySetInnerHTML={{ __html: html }}
              key={`para-${i}`}
              className="mt-4 text-[15px] leading-[1.75] text-neutral-300 first:mt-0"
            />
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          {t("books.detail.editionsHeading")}
          <span aria-hidden className="h-px flex-1 bg-neutral-800" />
        </h2>

        <div className="mt-4 space-y-4">
          {book.editions.map((e) => (
            <EditionPanel
              key={e.id}
              bookId={book.id}
              edition={e}
              isAdmin={isAdmin}
            />
          ))}
          {isAdmin &&
            missingKinds.map((kind) => (
              <div
                key={kind}
                className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-neutral-700 px-4 py-3"
              >
                <p className="text-sm text-neutral-400">
                  {t("books.detail.noEdition", {
                    kind: t(
                      `books.kind${kind === "audiobook" ? "Audiobook" : "Ebook"}`,
                    ),
                  })}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={addEdition.isPending}
                  onClick={() => addEdition.mutate({ kind })}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("books.detail.addEdition", {
                    kind: t(
                      `books.kind${kind === "audiobook" ? "Audiobook" : "Ebook"}`,
                    ),
                  })}
                </Button>
              </div>
            ))}
        </div>
      </div>

      {isAdmin && (
        <>
          <BookEditDetailsPanel
            open={editOpen}
            onClose={() => setEditOpen(false)}
            book={book}
          />
          <RemoveBookDialog
            open={removeOpen}
            onClose={() => setRemoveOpen(false)}
            bookId={book.id}
            title={book.title}
          />
        </>
      )}
    </PageLayout>
  );
}
