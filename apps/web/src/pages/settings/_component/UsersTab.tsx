import { useState } from "react";
import { InviteLinkPanel } from "@/pages/settings/_component/users/InviteLinkPanel";
import { UsersListSection } from "@/pages/settings/_component/users/UsersListSection";
import { PendingInvitationsSection } from "@/pages/settings/_component/users/PendingInvitationsSection";
import { UserProvisioningSection } from "@/pages/settings/_component/users/UserProvisioningSection";

export function UsersTab() {
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  return (
    <div
      className="animate-in fade-in slide-in-from-right-4 duration-300"
      key="users-tab"
    >
      <div className="space-y-6">
        {generatedLink && (
          <InviteLinkPanel
            link={generatedLink}
            onDismiss={() => setGeneratedLink(null)}
          />
        )}

        <UsersListSection />

        <PendingInvitationsSection onLinkGenerated={setGeneratedLink} />

        <UserProvisioningSection onLinkGenerated={setGeneratedLink} />
      </div>
    </div>
  );
}
