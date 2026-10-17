import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type {
  ArtworkCandidate,
  ArtworkKind,
  LibraryMedia,
} from "@rawkoon/shared/types";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useArtworkCandidates } from "@/features/medias/hooks/useArtworkCandidates";
import { languageDisplayName } from "@/lib/utils/languageDisplayName";

/** Same image regardless of the size variant TMDB served it at. */
function sameImage(a: string, b: string | null): boolean {
  if (!b) return false;
  if (a === b) return true;
  const file = (u: string) => u.slice(u.lastIndexOf("/") + 1);
  return file(a) === file(b);
}

/** Filter values that are not a language code. */
const ALL = "all";
const NEUTRAL = "none";

/** A staged choice per kind: a url sets it, null goes back to the default, absent leaves it alone. */
export type ArtworkPicks = Partial<Record<ArtworkKind, string | null>>;

export function isImageUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

interface Props {
  libraryId: number;
  item: LibraryMedia;
  defaultBackdropUrl?: string | null;
  picks: ArtworkPicks;
  onPick: (kind: ArtworkKind, url: string | null | undefined) => void;
}

export function ArtworkPicker({
  libraryId,
  item,
  defaultBackdropUrl = null,
  picks,
  onPick,
}: Props) {
  const { t, i18n } = useTranslation("common");
  const pasteId = useId();
  const [kind, setKind] = useState<ArtworkKind>("poster");
  const [filter, setFilter] = useState<string>(ALL);
  const [hovered, setHovered] = useState<ArtworkCandidate | null>(null);
  const [pasted, setPasted] = useState<Partial<Record<ArtworkKind, string>>>(
    {},
  );

  const { data, isLoading } = useArtworkCandidates(libraryId, kind, true);
  const candidates = useMemo(() => data?.candidates ?? [], [data]);

  // Two different questions. The override decides whether there is anything to
  // reset; the displayed image decides which tile is marked in use — and the
  // stored poster is a w500 URL while candidates are `original`, so the two
  // are compared by file name rather than by full URL.
  const overrideField = kind === "poster" ? "poster_url" : "backdrop_url";
  const storedOverride =
    typeof item.overrides?.[overrideField] === "string"
      ? (item.overrides[overrideField] as string)
      : null;
  const staged = picks[kind];
  const overrideUrl = staged === undefined ? storedOverride : staged;
  const displayedUrl =
    overrideUrl ?? (kind === "poster" ? item.poster_url : defaultBackdropUrl);
  const pastedValue = pasted[kind] ?? "";
  const pasteInvalid = pastedValue.trim() !== "" && !isImageUrl(pastedValue);

  const languages = useMemo(() => {
    const codes = new Set<string>();
    let neutral = false;
    for (const c of candidates) {
      if (c.language) codes.add(c.language);
      else neutral = true;
    }
    const sorted = [...codes].sort((a, b) =>
      languageDisplayName(a, i18n.language).localeCompare(
        languageDisplayName(b, i18n.language),
        i18n.language,
      ),
    );
    return { sorted, neutral };
  }, [candidates, i18n.language]);

  const visible = useMemo(() => {
    const matching =
      filter === ALL
        ? candidates
        : filter === NEUTRAL
          ? candidates.filter((c) => !c.language)
          : candidates.filter((c) => c.language === filter);
    // The artwork in use goes first: with 50+ candidates it would otherwise sit
    // below the fold, and seeing the current choice is the point of opening this.
    const inUse = matching.findIndex((c) => sameImage(c.url, displayedUrl));
    if (inUse <= 0) return matching;
    const reordered = [...matching];
    const [current] = reordered.splice(inUse, 1);
    return current ? [current, ...reordered] : reordered;
  }, [candidates, filter, displayedUrl]);

  const selected = useMemo(
    () => candidates.find((c) => sameImage(c.url, displayedUrl)) ?? null,
    [candidates, displayedUrl],
  );

  // Details describe one image at a time: whichever is under the pointer, else
  // the one in use. Eight permanent badges would compete with the artwork.
  const detailed = hovered ?? selected;

  const pick = (url: string | null) => {
    setPasted((prev) => ({ ...prev, [kind]: "" }));
    onPick(kind, url);
  };

  const isPoster = kind === "poster";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          variant="chips"
          ariaLabel={t("library.edit.artwork")}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setFilter(ALL);
            setHovered(null);
          }}
          containerClassName="w-auto"
          // Apricot is reserved for the artwork in use, so the mode tab stays
          // neutral — otherwise the eye lands on the word, not the image.
          activeItemClassName="border-neutral-600 bg-neutral-700/50 text-neutral-100"
          items={[
            {
              id: "poster" as ArtworkKind,
              label: t("library.edit.artworkPoster"),
            },
            {
              id: "backdrop" as ArtworkKind,
              label: t("library.edit.artworkBackdrop"),
            },
          ]}
        />

        {languages.sorted.length > 1 || languages.neutral ? (
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger
              data-testid="artwork-lang-select"
              aria-label={t("library.edit.artworkLanguage")}
              className="h-9 w-auto min-w-36 rounded-full border-neutral-700 bg-neutral-800/80 px-3 text-sm text-neutral-300"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>
                {t("library.edit.artworkAllLanguages")}
              </SelectItem>
              {languages.sorted.map((code) => (
                <SelectItem key={code} value={code}>
                  {languageDisplayName(code, i18n.language)}
                </SelectItem>
              ))}
              {languages.neutral ? (
                <SelectItem value={NEUTRAL}>
                  {t("library.edit.artworkNoLanguage")}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-400">
          {t("library.edit.artworkLoading")}
        </p>
      ) : visible.length === 0 ? (
        <p data-testid="artwork-empty" className="text-sm text-neutral-400">
          {candidates.length === 0
            ? t("library.edit.artworkEmpty")
            : t("library.edit.artworkNoneInLanguage")}
        </p>
      ) : (
        <div
          data-testid="artwork-grid"
          onMouseLeave={() => setHovered(null)}
          // TMDB routinely returns 50-70 candidates; without a cap the
          // section swallows the panel. Roughly three rows, then scroll.
          // content-start + auto-rows-max: a grid with a definite height may
          // otherwise stretch or squash its rows to fill it, which crushes the
          // tiles' aspect ratio instead of overflowing into the scroll area.
          className="grid max-h-80 auto-rows-max content-start gap-2 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface-inset p-2"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${
              isPoster ? "84px" : "140px"
            }, 1fr))`,
          }}
        >
          {visible.map((c) => (
            <ArtworkTile
              key={c.url}
              candidate={c}
              kind={kind}
              current={sameImage(c.url, displayedUrl)}
              onPick={() => pick(c.url)}
              onFocus={() => setHovered(c)}
            />
          ))}
        </div>
      )}

      <div className="flex min-h-6 items-center justify-between gap-3">
        <p className="truncate px-0.5 text-xs text-neutral-400">
          {detailed ? <CandidateDetail candidate={detailed} /> : null}
        </p>
        {overrideUrl ? (
          <button
            type="button"
            data-testid="artwork-reset"
            onClick={() => pick(null)}
            className="focus-ring -mr-1.5 shrink-0 rounded-md px-1.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          >
            {t("library.edit.artworkReset")}
          </button>
        ) : null}
      </div>

      <FormField
        label={t("library.edit.pasteImageUrl")}
        controlId={pasteId}
        error={pasteInvalid ? t("library.edit.imageUrlInvalid") : undefined}
      >
        <Input
          id={pasteId}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          value={pastedValue}
          onChange={(e) => {
            const value = e.target.value;
            setPasted((prev) => ({ ...prev, [kind]: value }));
            onPick(kind, value.trim() === "" ? undefined : value.trim());
          }}
        />
      </FormField>
    </div>
  );
}

/** Source, language and pixel size of one candidate, weighted by importance. */
function CandidateDetail({ candidate }: { candidate: ArtworkCandidate }) {
  const { t, i18n } = useTranslation("common");
  const size =
    candidate.width && candidate.height
      ? `${candidate.width}×${candidate.height}`
      : null;
  const language = candidate.language
    ? languageDisplayName(candidate.language, i18n.language)
    : t("library.edit.artworkNoLanguage");

  return (
    <>
      <span className="text-neutral-300">
        {candidate.source === "fanart" ? "fanart.tv" : "TMDB"}
      </span>
      <span className="ml-2">{language}</span>
      {size ? <span className="ml-2 tabular-nums">{size}</span> : null}
    </>
  );
}

function ArtworkTile({
  candidate,
  kind,
  current,
  onPick,
  onFocus,
}: {
  candidate: ArtworkCandidate;
  kind: ArtworkKind;
  current: boolean;
  onPick: () => void;
  onFocus: () => void;
}) {
  return (
    <button
      type="button"
      data-url={candidate.url}
      data-current={current ? "true" : "false"}
      aria-pressed={current}
      onClick={onPick}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      className={`focus-ring group relative overflow-hidden rounded-lg bg-neutral-800 transition ${
        current
          ? "ring-2 ring-primary-400"
          : "ring-1 ring-border hover:ring-neutral-500"
      }`}
      style={{ aspectRatio: kind === "poster" ? "2 / 3" : "16 / 9" }}
    >
      <img
        src={candidate.thumb_url}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {current ? (
        <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-primary-400 text-neutral-950 shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
          <Check size={12} strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}
