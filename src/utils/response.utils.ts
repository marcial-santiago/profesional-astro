// HTTP Response utilities for consistent API responses

export function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function successResponse(data: unknown, status = 200): Response {
  return jsonResponse(data, status);
}

export function errorResponse(
  error: string,
  status = 400,
  details?: unknown,
): Response {
  const body = details ? { error, details } : { error };
  return jsonResponse(body, status);
}

export function createdResponse(data: unknown): Response {
  return jsonResponse(data, 201);
}

export function notFoundResponse(message = "Resource not found"): Response {
  return errorResponse(message, 404);
}

export function unauthorizedResponse(message = "Unauthorized"): Response {
  return errorResponse(message, 401);
}

export function conflictResponse(message = "Conflict"): Response {
  return errorResponse(message, 409);
}

export function internalErrorResponse(
  message = "Internal server error",
): Response {
  return errorResponse(message, 500);
}

export function validationErrorResponse(details: unknown): Response {
  return errorResponse("Invalid data", 400, details);
}
