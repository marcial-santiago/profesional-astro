import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies }) => {
  const data = await request.formData();

  const user = data.get("user");
  const password = data.get("password");

  if (
    user !== import.meta.env.ADMIN_USER ||
    password !== import.meta.env.ADMIN_PASSWORD
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  cookies.set("admin_session", "ok", {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: "/admin" },
  });
};
