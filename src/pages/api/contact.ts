import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "Invalid content type" }, 400);
  }
  console.log("Content-Type:", request);

  const data = await request.formData();

  if (data.get("company")) {
    return json({ ok: true }, 200);
  }

  const nombre = String(data.get("nombre") || "").trim();
  const telefono = String(data.get("telefono") || "").trim();
  const servicio = String(data.get("servicio") || "").trim();
  const mensaje = String(data.get("mensaje") || "").trim();

  try {
    await prisma.message.create({
      data: {
        nombre,
        telefono,
        servicio,
        mensaje,
      },
    });
  } catch (err) {
    console.error("DB error:", err);
    return json({ error: "Error al guardar el mensaje" }, 500);
  }

  return json({ ok: true }, 201);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
