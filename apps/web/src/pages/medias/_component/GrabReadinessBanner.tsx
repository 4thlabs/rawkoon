import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, X } from "lucide-react";
import { useGrabReadiness } from "@/features/medias/hooks/useGrabReadiness";
import {
  failingChecks,
  failingSignature,
  readDismissedSignature,
  writeDismissedSignature,
} from "@/features/medias/lib/grabReadiness";

/** Admin-only: says so when automatic grabbing is half-off, until dismissed for this exact set of problems. */
export function GrabReadinessBanner() {
  const { t } = useTranslation("common");
  const { data } = useGrabReadiness({ staleTime: 60_000 });
  const [dismissed, setDismissed] = useState(readDismissedSignature);

  const checks = data?.checks ?? [];
  const problems = failingChecks(checks).length;
  const signature = failingSignature(checks);
  if (problems === 0 || dismissed === signature) return null;

  return (
    <div
      role="status"
      data-testid="grab-readiness-banner"
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <p className="min-w-0 flex-1 basis-56 text-sm text-amber-100">
        {t("medias.library.grabReadinessBanner", { count: problems })}
      </p>
      <Link
        to="/settings/health"
        hash="grab-readiness"
        className="focus-ring inline-flex h-8 items-center rounded-md border border-amber-500/40 px-3 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20"
      >
        {t("medias.library.grabReadinessReview")}
      </Link>
      <button
        type="button"
        aria-label={t("medias.library.grabReadinessDismiss")}
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-200 transition-colors hover:bg-amber-500/20"
        onClick={() => {
          writeDismissedSignature(signature);
          setDismissed(signature);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
