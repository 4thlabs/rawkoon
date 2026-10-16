import { BooksSettingsTab } from "@/pages/settings/_component/BooksSettingsTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function BooksSettingsPage() {
  return (
    <SettingsPageShell id="books">
      <BooksSettingsTab />
    </SettingsPageShell>
  );
}
