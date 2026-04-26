// Tests for Zod validation schemas
import { describe, it, expect } from "vitest";
import { schemas, contactSchema, visitSchema } from "../src/services/validation.service";

describe("Validation Schemas", () => {
  describe("nombre", () => {
    it("should accept valid names", () => {
      expect(schemas.nombre.parse("Juan Pérez")).toBe("Juan Pérez");
      expect(schemas.nombre.parse("Ana")).toBe("Ana");
    });

    it("should reject names shorter than 3 chars", () => {
      expect(schemas.nombre.safeParse("Jo").success).toBe(false);
      expect(schemas.nombre.safeParse("").success).toBe(false);
    });

    it("should trim whitespace", () => {
      expect(schemas.nombre.parse("  Juan  ")).toBe("Juan");
    });
  });

  describe("telefono", () => {
    it("should accept valid phone numbers", () => {
      expect(schemas.telefono.parse("+54 11 1234-5678")).toBe("+54 11 1234-5678");
      expect(schemas.telefono.parse("011-4567-8901")).toBe("011-4567-8901");
      expect(schemas.telefono.parse("1234567890")).toBe("1234567890");
    });

    it("should reject phones with letters", () => {
      expect(schemas.telefono.safeParse("phone123").success).toBe(false);
    });

    it("should reject phones shorter than 8 chars", () => {
      expect(schemas.telefono.safeParse("1234567").success).toBe(false);
    });

    it("should reject phones longer than 20 chars", () => {
      expect(schemas.telefono.safeParse("+54 11 1234-5678 9999 8888").success).toBe(false);
    });
  });

  describe("email", () => {
    it("should accept valid emails", () => {
      expect(schemas.email.parse("test@example.com")).toBe("test@example.com");
    });

    it("should reject invalid emails", () => {
      expect(schemas.email.safeParse("not-an-email").success).toBe(false);
      expect(schemas.email.safeParse("test@").success).toBe(false);
    });
  });

  describe("mensaje", () => {
    it("should accept valid messages (10-1000 chars)", () => {
      expect(schemas.mensaje.parse("This is a valid message with enough content")).toBe(
        "This is a valid message with enough content",
      );
    });

    it("should reject messages shorter than 10 chars", () => {
      expect(schemas.mensaje.safeParse("Short").success).toBe(false);
    });

    it("should trim whitespace", () => {
      expect(schemas.mensaje.parse("  Valid message here  ")).toBe("Valid message here");
    });
  });

  describe("servicio", () => {
    it("should accept valid service types", () => {
      expect(schemas.servicio.parse("reparacion")).toBe("reparacion");
      expect(schemas.servicio.parse("instalacion")).toBe("instalacion");
      expect(schemas.servicio.parse("mantenimiento")).toBe("mantenimiento");
    });

    it("should reject invalid service types", () => {
      expect(schemas.servicio.safeParse("otro").success).toBe(false);
      expect(schemas.servicio.safeParse("").success).toBe(false);
    });
  });

  describe("contactSchema (full form)", () => {
    it("should accept valid contact form data", () => {
      const data = {
        nombre: "Juan Pérez",
        telefono: "+54 11 1234-5678",
        servicio: "reparacion",
        mensaje: "Necesito reparar una cañería que tiene una fuga importante",
      };
      const result = contactSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject with missing fields", () => {
      const result = contactSchema.safeParse({ nombre: "Juan" });
      expect(result.success).toBe(false);
    });

    it("should reject with invalid phone (letters)", () => {
      const data = {
        nombre: "Juan Pérez",
        telefono: "abc-defg",
        servicio: "reparacion",
        mensaje: "Necesito reparar una cañería que tiene una fuga importante",
      };
      const result = contactSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
