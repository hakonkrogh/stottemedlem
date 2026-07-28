import type { APIRoute } from "astro";
import { getWorkOS, resolveLanding } from "../lib/workos";

// Root routes an authenticated admin to the right place: their org's dashboard,
// the org picker, or org creation (see resolveLanding). Middleware guarantees a
// session by the time we get here.
export const GET: APIRoute = async ({ locals, redirect }) => {
  const session = locals.session;
  if (!session) return redirect("/login");
  const { path } = await resolveLanding(getWorkOS(), session.userId);
  return redirect(path);
};
