import { useTranslation } from "react-i18next";

/**
 * One merged metadata field.
 *
 * The `title` attribute names the source the value came from, so provenance is
 * visible on hover without a dedicated component. A field with no entry in
 * metadata_sources was either never enriched or was set by hand — in which case
 * the operator is the source and naming one would be a lie.
 */
export function MetaField({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source?: string;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      title={
        source
          ? t("books.detail.metadata.from", { source })
          : t("books.detail.metadata.manual")
      }
    >
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-200">{value}</dd>
    </div>
  );
}
