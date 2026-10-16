import { useNavigate } from "@tanstack/react-router";
import { clearUser } from "@/lib/auth";
import { useLogout } from "@/lib/auth/useAuth";

/** Drops the push subscription, ends the session, and returns to the login page. */
export function useSignOut() {
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  return async () => {
    try {
      let subscriptionEndpoint: string | undefined;
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            subscriptionEndpoint = subscription.endpoint;
            try {
              await subscription.unsubscribe();
            } catch (error) {
              console.warn(
                "Failed to unsubscribe from service worker on logout:",
                error,
              );
            }
          }
        } catch (error) {
          console.warn(
            "Could not get subscription endpoint for logout:",
            error,
          );
        }
      }

      await logoutMutation.mutateAsync(subscriptionEndpoint);
    } catch (error) {
      console.error("Logout error:", error);
    }
    clearUser();
    navigate({ to: "/login" });
  };
}
