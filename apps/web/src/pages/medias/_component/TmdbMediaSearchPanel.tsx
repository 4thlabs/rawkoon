import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { useTmdbMediaSearch } from "@/features/medias/hooks/useTmdbMediaSearch";
import { type TmdbMediaSearchItem } from "@rawkoon/shared/types";
import { TmdbResultCard } from "@/pages/medias/_component/TmdbResultCard";
import { ExploreCardDetailDialog } from "@/pages/medias/_component/ExploreCardDetailDialog";

interface Props {
  /** Ref forwarded from parent so focus() can be called synchronously on user tap */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** "modal" strips the card wrapper — use when rendering inside a full-screen overlay */
  variant?: "default" | "modal";
}

export function TmdbMediaSearchPanel({
  inputRef: externalInputRef,
  variant = "default",
}: Props = {}) {
  const { t, i18n } = useTranslation("common");
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedItem, setSelectedItem] = useState<TmdbMediaSearchItem | null>(
    null,
  );
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const trimmedInput = input.trim();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(trimmedInput);
    }, 350);
    return () => clearTimeout(timeout);
  }, [trimmedInput]);

  const searchEnabled = debounced.length >= 2;
  const searchQuery = useTmdbMediaSearch(debounced, {
    enabled: searchEnabled,
    language: i18n.language,
  });

  const results = useMemo(
    () => searchQuery.data?.items ?? [],
    [searchQuery.data?.items],
  );

  const searchContent = (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          aria-label={t("medias.tmdb.placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("medias.tmdb.placeholder")}
          className="focus-ring w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-8 pr-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-400 focus:border-primary-500 transition"
        />
      </div>

      {searchEnabled ? (
        searchQuery.isLoading ? (
          <div className="text-sm text-neutral-400">
            {t("medias.tmdb.searching")}
          </div>
        ) : results.length === 0 ? (
          <div className="text-sm text-neutral-400">
            {t("medias.tmdb.noResults")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {results.map((item) => (
              <TmdbResultCard
                key={item.id}
                item={item}
                onOpenDetails={() => setSelectedItem(item)}
                onAdded={() => void searchQuery.refetch()}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-xs text-neutral-400">{t("medias.tmdb.hint")}</div>
      )}
    </div>
  );

  const dialog = selectedItem && (
    <ExploreCardDetailDialog
      item={selectedItem}
      isOpen
      onClose={() => setSelectedItem(null)}
      onAdded={() => {
        setSelectedItem(null);
        searchQuery.refetch();
      }}
    />
  );

  if (variant === "modal") {
    return (
      <>
        {searchContent}
        {dialog}
      </>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-neutral-700/60 bg-neutral-900 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-800">
          <p className="text-sm font-semibold text-neutral-50">
            {t("medias.tmdb.title")}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t("medias.tmdb.subtitle")}
          </p>
        </div>
        <div className="p-4">{searchContent}</div>
      </section>
      {dialog}
    </>
  );
}
