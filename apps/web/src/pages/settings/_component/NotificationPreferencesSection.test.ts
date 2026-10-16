import { describe, expect, it } from "vitest";
import { NOTIFICATION_PREFERENCE_KEYS } from "@rawkoon/shared/types/notificationPreferences";
import { NOTIFICATION_PREFERENCE_GROUPS } from "./NotificationPreferencesSection";

describe("NOTIFICATION_PREFERENCE_GROUPS", () => {
  it("shows every preference in exactly one group", () => {
    const grouped = NOTIFICATION_PREFERENCE_GROUPS.flatMap((group) =>
      Object.keys(group.keys),
    );
    expect([...grouped].sort()).toEqual(
      [...NOTIFICATION_PREFERENCE_KEYS].sort(),
    );
  });
});
