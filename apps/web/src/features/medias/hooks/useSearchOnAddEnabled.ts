import { useCurrentUser } from "@/lib/auth/useAuth";
import { useMediaPostProcessingSettings } from "./useMediaPostProcessingSettings";

/** Whether adding a title searches for it right away; false until known (the settings endpoint is admin-only). */
export function useSearchOnAddEnabled(): boolean {
  const { data: user } = useCurrentUser();
  const { data } = useMediaPostProcessingSettings({
    enabled: user?.is_admin === true,
  });
  return data?.settings?.search_on_add ?? false;
}
