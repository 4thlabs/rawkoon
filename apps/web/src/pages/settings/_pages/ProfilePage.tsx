import { ProfileForm } from "@/pages/settings/_component/ProfileForm";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

export function ProfilePage() {
  return (
    <SettingsPageShell id="profile">
      <div className="rounded-xl border border-neutral-700 bg-neutral-800 p-6">
        <ProfileForm part="profile" />
      </div>
    </SettingsPageShell>
  );
}
