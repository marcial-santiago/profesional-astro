import type { APIRoute } from "astro";
import { prisma } from "../../lib/prisma";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const workTypes = await prisma.workType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return new Response(JSON.stringify(workTypes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching work types:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch work types" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
