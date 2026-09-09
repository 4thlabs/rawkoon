import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  // better-auth 1.7 folded generic OAuth into the standard social flow, so the
  // genericOAuthClient plugin is gone; signIn.social handles OIDC providers.
  plugins: [passkeyClient()],
});
