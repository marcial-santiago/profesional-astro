import type { APIRoute } from "astro";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export const prerender = false;

const messageSchema = z.object({
  nombre: z.string().trim().min(3).max(80),
  telefono: z.string(),
  servicio: z.enum(["reparacion", "instalacion", "mantenimiento"]),
  mensaje: z.string().trim().min(10).max(1000),
});

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "Invalid content type" }, 400);
  }

  const formData = await request.formData();

  if (formData.get("company")) {
    return json({ ok: true }, 200);
  }

  const rawData = {
    nombre: String(formData.get("nombre") ?? ""),
    telefono: String(formData.get("telefono") ?? ""),
    servicio: String(formData.get("servicio") ?? ""),
    mensaje: String(formData.get("mensaje") ?? ""),
  };

  const parsed = messageSchema.safeParse(rawData);

  if (!parsed.success) {
    console.log("Validation errors:", parsed.error.format());
    return json(
      {
        error: "Datos inválidos",
      },
      400
    );
  }

  try {
    await prisma.message.create({
      data: parsed.data,
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
