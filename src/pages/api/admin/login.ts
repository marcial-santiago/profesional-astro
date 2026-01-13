import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();
  console.log(body);
  const { user, password } = body ?? {};

  if (
    user !== import.meta.env.ADMIN_USER ||
    password !== import.meta.env.ADMIN_PASSWORD
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  cookies.set("admin_session", "ok", {
    httpOnly: true,
    sameSite: "strict",
    secure: import.meta.env.PROD,
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
