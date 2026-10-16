import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { NavBadge } from "@/components/NavBadge";
import { isNavRouteActive, navItems } from "@/lib/routing/navigation";
import { useActivityBadge } from "@/lib/notifications/useActivityBadge";
import { cn } from "@/lib/utils";

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
  badge = 0,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      style={{ touchAction: "manipulation" }}
      className={tabClass(active)}
    >
      <span className="relative">
        <Icon size={22} className={active ? "scale-110" : ""} />
        <NavBadge count={badge} className="absolute -right-2 -top-1.5" />
      </span>
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
function useTextEntryFocused(): boolean {
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
  const activityBadge = useActivityBadge();
  // Android shrinks the layout viewport for the keyboard, which would float the bar above it.
  const typing = useTextEntryFocused();

  return (
    <div className="lg:hidden">
      <nav
        aria-label={t("nav.mobileTabs")}
        hidden={typing}
        className="fixed inset-x-0 bottom-0 z-[var(--z-navigation)] border-t border-white/[0.08] bg-neutral-900 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-stretch px-1">
          {navItems.map((item) => (
            <TabLink
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={t(item.translationKey)}
              active={isNavRouteActive(item.path, pathname)}
              badge={item.path === "/activity" ? activityBadge : 0}
            />
          ))}
          <AccountMenu variant="tab" side="top" />
        </div>
      </nav>
    </div>
  );
}
