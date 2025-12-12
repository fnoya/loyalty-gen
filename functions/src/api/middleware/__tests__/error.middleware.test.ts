import { Request, Response, NextFunction } from "express";
import { ZodError, ZodIssue } from "zod";
import { NotFoundError } from "../../../core/errors";
import { errorHandler, notFoundHandler } from "../error.middleware";

describe("Error Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      path: "/test-path",
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {}); // Silence console.error
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("errorHandler", () => {
    it("should handle ZodError and return 400", () => {
      const zodIssues: ZodIssue[] = [
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["name"],
          message: "Expected string, received number",
        },
      ];
      const error = new ZodError(zodIssues);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "VALIDATION_FAILED",
          message:
            "Errores de validación: name: Expected string, received number",
        },
      });
    });

    it("should handle AppError and return correct status code", () => {
      const error = new NotFoundError("Client", "123");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Client con ID '123' no fue encontrado.",
        },
      });
    });

    it("should handle generic Error and return 500", () => {
      const error = new Error("Something went wrong");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor.",
        },
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("notFoundHandler", () => {
    it("should return 404 for unmatched routes", () => {
      notFoundHandler(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "Ruta no encontrada: GET /test-path",
        },
      });
    });
  });
});
