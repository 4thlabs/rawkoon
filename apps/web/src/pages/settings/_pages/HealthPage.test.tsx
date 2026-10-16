import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let checks: { id: string; status: string }[] = [];
let attentionItems: unknown[] = [];
let issues = 0;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: { count?: number }) =>
      o?.count != null ? `${k}:${o.count}` : k,
  }),
}));
vi.mock("@/features/medias/hooks/useGrabReadiness", () => ({
  useGrabReadiness: () => ({ isLoading: false, data: { checks } }),
}));
vi.mock("@/features/medias/hooks/useLibraryAttention", () => ({
  useLibraryAttention: () => ({
    isLoading: false,
    data: { items: attentionItems },
  }),
}));
vi.mock("@/pages/settings/useLibraryHealth", () => ({
  useLibraryHealth: () => ({
    isLoading: false,
    data: { latest: { summary: { total_issues: issues } } },
  }),
}));
vi.mock("@/pages/_component/LibraryAttentionPanel", () => ({
  LibraryAttentionPanel: () => <div>attention-panel</div>,
}));
vi.mock("@/pages/_component/RssStatusPanel", () => ({
  RssStatusPanel: () => <div>rss-panel</div>,
}));
vi.mock("@/pages/settings/_component/GrabReadinessChecklist", () => ({
  GrabReadinessChecklist: () => <div>readiness-checklist</div>,
}));
vi.mock("@/pages/settings/_component/LibraryHealthCard", () => ({
  LibraryHealthCard: () => <div>library-health</div>,
}));

import { HealthPage } from "./HealthPage";

describe("HealthPage", () => {
  it("combines readiness, library health, attention and the RSS status", () => {
    checks = [];
    attentionItems = [];
    issues = 0;
    render(<HealthPage />);
    for (const text of [
      "readiness-checklist",
      "library-health",
      "attention-panel",
      "rss-panel",
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByText("settings.health.allClear")).toBeTruthy();
  });

  it("counts failing checks, attention alerts and library issues together", () => {
    checks = [
      { id: "a", status: "error" },
      { id: "b", status: "ok" },
    ];
    attentionItems = [{}, {}];
    issues = 3;
    render(<HealthPage />);
    expect(screen.getByText("settings.health.needsAttention:6")).toBeTruthy();
  });
});
