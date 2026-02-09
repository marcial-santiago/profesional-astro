import { z } from "zod";
import { VALIDATION_RULES, ERROR_MESSAGES } from "../constants";

// Reusable validation schemas
export const schemas = {
  nombre: z
    .string()
    .trim()
    .min(VALIDATION_RULES.NAME_MIN_LENGTH, ERROR_MESSAGES.INVALID_NAME)
    .max(VALIDATION_RULES.NAME_MAX_LENGTH),

  telefono: z
    .string()
    .min(VALIDATION_RULES.PHONE_MIN_LENGTH, ERROR_MESSAGES.INVALID_PHONE)
    .max(VALIDATION_RULES.PHONE_MAX_LENGTH)
    .regex(/^[\d\s\+\-\(\)]+$/, ERROR_MESSAGES.INVALID_PHONE),

  email: z.string().email(ERROR_MESSAGES.INVALID_EMAIL),

  emailOptional: z.string().email(ERROR_MESSAGES.INVALID_EMAIL).optional(),

  mensaje: z
    .string()
    .trim()
    .min(VALIDATION_RULES.MESSAGE_MIN_LENGTH)
    .max(VALIDATION_RULES.MESSAGE_MAX_LENGTH),

  mensajeOptional: z
    .string()
    .trim()
    .max(VALIDATION_RULES.NOTA_MAX_LENGTH)
    .optional(),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),

  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),

  workTypeId: z.number().int().positive(),

  servicio: z.enum(["reparacion", "instalacion", "mantenimiento"]),
};

// Visit creation schema
export const visitSchema = z.object({
  nombre: schemas.nombre,
  telefono: schemas.telefono,
  email: schemas.emailOptional,
  date: schemas.date,
  time: schemas.time,
  workTypeId: schemas.workTypeId,
  mensaje: schemas.mensajeOptional,
});

// Contact form schema
export const contactSchema = z.object({
  nombre: schemas.nombre,
  telefono: schemas.telefono,
  servicio: schemas.servicio,
  mensaje: schemas.mensaje,
});

// Admin update visit schema
export const updateVisitStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

// Custom validation functions
export const ValidationService = {
  /**
   * Validates a phone number
   */
  validatePhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    return /^[\+]?[\d]{8,15}$/.test(cleaned);
  },

  /**
   * Validates a name (letters and spaces only)
   */
  validateName(name: string): boolean {
    return (
      name.trim().length >= VALIDATION_RULES.NAME_MIN_LENGTH &&
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)
    );
  },

  /**
   * Validates if a date is not in the past
   */
  isDateInFuture(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  },

  /**
   * Validates if a datetime is not in the past
   */
  isDateTimeInFuture(dateStr: string, timeStr: string): boolean {
    const datetime = new Date(`${dateStr}T${timeStr}:00`);
    return datetime > new Date();
  },

  /**
   * Combines date and time strings into a Date object
   */
  combineDateAndTime(dateStr: string, timeStr: string): Date {
    return new Date(`${dateStr}T${timeStr}:00`);
  },
};

export type VisitInput = z.infer<typeof visitSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type UpdateVisitStatusInput = z.infer<typeof updateVisitStatusSchema>;
