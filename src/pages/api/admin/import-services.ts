import type { APIRoute } from "astro";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { requireAdminAuth } from "../../../middleware/auth.middleware";
import {
  createdResponse,
  errorResponse,
  internalErrorResponse,
} from "../../../utils/response.utils";

export const prerender = false;

const serviceRowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  duration: z.coerce.number().int().min(15),
  price: z.coerce.number().positive(),
});

type ServiceRow = z.infer<typeof serviceRowSchema>;

export const POST: APIRoute = async ({ request, cookies }) => {
  const authError = await requireAdminAuth(cookies);
  if (authError) return authError;

  let rows: unknown[];
  try {
    rows = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return errorResponse("Expected a non-empty array of services", 400);
  }

  if (rows.length > 500) {
    return errorResponse("Maximum 500 rows per import", 400);
  }

  const valid: ServiceRow[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const result = serviceRowSchema.safeParse(rows[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      const msg = result.error.issues.map((e) => e.message).join(", ");
      errors.push({ row: i + 1, error: msg });
    }
  }

  if (errors.length > 0) {
    return errorResponse("Some rows have validation errors", 400, errors);
  }

  const results = await Promise.allSettled(
    valid.map((row) =>
      prisma.workType.upsert({
        where: { name: row.name },
        update: {
          description: row.description ?? null,
          duration: row.duration,
          price: row.price,
          isActive: true,
        },
        create: {
          name: row.name,
          description: row.description ?? null,
          duration: row.duration,
          price: row.price,
          isActive: true,
        },
      }),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    console.error(
      "Import partial failure:",
      results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason?.message),
    );
  }

  return createdResponse({ imported: succeeded, failed });
};
