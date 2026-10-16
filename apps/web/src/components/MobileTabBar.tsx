import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useRouterState } from "@tanstack/react-router";
import * as RadixDialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Inbox,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TmdbSearchModal } from "@/pages/medias/_component/TmdbSearchModal";
import { visibleNavSections } from "@/lib/routing/navigation";
import { useFeatures } from "@/lib/routing/useFeatures";
import { useLanguageToggle } from "@/lib/app/useLanguageToggle";
import { useSignOut } from "@/lib/auth/useSignOut";
import { cn } from "@/lib/utils";

/** Routes that live on the bar itself; the More sheet lists everything else. */
export const TAB_BAR_PATHS = ["/", "/library", "/requests"];

export function isTabBarRoute(path: string, pathname: string): boolean {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

const tabClass = (active: boolean) =>
  cn(
    "focus-ring flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium leading-none transition-colors",
    active ? "text-primary-300" : "text-neutral-400 active:text-neutral-200",
  );

function TabLink({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      style={{ touchAction: "manipulation" }}
      className={tabClass(active)}
    >
      <Icon size={22} className={active ? "scale-110" : ""} />
      <span>{label}</span>
    </Link>
  );
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
]);

function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(el.type);
}

/** True while a text field has focus, i.e. while the on-screen keyboard is likely up. */
export function useTextEntryFocused(): boolean {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const onIn = (e: FocusEvent) => setFocused(isTextEntry(e.target));
    const onOut = (e: FocusEvent) => {
      if (!isTextEntry(e.relatedTarget)) setFocused(false);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return focused;
}

export function MobileTabBar() {
  const { t } = useTranslation("common");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: features } = useFeatures();
  const language = useLanguageToggle();
  const signOut = useSignOut();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Android shrinks the layout viewport for the keyboard, which would float the bar above it.
  const typing = useTextEntryFocused();

  // The single place a phone opens search: commit the open state synchronously
  // so the input is no longer inert and focus() still runs inside the tap.
  function openSearch() {
    flushSync(() => setSearchOpen(true));
    searchInputRef.current?.focus();
  }

  const moreItems = visibleNavSections(features ?? {})
    .flatMap((section) => section.items)
    .filter((item) => !TAB_BAR_PATHS.includes(item.path));
  const moreActive =
    !TAB_BAR_PATHS.some((p) => isTabBarRoute(p, pathname)) && !searchOpen;
  const closeMore = () => setMoreOpen(false);

  const rowClass =
    "focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-neutral-200 active:bg-white/[0.08]";

  return (
    <div className="lg:hidden">
      <nav
        aria-label={t("nav.mobileTabs")}
        hidden={typing}
        className="fixed inset-x-0 bottom-0 z-[var(--z-navigation)] border-t border-white/[0.08] bg-neutral-900 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-stretch px-1">
          <TabLink
            to="/"
            icon={LayoutDashboard}
            label={t("nav.dashboard")}
            active={!searchOpen && isTabBarRoute("/", pathname)}
          />
          <button
            type="button"
            onClick={openSearch}
            aria-haspopup="dialog"
            style={{ touchAction: "manipulation" }}
            className={tabClass(searchOpen)}
          >
            <Search size={22} />
            <span>{t("nav.search")}</span>
          </button>
          <TabLink
            to="/library"
            icon={Library}
            label={t("nav.library")}
            active={!searchOpen && isTabBarRoute("/library", pathname)}
          />
          <TabLink
            to="/requests"
            icon={Inbox}
            label={t("nav.requests")}
            active={!searchOpen && isTabBarRoute("/requests", pathname)}
          />
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            style={{ touchAction: "manipulation" }}
            className={tabClass(moreActive)}
          >
            <Menu size={22} />
            <span>{t("nav.more")}</span>
          </button>
        </div>
      </nav>

      <TmdbSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        inputRef={searchInputRef}
        onAdded={() => setSearchOpen(false)}
      />

      <RadixDialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
          <RadixDialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-[var(--z-modal)] max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-neutral-700 bg-neutral-900 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
          >
            <div className="flex items-center justify-between px-3 pb-2">
              <RadixDialog.Title className="text-sm font-semibold text-neutral-50">
                {t("nav.more")}
              </RadixDialog.Title>
              <RadixDialog.Close
                aria-label={t("common.close")}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-neutral-400 active:bg-white/[0.08]"
              >
                <X size={18} />
              </RadixDialog.Close>
            </div>

            <div className="grid grid-cols-3 gap-1 border-b border-neutral-800 pb-3">
              {moreItems.map((item) => {
                const active = isTabBarRoute(item.path, pathname);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMore}
                    className={cn(
                      "focus-ring flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-medium",
                      active
                        ? "bg-primary-500/10 text-primary-300"
                        : "text-neutral-300 active:bg-white/[0.08]",
                    )}
                  >
                    <item.icon size={22} />
                    <span className="w-full truncate text-center">
                      {t(item.translationKey)}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="space-y-0.5 pt-2">
              <Link
                to="/notifications"
                onClick={closeMore}
                className={rowClass}
              >
                <Bell size={18} />
                {t("notifications.title")}
              </Link>
              <Link
                to="/settings"
                search={{ tab: "profile" }}
                onClick={closeMore}
                className={rowClass}
              >
                <Settings size={18} />
                {t("settings.title")}
              </Link>
              <button
                type="button"
                onClick={language.toggle}
                className={cn(rowClass, "justify-between")}
              >
                <span className="text-neutral-400">{t("common.language")}</span>
                <span>{language.currentName}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMore();
                  void signOut();
                }}
                className={rowClass}
              >
                <LogOut size={18} />
                {t("nav.logout")}
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </div>
  );
}
