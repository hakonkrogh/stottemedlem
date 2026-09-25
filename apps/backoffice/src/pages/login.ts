import type { APIRoute } from "astro";
import { beginSignIn } from "../lib/workos";

// Kick off AuthKit: redirect the browser to WorkOS's hosted sign-in. WorkOS
// returns the user to WORKOS_REDIRECT_URI (/callback) with an authorization code
// and the `state` this browser was given here.
export const GET: APIRoute = ({ url, cookies, redirect }) => {
  return redirect(beginSignIn(url, cookies));
};
