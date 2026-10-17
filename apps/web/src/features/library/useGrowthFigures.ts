import { useAuth } from "@/lib/auth/useAuth";
import { useFeatures } from "@/lib/routing/useFeatures";
import { deltaPercent, isGrowthEmpty, metricIn } from "./growthMath";
import { useLibraryGrowth } from "./useLibraryGrowth";

export const monthName = (start: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
    new Date(`${start}T00:00:00Z`),
  );

/** The growth numbers both the Home widget and the Library strip show. */
export function useGrowthFigures() {
  const { user } = useAuth();
  const features = useFeatures();
  const query = useLibraryGrowth();
  const growth = query.data?.growth;

  if (query.isError || !growth || isGrowthEmpty(growth)) return null;

  const booksEnabled = features.data?.books_enabled !== false;
  const showBytes = user?.is_admin === true && growth.month.bytes !== null;
  const current = metricIn(growth.month, showBytes, booksEnabled);
  const previous = metricIn(growth.previous_to_date, showBytes, booksEnabled);
  return {
    growth,
    booksEnabled,
    showBytes,
    current,
    previous,
    percent: deltaPercent(current, previous),
  };
}
