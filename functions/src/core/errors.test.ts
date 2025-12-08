import { AppError, NotFoundError, ConflictError, ValidationError } from "./errors";

describe("Core Error Classes", () => {
  describe("AppError", () => {
    it("should create an AppError with correct properties", () => {
      const error = new AppError("Test error", 400, "TEST_ERROR");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe("AppError");
    });

    it("should maintain stack trace", () => {
      const error = new AppError("Test error", 400, "TEST_ERROR");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });
  });

  describe("NotFoundError", () => {
    it("should create a 404 error with correct message", () => {
      const error = new NotFoundError("Cliente", "123");

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("RESOURCE_NOT_FOUND");
      expect(error.message).toBe("Cliente con ID '123' no fue encontrado.");
    });
  });

  describe("ConflictError", () => {
    it("should create a 409 error with field-specific code", () => {
      const error = new ConflictError(
        "El email ya existe",
        "email"
      );

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("EMAIL_ALREADY_EXISTS");
      expect(error.message).toBe("El email ya existe");
    });

    it("should create a 409 error with generic code when no field specified", () => {
      const error = new ConflictError("Conflicto detectado");

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
      expect(error.message).toBe("Conflicto detectado");
    });
  });

  describe("ValidationError", () => {
    it("should create a 400 error", () => {
      const error = new ValidationError("Datos inválidos");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_FAILED");
      expect(error.message).toBe("Datos inválidos");
    });
  });
});
