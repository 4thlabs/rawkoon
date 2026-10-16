import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/pages/settings/useQualityProfiles", () => ({
  profileToForm: (p: unknown) => p,
  useCreateQualityProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateQualityProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../QualityProfileTrackerSection", () => ({
  TrackerPrioritySection: () => <div data-testid="trackers" />,
}));
vi.mock("../CustomFormatAssignmentEditor", () => ({
  CustomFormatAssignmentEditor: () => <div data-testid="formats" />,
}));
vi.mock("../QualityProfileMultiSelect", () => ({
  MultiSelect: ({ label }: { label: string }) => <div>{label}</div>,
}));

import { QualityProfileForm } from "../QualityProfileForm";

describe("QualityProfileForm", () => {
  it("shows name, minimum resolution, cutoff and the two HDR options up front", () => {
    render(
      <QualityProfileForm
        editingId={null}
        initialProfile={undefined}
        onDismiss={vi.fn()}
      />,
    );
    const visible = (text: string) => {
      const el = screen.getByText(text);
      return el.closest("details") === null;
    };
    expect(visible("settings.qualityProfiles.name")).toBe(true);
    expect(visible("settings.qualityProfiles.minResolution")).toBe(true);
    expect(visible("settings.qualityProfiles.cutoffResolution")).toBe(true);
    expect(visible("settings.qualityProfiles.preferHdr")).toBe(true);
    expect(visible("settings.qualityProfiles.requireHdr")).toBe(true);
  });

  it("puts every other field behind a closed Advanced section", () => {
    render(
      <QualityProfileForm
        editingId={null}
        initialProfile={undefined}
        onDismiss={vi.fn()}
      />,
    );
    const details = document.querySelector("details");
    expect(details?.open).toBe(false);
    for (const text of [
      "settings.qualityProfiles.preferredSources",
      "settings.qualityProfiles.preferredCodecs",
      "settings.qualityProfiles.preferredLanguages",
      "settings.qualityProfiles.preferredSearchLanguage",
      "settings.qualityProfiles.maxSizeGb",
      "customFormats.minSeeders",
      "settings.qualityProfiles.grabDelayMinutes",
    ]) {
      expect(screen.getByText(text).closest("details")).toBe(details);
    }
    expect(screen.getByTestId("trackers").closest("details")).toBe(details);
    expect(screen.getByTestId("formats").closest("details")).toBe(details);
  });
});
