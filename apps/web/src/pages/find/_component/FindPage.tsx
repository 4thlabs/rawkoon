import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/PageLayout";
import { DiscoverPanel } from "@/pages/medias/_component/DiscoverPanel";
import { FindModeSwitch } from "./FindModeSwitch";
import { rememberFindMode } from "./findMode";
import { FindResults } from "./FindResults";
import { FindShelves } from "./FindShelves";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 350;

/** Browse: one search field over everything, shelves, and the filterable grid. */
export function FindPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const search = useSearch({ from: "/find/" });
  const { q } = search;
  const searchRef = useRef(search);
  searchRef.current = search;
  const [input, setInput] = useState(q ?? "");
  const committed = useRef(q ?? "");

  useEffect(() => rememberFindMode("browse"), []);

  // A query arriving from elsewhere (the command palette) fills the field.
  useEffect(() => {
    if ((q ?? "") !== committed.current) {
      committed.current = q ?? "";
      setInput(q ?? "");
    }
  }, [q]);

  useEffect(() => {
    const next = input.trim();
    if (next === committed.current) return;
    const timer = setTimeout(() => {
      committed.current = next;
      void navigate({
        to: "/find",
        search: { ...searchRef.current, q: next || undefined, page: undefined },
        replace: true,
        resetScroll: false,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, navigate]);

  const query = (q ?? "").trim();
  const searching = query.length >= MIN_QUERY;

  return (
    <PageLayout>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
          {t("find.title")}
        </h1>
        <FindModeSwitch mode="browse" />
      </div>

      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={t("find.placeholder")}
          placeholder={t("find.placeholder")}
          className="focus-ring h-11 w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-10 pr-10 text-sm text-neutral-100 placeholder:text-neutral-400 focus:border-primary-500"
        />
        {input && (
          <button
            type="button"
            onClick={() => setInput("")}
            aria-label={t("find.clear")}
            className="focus-ring absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:text-neutral-100"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mb-8">
        <FindShelves />
      </div>

      {searching ? <FindResults query={query} /> : <DiscoverPanel />}
    </PageLayout>
  );
}
