import { Activity, Compass, LayoutDashboard, Library } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  path: string;
  translationKey: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { path: "/", translationKey: "nav.dashboard", icon: LayoutDashboard },
  { path: "/library", translationKey: "nav.library", icon: Library },
  { path: "/find", translationKey: "nav.find", icon: Compass },
  { path: "/activity", translationKey: "nav.activity", icon: Activity },
];

export function isNavRouteActive(path: string, pathname: string): boolean {
  if (path === "/") return pathname === "/";
  if (path === "/library") {
    return (
      pathname === path || pathname.startsWith(`${path}/`) || isBooks(pathname)
    );
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Books sit under Library, so every /books page keeps Library lit. */
function isBooks(pathname: string): boolean {
  return pathname === "/books" || pathname.startsWith("/books/");
}
