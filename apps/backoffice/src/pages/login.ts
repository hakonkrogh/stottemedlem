import type { APIRoute } from "astro";
import { env, getWorkOS } from "../lib/workos";

// Kick off AuthKit: redirect the browser to WorkOS's hosted sign-in. WorkOS
// returns the user to WORKOS_REDIRECT_URI (/callback) with an authorization code.
export const GET: APIRoute = ({ redirect }) => {
  const workos = getWorkOS();
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: "authkit",
    clientId: env.WORKOS_CLIENT_ID,
    redirectUri: env.WORKOS_REDIRECT_URI,
  });
  return redirect(authorizationUrl);
};
