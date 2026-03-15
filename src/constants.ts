// Application-wide constants

export const VISIT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export type VisitStatus = (typeof VISIT_STATUS)[keyof typeof VISIT_STATUS];

export const ERROR_MESSAGES = {
  // Validation errors
  INVALID_DATA: "Datos inválidos",
  INVALID_NAME: "Por favor ingresa un nombre válido (mínimo 3 letras)",
  INVALID_PHONE: "Por favor ingresa un teléfono válido",
  INVALID_EMAIL: "Por favor ingresa un email válido",

  // Business logic errors
  SLOT_TAKEN: "Este horario ya está ocupado",
  SLOT_NOT_AVAILABLE: "El horario seleccionado no está disponible",
  DATE_BLOCKED: "La fecha seleccionada está bloqueada",
  PAST_DATE: "No se pueden agendar turnos en fechas pasadas",

  // Resource errors
  WORK_TYPE_NOT_FOUND: "Tipo de servicio no encontrado",
  VISIT_NOT_FOUND: "Visita no encontrada",

  // Server errors
  INTERNAL_ERROR: "Error interno del servidor",
  DATABASE_ERROR: "Error al acceder a la base de datos",

  // Auth errors
  UNAUTHORIZED: "No autorizado",
  INVALID_CREDENTIALS: "Credenciales inválidas",
} as const;

export const VALIDATION_RULES = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  PHONE_MIN_LENGTH: 8,
  PHONE_MAX_LENGTH: 20,
  MESSAGE_MIN_LENGTH: 10,
  MESSAGE_MAX_LENGTH: 1000,
  NOTA_MAX_LENGTH: 500,
} as const;

export const DEFAULT_SLOT_DURATION = 60; // minutes

// Allowed origins for CSRF origin checks.
// Set ALLOWED_ORIGINS in .env as comma-separated list for production.
// Falls back to localhost for local development.
function parseAllowedOrigins(): string[] {
  const env = import.meta.env.ALLOWED_ORIGINS ?? "";
  const fromEnv = env
    .split(",")
    .map((o: string) => o.trim())
    .filter(Boolean);
  return fromEnv.length > 0
    ? fromEnv
    : ["http://localhost:4321", "http://localhost:3000"];
}

export const ALLOWED_ORIGINS: string[] = parseAllowedOrigins();

// Timezone for datetime calculations. Set APP_TIMEZONE in .env (e.g. "America/Argentina/Buenos_Aires")
export const APP_TIMEZONE = import.meta.env.APP_TIMEZONE ?? "America/Argentina/Buenos_Aires";
export const DAYS_OF_WEEK = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
