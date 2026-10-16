import { JobsTab } from "@/pages/settings/_component/JobsTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function JobsPage() {
  return (
    <SettingsPageShell id="jobs">
      <JobsTab />
    </SettingsPageShell>
  );
}
