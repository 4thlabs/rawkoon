import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DownloadClientHookConfig } from "@rawkoon/shared/types";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm/ConfirmContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useFetcher } from "@/lib/api/context";
import { INTEGRATION_ENDPOINTS } from "@/lib/endpoints";
import { queryKeys } from "@/lib/queryKeys";
import { IntegrationUrlInput } from "./IntegrationUrlInput";
import { HOOK_I18N } from "./downloadClientHookI18n";
import { LabeledField } from "./DownloadClientFields";
import { HookStatusBanner, ScriptCollapse } from "./DownloadClientHookParts";

export function DownloadClientHookSection() {
  const query = useDownloadClientHook();
  return (
    <DownloadClientHookSectionImpl
      key={query.dataUpdatedAt || "pending"}
      config={query.data}
      loading={query.isLoading}
    />
  );
}

function useDownloadClientHook() {
  const fetcher = useFetcher();
  return useQuery({
    queryKey: queryKeys.integrations.downloadClientHook(),
    queryFn: () =>
      fetcher<DownloadClientHookConfig>(
        INTEGRATION_ENDPOINTS.DOWNLOAD_CLIENT_HOOK,
      ),
    refetchOnMount: "always",
    staleTime: 0,
  });
}

function DownloadClientHookSectionImpl({
  config,
  loading,
}: {
  config: DownloadClientHookConfig | undefined;
  loading: boolean;
}) {
  const { t } = useTranslation("common");
  const fetcher = useFetcher();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const [callbackUrl, setCallbackUrl] = useState(config?.callbackUrl ?? "");
  const [autoConfigure, setAutoConfigure] = useState(
    config?.autoConfigure ?? true,
  );
  const [activeHookedSecs, setActiveHookedSecs] = useState(
    String(config?.activeHookedSecs ?? 120),
  );
  const [delugeOpen, setDelugeOpen] = useState(false);
  const [transmissionOpen, setTransmissionOpen] = useState(false);

  const notConfigured = config?.status === "not-configured";
  const status = config?.status;

  const isDirty = useMemo(() => {
    if (!config) return false;
    const secs = Number(activeHookedSecs);
    return (
      callbackUrl !== (config.callbackUrl ?? "") ||
      autoConfigure !== config.autoConfigure ||
      (Number.isFinite(secs) ? secs : -1) !== config.activeHookedSecs
    );
  }, [activeHookedSecs, autoConfigure, callbackUrl, config]);

  const save = useMutation({
    mutationFn: (body: {
      callbackUrl: string | null;
      autoConfigure: boolean;
      activeHookedSecs: number;
    }) =>
      fetcher<DownloadClientHookConfig>(
        INTEGRATION_ENDPOINTS.DOWNLOAD_CLIENT_HOOK,
        { method: "PUT", body },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.downloadClientHook(),
      });
      toast.success(t(`${HOOK_I18N}.saveSuccess`));
    },
    onError: () => toast.error(t(`${HOOK_I18N}.saveError`)),
  });

  const rotate = useMutation({
    mutationFn: () =>
      fetcher<DownloadClientHookConfig>(
        INTEGRATION_ENDPOINTS.DOWNLOAD_CLIENT_HOOK_ROTATE,
        { method: "POST" },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.downloadClientHook(),
      });
      toast.success(t(`${HOOK_I18N}.rotateSuccess`));
    },
    onError: () => toast.error(t(`${HOOK_I18N}.rotateError`)),
  });

  const handleSave = () => {
    const secs = Number(activeHookedSecs);
    if (!Number.isFinite(secs) || secs < 1) {
      toast.error(t(`${HOOK_I18N}.saveError`));
      return;
    }
    const trimmed = callbackUrl.trim();
    save.mutate({
      callbackUrl: trimmed === "" ? null : trimmed,
      autoConfigure,
      activeHookedSecs: Math.trunc(secs),
    });
  };

  const handleReset = () => {
    setCallbackUrl(config?.callbackUrl ?? "");
    setAutoConfigure(config?.autoConfigure ?? true);
    setActiveHookedSecs(String(config?.activeHookedSecs ?? 120));
  };

  const handleRotate = () => {
    confirm({
      variant: "destructive",
      description: t(`${HOOK_I18N}.rotateConfirm`),
      confirmLabel: t(`${HOOK_I18N}.rotate`),
      onConfirm: async () => {
        await rotate.mutateAsync();
      },
    });
  };

  const toggleDeluge = () => {
    if (notConfigured) return;
    setDelugeOpen((open) => !open);
  };

  const toggleTransmission = () => {
    if (notConfigured) return;
    setTransmissionOpen((open) => !open);
  };

  const delugeExpanded = !notConfigured && delugeOpen;
  const transmissionExpanded = !notConfigured && transmissionOpen;

  return (
    <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-neutral-100">
          {t(`${HOOK_I18N}.title`)}
        </h3>
        <p className="text-sm text-neutral-400 mt-0.5">
          {t(`${HOOK_I18N}.help`)}
        </p>
      </div>

      {loading && !config ? (
        <p className="text-sm text-neutral-400">{t("common.loading")}</p>
      ) : (
        <>
          {status && <HookStatusBanner status={status} config={config} />}

          <IntegrationUrlInput
            label={t(`${HOOK_I18N}.callbackUrl`)}
            value={callbackUrl}
            onChange={setCallbackUrl}
            placeholder={t(`${HOOK_I18N}.callbackUrlPlaceholder`)}
          />
          <p className="text-xs text-neutral-500 -mt-2">
            {t(`${HOOK_I18N}.callbackUrlHelp`)}
          </p>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-neutral-900/50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-200">
                {t(`${HOOK_I18N}.autoConfigure`)}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t(`${HOOK_I18N}.autoConfigureHelp`)}
              </p>
            </div>
            <Switch
              checked={autoConfigure}
              onCheckedChange={setAutoConfigure}
            />
          </div>

          <LabeledField label={t(`${HOOK_I18N}.activeHookedSecs`)}>
            <input
              type="number"
              min={1}
              step={1}
              value={activeHookedSecs}
              onChange={(event) => setActiveHookedSecs(event.target.value)}
              className="w-full rounded-lg border border-neutral-600 bg-neutral-900 px-4 py-2 text-white"
            />
          </LabeledField>
          <p className="text-xs text-neutral-500 -mt-2">
            {t(`${HOOK_I18N}.activeHookedSecsHelp`)}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {isDirty && (
              <span className="text-xs text-amber-400 font-medium mr-auto">
                {t("settings.integrations.unsavedChanges")}
              </span>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={save.isPending || !isDirty}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={save.isPending || !isDirty}
              >
                {save.isPending
                  ? t("common.loading")
                  : t("settings.integrations.save")}
              </Button>
            </div>
          </div>

          <div className="border-t border-neutral-700 pt-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleRotate}
              disabled={rotate.isPending || !config}
            >
              {t(`${HOOK_I18N}.rotate`)}
            </Button>

            {notConfigured && (
              <p className="text-sm text-amber-300">
                {t(`${HOOK_I18N}.promptCallbackUrl`)}
              </p>
            )}

            <ScriptCollapse
              title={t(`${HOOK_I18N}.deluge.title`)}
              open={delugeExpanded}
              onToggle={toggleDeluge}
              disabled={notConfigured}
              script={config?.delugeScript ?? ""}
              step1={t(`${HOOK_I18N}.deluge.step1`)}
              step2={t(`${HOOK_I18N}.deluge.step2`)}
            />
            <ScriptCollapse
              title={t(`${HOOK_I18N}.transmission.title`)}
              open={transmissionExpanded}
              onToggle={toggleTransmission}
              disabled={notConfigured}
              script={config?.transmissionScript ?? ""}
              step1={t(`${HOOK_I18N}.transmission.step1`)}
              step2={t(`${HOOK_I18N}.transmission.step2`)}
            />
          </div>
        </>
      )}
    </div>
  );
}
