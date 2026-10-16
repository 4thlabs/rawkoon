import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { MediaPostProcessingSettings } from "@rawkoon/shared/types";

const mutateAsync = vi.fn(async () => ({}));
vi.mock("@/features/medias/hooks/useUpdateMediaPostProcessingSettings", () => ({
  useUpdateMediaPostProcessingSettings: () => ({
    mutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/features/seeding/hooks/useSeeding", () => ({
  useSeeding: () => ({
    data: {
      enabled: false,
      torrents: [],
      released_today: [],
      would_release_now: { count: 4, bytes: 1024 },
    },
  }),
}));
vi.mock("@/features/seeding/hooks/useSeedRules", () => ({
  useSeedRules: () => ({ data: { indexers: [] }, isLoading: false }),
  useUpsertSeedRule: () => ({ mutateAsync: vi.fn() }),
  useDeleteSeedRule: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SeedingSettingsSection } from "./SeedingSettingsSection";

const settings = {
  min_seed_ratio: 1,
  public_seed_time_mins: null,
  private_seed_ratio: 1,
  private_seed_time_mins: 4320,
  seed_sweep_enabled: false,
  file_operation: "hardlink",
  blocked_extensions: [],
} as unknown as MediaPostProcessingSettings;

describe("SeedingSettingsSection", () => {
  it("previews what enabling would release while it is off", () => {
    render(<SeedingSettingsSection settings={settings} />);
    expect(screen.getByText(/^settings\.seeding\.preview/)).toBeInTheDocument();
  });
  it("keeps the stored time targets and lets a ratio be cleared", async () => {
    mutateAsync.mockClear();
    render(<SeedingSettingsSection settings={settings} />);
    fireEvent.change(screen.getAllByLabelText("settings.seeding.ratio")[0], {
      target: { value: "" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "settings.seeding.save" }),
    );
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        seed_sweep_enabled: false,
        min_seed_ratio: 0,
        public_seed_time_mins: null,
        private_seed_ratio: 1,
        private_seed_time_mins: 4320,
      }),
    );
  });

  it("saves 'ratio or days' for public trackers", async () => {
    mutateAsync.mockClear();
    render(<SeedingSettingsSection settings={settings} />);
    fireEvent.change(screen.getAllByLabelText("settings.seeding.orAfter")[0], {
      target: { value: "7" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "settings.seeding.save" }),
    );
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        seed_sweep_enabled: false,
        min_seed_ratio: 1,
        public_seed_time_mins: 10080,
        private_seed_ratio: 1,
        private_seed_time_mins: 4320,
      }),
    );
  });

  it("keeps per-indexer overrides behind Advanced", () => {
    const { container } = render(
      <SeedingSettingsSection settings={settings} />,
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
  });
});
