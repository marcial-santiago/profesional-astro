import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  if (cookies.get("admin_session")?.value !== "ok") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const availability = await prisma.availability.findMany({
      orderBy: { dayOfWeek: "asc" },
    });
    const workTypes = await prisma.workType.findMany();

    return new Response(JSON.stringify({ availability, workTypes }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
      status: 500,
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (cookies.get("admin_session")?.value !== "ok") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === "availability") {
      // Simple bulk update: delete and recreate for this implementation
      await prisma.availability.deleteMany({});
      await prisma.availability.createMany({ data });
    } else if (type === "workType") {
      await prisma.workType.upsert({
        where: { id: data.id || -1 },
        update: data,
        create: data,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    console.error("Error updating settings:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update settings" }),
      { status: 500 },
    );
  }
};
