import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mutateAsync = vi.fn();
let active: string | null = "prowlarr";
let prowlarrEnabled = true;
let jackettEnabled = false;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/medias/hooks/useMediaPostProcessingSettings", () => ({
  useMediaPostProcessingSettings: () => ({
    data: { settings: { active_indexer_manager: active } },
  }),
}));
vi.mock("@/features/medias/hooks/useUpdateMediaPostProcessingSettings", () => ({
  useUpdateMediaPostProcessingSettings: () => ({ mutateAsync }),
}));
vi.mock("@/pages/settings/useProwlarrIntegration", () => ({
  useProwlarrIntegration: () => ({
    data: { integration: { enabled: prowlarrEnabled } },
  }),
}));
vi.mock("@/pages/settings/useJackettIntegration", () => ({
  useJackettIntegration: () => ({
    data: { integration: { enabled: jackettEnabled } },
  }),
}));
vi.mock("../integrations/ProwlarrIntegrationSection", () => ({
  ProwlarrIntegrationSection: () => <div>prowlarr-fields</div>,
}));
vi.mock("../integrations/JackettIntegrationSection", () => ({
  JackettIntegrationSection: () => <div>jackett-fields</div>,
}));

import { IndexersCard } from "../integrations/IndexersCard";

describe("IndexersCard", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({});
    active = "prowlarr";
    prowlarrEnabled = true;
    jackettEnabled = false;
  });

  it("shows the active manager's fields", () => {
    render(<IndexersCard />);
    expect(screen.getByText("prowlarr-fields")).toBeTruthy();
    expect(screen.queryByText("jackett-fields")).toBeNull();
  });

  it("switching sets the active manager and shows that manager's fields", async () => {
    render(<IndexersCard />);
    fireEvent.click(screen.getByText("Jackett"));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        active_indexer_manager: "jackett",
      }),
    );
    expect(screen.getByText("jackett-fields")).toBeTruthy();
    expect(screen.queryByText("prowlarr-fields")).toBeNull();
  });

  it("falls back to the enabled manager when none is stored", () => {
    active = null;
    prowlarrEnabled = false;
    jackettEnabled = true;
    render(<IndexersCard />);
    expect(screen.getByText("jackett-fields")).toBeTruthy();
  });

  it("reverts the switch when saving fails", async () => {
    mutateAsync.mockRejectedValue(new Error("nope"));
    render(<IndexersCard />);
    fireEvent.click(screen.getByText("Jackett"));
    await waitFor(() =>
      expect(screen.getByText("prowlarr-fields")).toBeTruthy(),
    );
  });

  it("does not call the server when the active manager is picked again", () => {
    render(<IndexersCard />);
    fireEvent.click(screen.getByText("Prowlarr"));
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
