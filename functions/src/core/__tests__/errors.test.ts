import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  MissingIdentifierError,
  InsufficientBalanceError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
} from "../errors";

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
      const error = new ConflictError("El email ya existe", "email");

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
    it("should create a 400 error with correct code", () => {
      const error = new ValidationError("Invalid input");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_FAILED");
      expect(error.message).toBe("Invalid input");
    });
  });

  describe("MissingIdentifierError", () => {
    it("should create a 400 error with correct message", () => {
      const error = new MissingIdentifierError();

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("MISSING_IDENTIFIER");
      expect(error.message).toContain("Se requiere al menos un identificador");
    });
  });

  describe("InsufficientBalanceError", () => {
    it("should create a 400 error with details", () => {
      const error = new InsufficientBalanceError(100, 150);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("INSUFFICIENT_BALANCE");
      expect(error.message).toContain("Saldo insuficiente");
      expect(error.message).toContain("100");
      expect(error.message).toContain("150");
    });
  });

  describe("UnauthorizedError", () => {
    it("should create a 401 error with default message", () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("INVALID_TOKEN");
      expect(error.message).toBe("Token de autenticación inválido o ausente.");
    });

    it("should create a 401 error with custom message", () => {
      const error = new UnauthorizedError("Custom message");

      expect(error.message).toBe("Custom message");
    });
  });

  describe("ForbiddenError", () => {
    it("should create a 403 error with default code", () => {
      const error = new ForbiddenError("Access denied");

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe("Access denied");
    });

    it("should create a 403 error with custom code", () => {
      const error = new ForbiddenError("Access denied", "CUSTOM_FORBIDDEN");

      expect(error.code).toBe("CUSTOM_FORBIDDEN");
    });
  });

  describe("InternalServerError", () => {
    it("should create a 500 error with default message", () => {
      const error = new InternalServerError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(error.message).toBe("Error interno del servidor.");
      expect(error.isOperational).toBe(false);
    });

    it("should create a 500 error with custom message", () => {
      const error = new InternalServerError("Custom error");

      expect(error.message).toBe("Custom error");
    });
  });
});
