import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  ArtworkKind,
  LibraryMedia,
  TitleTranslation,
} from "@rawkoon/shared/types";
import {
  EditGroup,
  EditPanel,
  OverrideLabel,
} from "@/components/ui/edit-panel";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLibraryTitleOptions } from "@/features/medias/hooks/useLibraryTitleOptions";
import { useUpdateLibraryArtwork } from "@/features/medias/hooks/useUpdateLibraryArtwork";
import { useUpdateLibraryOverrides } from "@/features/medias/hooks/useUpdateLibraryOverrides";
import { useUpdateLibrarySearchTitle } from "@/features/medias/hooks/useUpdateLibrarySearchTitle";
import { ArtworkPicker, isImageUrl, type ArtworkPicks } from "./ArtworkPicker";

type DetailField = "title" | "sort_title" | "year" | "overview";
type DetailForm = Record<DetailField, string>;

/** What TMDB says, for the placeholder of a field that is overridden. */
type TmdbDefaults = {
  title: string | null;
  overview: string | null;
  year: number | null;
};

interface LibraryEditDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  item: LibraryMedia;
  defaultBackdropUrl: string | null;
  tmdb: TmdbDefaults;
  tmdbOriginalTitle: string | null;
  tmdbOriginalLanguage: string | null;
  tmdbTitleTranslations: TitleTranslation[];
  tmdbPending: boolean;
}

export function LibraryEditDetailsPanel(props: LibraryEditDetailsPanelProps) {
  // The body mounts per open so every field starts from the stored values.
  return props.open ? <Body {...props} /> : null;
}

function overrideText(item: LibraryMedia, field: DetailField): string {
  const value = item.overrides?.[field];
  return value == null ? "" : String(value);
}

function Body({
  onClose,
  item,
  defaultBackdropUrl,
  tmdb,
  tmdbOriginalTitle,
  tmdbOriginalLanguage,
  tmdbTitleTranslations,
  tmdbPending,
}: LibraryEditDetailsPanelProps) {
  const { t } = useTranslation("common");
  const ids = {
    title: useId(),
    sort: useId(),
    year: useId(),
    overview: useId(),
  };
  const updateOverrides = useUpdateLibraryOverrides();
  const updateSearchTitle = useUpdateLibrarySearchTitle();
  const updateArtwork = useUpdateLibraryArtwork();

  const initial: DetailForm = {
    title: overrideText(item, "title"),
    sort_title: overrideText(item, "sort_title"),
    year: overrideText(item, "year"),
    overview: overrideText(item, "overview"),
  };
  const [form, setForm] = useState<DetailForm>(initial);
  const [picks, setPicks] = useState<ArtworkPicks>({});
  const [saving, setSaving] = useState(false);

  const options = useLibraryTitleOptions({
    title: item.title,
    originalTitle: tmdbOriginalTitle,
    originalLanguage: tmdbOriginalLanguage,
    translations: tmdbTitleTranslations,
  });
  const persistedQuery = (() => {
    const persisted = item.search_title?.trim().toLocaleLowerCase();
    const match = persisted
      ? options.find((o) => o.query.toLocaleLowerCase() === persisted)
      : undefined;
    return match?.query ?? options[0]?.query ?? "";
  })();
  const [searchQuery, setSearchQuery] = useState(persistedQuery);

  const set = (field: DetailField, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // An empty field falls back to what the page shows, or to TMDB's value when that is overridden.
  const fallback = (field: DetailField, stored: string, fromTmdb: string) =>
    initial[field] !== "" ? fromTmdb || stored : stored;
  const placeholder: DetailForm = {
    title: fallback("title", item.title, tmdb.title ?? ""),
    sort_title: "",
    year: fallback("year", String(item.year ?? ""), String(tmdb.year ?? "")),
    overview: fallback("overview", item.overview ?? "", tmdb.overview ?? ""),
  };
  const overridden = (field: DetailField) => form[field].trim() !== "";
  const overriddenCount = (Object.keys(form) as DetailField[]).filter(
    overridden,
  ).length;

  const changedDetails = (Object.keys(form) as DetailField[]).filter(
    (f) => form[f].trim() !== initial[f],
  );
  const pastedInvalid = (Object.values(picks) as (string | null)[]).some(
    (url) => typeof url === "string" && !isImageUrl(url),
  );
  const searchTitleChanged =
    searchQuery !== persistedQuery && options.length > 0;
  const dirty =
    changedDetails.length > 0 ||
    searchTitleChanged ||
    Object.values(picks).some((v) => v !== undefined);

  const save = async () => {
    const payload: Record<string, string | number | null> = {};
    for (const field of changedDetails) {
      const value = form[field].trim();
      if (field === "year") {
        const parsed = value ? parseInt(value, 10) : null;
        payload.year = Number.isNaN(parsed) ? null : parsed;
      } else {
        payload[field] = value || null;
      }
    }
    setSaving(true);
    try {
      if (Object.keys(payload).length > 0)
        await updateOverrides.mutateAsync({ id: item.id, overrides: payload });
      if (searchTitleChanged) {
        const option = options.find((o) => o.query === searchQuery);
        if (option)
          await updateSearchTitle.mutateAsync({
            id: item.id,
            body: {
              search_title_language: option.languageCode,
              search_title: option.query,
            },
          });
      }
      for (const kind of Object.keys(picks) as ArtworkKind[]) {
        const url = picks[kind];
        if (url !== undefined)
          await updateArtwork.mutateAsync({ id: item.id, kind, url });
      }
      toast.success(t("library.edit.saved"));
      onClose();
    } catch {
      toast.error(t("library.edit.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const reset = t("library.edit.resetToTmdb");

  return (
    <EditPanel
      open
      onClose={onClose}
      title={t("library.edit.title")}
      description={t("library.edit.description")}
      saveLabel={t("library.edit.save")}
      saving={saving}
      canSave={dirty && !pastedInvalid}
      onSave={() => void save()}
    >
      <EditGroup
        title={t("library.edit.details")}
        aside={
          overriddenCount > 0
            ? t("library.edit.overriddenCount", { count: overriddenCount })
            : undefined
        }
      >
        <FormField className="space-y-1.5">
          <OverrideLabel
            htmlFor={ids.title}
            label={t("library.edit.fieldTitle")}
            overridden={overridden("title")}
            resetLabel={reset}
            onReset={() => set("title", "")}
          />
          <Input
            id={ids.title}
            value={form.title}
            placeholder={placeholder.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <FormField className="space-y-1.5">
            <OverrideLabel
              htmlFor={ids.sort}
              label={t("library.edit.fieldSortTitle")}
              overridden={overridden("sort_title")}
              resetLabel={reset}
              onReset={() => set("sort_title", "")}
            />
            <Input
              id={ids.sort}
              value={form.sort_title}
              placeholder={placeholder.sort_title}
              onChange={(e) => set("sort_title", e.target.value)}
            />
          </FormField>
          <FormField className="space-y-1.5">
            <OverrideLabel
              htmlFor={ids.year}
              label={t("library.edit.fieldYear")}
              overridden={overridden("year")}
              resetLabel={reset}
              onReset={() => set("year", "")}
            />
            <Input
              id={ids.year}
              type="number"
              value={form.year}
              placeholder={placeholder.year}
              onChange={(e) => set("year", e.target.value)}
            />
          </FormField>
        </div>

        <FormField className="space-y-1.5">
          <OverrideLabel
            htmlFor={ids.overview}
            label={t("library.edit.fieldOverview")}
            overridden={overridden("overview")}
            resetLabel={reset}
            onReset={() => set("overview", "")}
          />
          <Textarea
            id={ids.overview}
            rows={5}
            value={form.overview}
            placeholder={placeholder.overview}
            onChange={(e) => set("overview", e.target.value)}
            className="resize-y"
          />
        </FormField>
      </EditGroup>

      <EditGroup title={t("library.edit.searchTitle")}>
        {options.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {tmdbPending
              ? t("library.edit.searchTitleLoading")
              : t("library.edit.searchTitleUnavailable")}
          </p>
        ) : (
          <Select value={searchQuery} onValueChange={setSearchQuery}>
            <SelectTrigger aria-label={t("library.edit.searchTitle")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {options.map((option) => (
                <SelectItem key={option.query} value={option.query}>
                  <span className="font-medium">{option.label}</span>
                  <span className="ml-2 text-neutral-400">{option.query}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-neutral-400">
          {t("library.edit.searchTitleHint")}
        </p>
      </EditGroup>

      <EditGroup title={t("library.edit.artwork")}>
        <ArtworkPicker
          libraryId={item.id}
          item={item}
          defaultBackdropUrl={defaultBackdropUrl}
          picks={picks}
          onPick={(kind, url) =>
            setPicks((prev) => {
              const next = { ...prev };
              if (url === undefined) delete next[kind];
              else next[kind] = url;
              return next;
            })
          }
        />
      </EditGroup>
    </EditPanel>
  );
}
