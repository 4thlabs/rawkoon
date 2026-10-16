import { createFileRoute } from "@tanstack/react-router";
import { settingsGuard } from "@/pages/settings/_lib/settingsGuard";
import { BooksSettingsPage } from "@/pages/settings/_pages/BooksPage";

export const Route = createFileRoute("/settings/books/")({
  beforeLoad: settingsGuard({ adminOnly: true }),
  component: BooksSettingsPage,
});
