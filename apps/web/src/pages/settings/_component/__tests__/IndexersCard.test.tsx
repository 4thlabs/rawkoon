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
  ProwlarrIntegrationSection: ({
    onSaved,
  }: {
    onSaved?: (e: boolean) => void;
  }) => (
    <button type="button" onClick={() => onSaved?.(true)}>
      prowlarr-fields
    </button>
  ),
}));
vi.mock("../integrations/JackettIntegrationSection", () => ({
  JackettIntegrationSection: ({
    onSaved,
  }: {
    onSaved?: (e: boolean) => void;
  }) => (
    <button type="button" onClick={() => onSaved?.(true)}>
      jackett-fields
    </button>
  ),
}));

import { IndexersCard } from "../integrations/IndexersCard";

describe("IndexersCard", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockImplementation(
      async (body: { active_indexer_manager: string }) => {
        active = body.active_indexer_manager;
        return {};
      },
    );
    active = "prowlarr";
    prowlarrEnabled = true;
    jackettEnabled = false;
  });

  it("shows the active manager's fields", () => {
    render(<IndexersCard />);
    expect(screen.getByText("prowlarr-fields")).toBeTruthy();
    expect(screen.queryByText("jackett-fields")).toBeNull();
  });

  it("switching to an enabled manager sets it active and shows its fields", async () => {
    jackettEnabled = true;
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

  it("refuses to activate a manager that is not enabled, and hints to save it", () => {
    render(<IndexersCard />);
    fireEvent.click(screen.getByText("Jackett"));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText("jackett-fields")).toBeTruthy();
    expect(
      screen.getByText("settings.connections.indexers.saveToActivate"),
    ).toBeTruthy();
  });

  it("activates the manager once its own save enables it", async () => {
    render(<IndexersCard />);
    fireEvent.click(screen.getByText("Jackett"));
    fireEvent.click(screen.getByText("jackett-fields"));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        active_indexer_manager: "jackett",
      }),
    );
  });

  it("falls back to the enabled manager when none is stored", () => {
    active = null;
    prowlarrEnabled = false;
    jackettEnabled = true;
    render(<IndexersCard />);
    expect(screen.getByText("jackett-fields")).toBeTruthy();
  });

  it("reverts the switch when saving fails", async () => {
    jackettEnabled = true;
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
