import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  EditGroup,
  EditPanel,
  OverrideLabel,
} from "@/components/ui/edit-panel";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateBookOverrides } from "@/pages/books/_hooks/useUpdateBookOverrides";
import { ApiError } from "@/lib/api/client";
import type { Book, BookOverridesRequest } from "@rawkoon/shared/types";

/**
 * Manual metadata editing.
 *
 * The same panel shell as movies and shows, with one difference that matters:
 * clearing a field here does not blank it, it hands the field back to the
 * metadata source chain and the server re-merges. So Reset is a revert, not a
 * delete, and it takes effect on Save like every other change.
 *
 * `authors` is absent on purpose — it is maintained by a trigger over the
 * book_authors join table, not writable as a column.
 */

type FieldKind = "text" | "number" | "list" | "textarea";

type FieldDef = {
  key: keyof BookOverridesRequest;
  labelKey: string;
  kind: FieldKind;
  /** Reads the effective (merged) value currently shown for the book. */
  current: (b: Book) => string;
};

const FIELDS: FieldDef[] = [
  { key: "title", labelKey: "title", kind: "text", current: (b) => b.title },
  {
    key: "subtitle",
    labelKey: "subtitle",
    kind: "text",
    current: (b) => b.subtitle ?? "",
  },
  {
    key: "series_name",
    labelKey: "seriesName",
    kind: "text",
    current: (b) => b.series_name ?? "",
  },
  {
    key: "series_position",
    labelKey: "seriesPosition",
    kind: "number",
    current: (b) =>
      b.series_position == null ? "" : String(b.series_position),
  },
  {
    key: "narrators",
    labelKey: "narrators",
    kind: "list",
    current: (b) => b.narrators.join(", "),
  },
  {
    key: "genres",
    labelKey: "genres",
    kind: "list",
    current: (b) => b.genres.join(", "),
  },
  {
    key: "publisher",
    labelKey: "publisher",
    kind: "text",
    current: (b) => b.publisher ?? "",
  },
  {
    key: "page_count",
    labelKey: "pageCount",
    kind: "number",
    current: (b) => (b.page_count == null ? "" : String(b.page_count)),
  },
  {
    key: "published_date",
    labelKey: "publishedDate",
    kind: "text",
    current: (b) => b.published_date?.slice(0, 10) ?? "",
  },
  {
    key: "published_year",
    labelKey: "publishedYear",
    kind: "number",
    current: (b) => (b.published_year == null ? "" : String(b.published_year)),
  },
  {
    key: "rating",
    labelKey: "rating",
    kind: "number",
    current: (b) => (b.rating == null ? "" : String(b.rating)),
  },
  {
    key: "rating_count",
    labelKey: "ratingCountLabel",
    kind: "number",
    current: (b) => (b.rating_count == null ? "" : String(b.rating_count)),
  },
  {
    key: "language",
    labelKey: "language",
    kind: "text",
    current: (b) => b.language,
  },
  {
    key: "isbn13",
    labelKey: "isbn",
    kind: "text",
    current: (b) => b.isbn13 ?? "",
  },
  {
    key: "cover_url",
    labelKey: "coverUrl",
    kind: "text",
    current: (b) => b.cover_url ?? "",
  },
  {
    key: "overview",
    labelKey: "overview",
    kind: "textarea",
    current: (b) => b.overview ?? "",
  },
];

const GROUPS: { titleKey: string; fields: (keyof BookOverridesRequest)[] }[] = [
  {
    titleKey: "details",
    fields: ["title", "subtitle", "overview", "narrators", "genres"],
  },
  {
    titleKey: "publication",
    fields: [
      "series_name",
      "series_position",
      "publisher",
      "published_date",
      "published_year",
      "page_count",
      "language",
      "isbn13",
    ],
  },
  { titleKey: "rating", fields: ["rating", "rating_count"] },
  { titleKey: "cover", fields: ["cover_url"] },
];

/** Stored override keys are camelCase; the form is keyed by wire names. */
const STORED_KEY: Record<string, string> = {
  series_name: "seriesName",
  series_position: "seriesPosition",
  page_count: "pageCount",
  published_date: "publishedDate",
  published_year: "publishedYear",
  rating_count: "ratingCount",
  cover_url: "coverUrl",
};

/**
 * Returns null when the input is not valid for its field.
 *
 * Coercing unparseable text to a null payload would read as a deliberate
 * revert on the server, silently destroying an existing override and
 * reporting success, so a bad number is refused here instead.
 */
function toPayload(f: FieldDef, raw: string): BookOverridesRequest | null {
  const value = raw.trim();
  if (!value) return { [f.key]: null } as BookOverridesRequest;
  if (f.kind === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return { [f.key]: n } as BookOverridesRequest;
  }
  if (f.kind === "list") {
    return {
      [f.key]: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    } as BookOverridesRequest;
  }
  return { [f.key]: value } as BookOverridesRequest;
}

export function BookEditDetailsPanel({
  open,
  onClose,
  book,
}: {
  open: boolean;
  onClose: () => void;
  book: Book;
}) {
  // The body mounts per open so every field starts from the stored values.
  return open ? <Body onClose={onClose} book={book} /> : null;
}

function Body({ onClose, book }: { onClose: () => void; book: Book }) {
  const { t } = useTranslation("common");
  const idPrefix = useId();
  const update = useUpdateBookOverrides(book.id);

  // Only touched fields live in `edits`, so a refetch while the panel is open
  // (a live event) updates the rest without eating what was typed.
  const initial: Record<string, string> = Object.fromEntries(
    FIELDS.map((f) => [f.key, f.current(book)]),
  );
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reverting, setReverting] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const valueOf = (key: string) => edits[key] ?? initial[key] ?? "";

  const overrides = (book.overrides ?? {}) as Record<string, unknown>;
  // Not Object.hasOwn: the web tsconfig targets below ES2022.
  const stored = (key: string) =>
    Object.prototype.hasOwnProperty.call(overrides, STORED_KEY[key] ?? key);
  const isDirty = (key: string) => valueOf(key) !== (initial[key] ?? "");
  const isOverridden = (key: string) =>
    !reverting.has(key) && (stored(key) || isDirty(key));
  const changed = FIELDS.filter((f) => reverting.has(f.key) || isDirty(f.key));

  const setField = (key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setReverting((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const revert = (f: FieldDef) => {
    if (stored(f.key)) {
      setReverting((prev) => new Set(prev).add(f.key));
      setEdits((prev) => ({ ...prev, [f.key]: "" }));
    } else {
      setEdits(({ [f.key]: _dropped, ...rest }) => rest);
    }
  };

  const save = async () => {
    const payload: BookOverridesRequest = {};
    for (const f of changed) {
      const next = reverting.has(f.key)
        ? ({ [f.key]: null } as BookOverridesRequest)
        : toPayload(f, valueOf(f.key));
      if (!next) {
        toast.error(t("books.detail.overrides.invalidNumber"));
        return;
      }
      Object.assign(payload, next);
    }
    setSaving(true);
    try {
      await update.mutateAsync(payload);
      toast.success(t("library.edit.saved"));
      onClose();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : t("books.detail.overrides.failed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldFor = (key: keyof BookOverridesRequest) =>
    FIELDS.find((f) => f.key === key) as FieldDef;

  const renderField = (f: FieldDef) => {
    const id = `${idPrefix}-${f.key}`;
    const label =
      f.key === "cover_url"
        ? t("library.edit.pasteImageUrl")
        : t(`books.detail.metadata.${f.labelKey}`, f.labelKey);
    const value = valueOf(f.key);
    const hint = reverting.has(f.key)
      ? t("books.detail.overrides.revertsOnSave")
      : f.kind === "list"
        ? t("books.detail.overrides.listHint")
        : undefined;
    return (
      <FormField key={f.key} className="space-y-1.5">
        <OverrideLabel
          htmlFor={id}
          label={label}
          overridden={isOverridden(f.key)}
          resetLabel={t("books.detail.overrides.revert")}
          onReset={() => revert(f)}
        />
        {f.kind === "textarea" ? (
          <Textarea
            id={id}
            rows={6}
            value={value}
            className="resize-y"
            onChange={(e) => setField(f.key, e.target.value)}
          />
        ) : (
          <Input
            id={id}
            value={value}
            inputMode={f.kind === "number" ? "decimal" : undefined}
            placeholder={hint}
            onChange={(e) => setField(f.key, e.target.value)}
          />
        )}
      </FormField>
    );
  };

  return (
    <EditPanel
      open
      onClose={onClose}
      title={t("library.edit.title")}
      description={t("books.detail.overrides.hint")}
      saveLabel={t("library.edit.save")}
      saving={saving}
      canSave={changed.length > 0}
      onSave={() => void save()}
    >
      {GROUPS.map((group) => (
        <EditGroup
          key={group.titleKey}
          title={t(`books.detail.overrides.group.${group.titleKey}`)}
        >
          {group.fields.map((key) => renderField(fieldFor(key)))}
        </EditGroup>
      ))}
      <p className="text-xs text-neutral-400">
        {t("books.detail.overrides.authorsNote")}
      </p>
    </EditPanel>
  );
}
