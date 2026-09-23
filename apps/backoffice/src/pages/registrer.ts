import type { APIRoute } from "astro";
import { env, getWorkOS } from "../lib/workos";

// The way in from the front page during early access
// (specs/use-cases/sign-up-for-early-access.md): the same hosted sign-in as
// /login, opened on its "create an account" side, because the person arriving
// here is almost always new. After the callback, a person with no
// organization lands on the create form, which is where early access is
// explained and accepted.
//
// Someone already signed in has an account, so they go straight to creating
// an organization.
export const GET: APIRoute = ({ locals, redirect }) => {
  if (locals.session) return redirect("/orgs/new");
  const workos = getWorkOS();
  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    provider: "authkit",
    clientId: env.WORKOS_CLIENT_ID,
    redirectUri: env.WORKOS_REDIRECT_URI,
    screenHint: "sign-up",
  });
  return redirect(authorizationUrl);
};
