import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../../core/errors";

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Error handling middleware
 * Formats all errors into standard API error response format
 *
 * This middleware should be registered LAST, after all routes
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: "VALIDATION_FAILED",
        message: formatZodError(err),
      },
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Handle custom AppError subclasses
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle unexpected errors
  // Log the full error internally but don't expose details to client
  console.error("Unexpected error:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  const errorResponse: ErrorResponse = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor.",
    },
  };
  res.status(500).json(errorResponse);
}

/**
 * Format Zod validation errors into a user-friendly message
 *
 * @param error - Zod validation error
 * @returns Formatted error message
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });

  return `Errores de validación: ${issues.join(", ")}`;
}

/**
 * 404 Not Found handler for unmatched routes
 * This middleware should be registered BEFORE the error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const errorResponse: ErrorResponse = {
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Ruta no encontrada: ${req.method} ${req.path}`,
    },
  };
  res.status(404).json(errorResponse);
}
