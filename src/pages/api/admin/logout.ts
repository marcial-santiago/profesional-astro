import type { APIRoute } from "astro";
import { CSRF_COOKIE_NAME } from "../../../lib/csrf";
import { revokeToken } from "../../../lib/session";

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get("admin_session")?.value;

  // Revoke token in DB — prevents reuse even if token is stolen
  if (token) {
    await revokeToken(token);
  }

  cookies.delete("admin_session", { path: "/" });
  cookies.delete(CSRF_COOKIE_NAME, { path: "/" });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
