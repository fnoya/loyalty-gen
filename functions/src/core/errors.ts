/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }
}

/**
 * 404 Not Found error
 */
export class NotFoundError extends AppError {
  constructor(resourceType: string, resourceId: string) {
    super(
      `${resourceType} con ID '${resourceId}' no fue encontrado.`,
      404,
      "RESOURCE_NOT_FOUND"
    );
  }
}

/**
 * 409 Conflict error (e.g., duplicate email, identity document)
 */
export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    const code = field
      ? `${field.toUpperCase()}_ALREADY_EXISTS`
      : "CONFLICT";
    super(message, 409, code);
  }
}

/**
 * 400 Bad Request - Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_FAILED");
  }
}

/**
 * 400 Bad Request - Missing required identifier
 * Used when client creation requires email OR identity_document
 */
export class MissingIdentifierError extends AppError {
  constructor() {
    super(
      "Se requiere al menos un identificador: email o identity_document.",
      400,
      "MISSING_IDENTIFIER"
    );
  }
}

/**
 * 400 Bad Request - Insufficient balance for debit operation
 */
export class InsufficientBalanceError extends AppError {
  constructor(currentBalance: number, requestedAmount: number) {
    super(
      `Saldo insuficiente. Saldo actual: ${currentBalance}, monto solicitado: ${requestedAmount}.`,
      400,
      "INSUFFICIENT_BALANCE"
    );
  }
}

/**
 * 401 Unauthorized - Invalid or missing authentication token
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Token de autenticación inválido o ausente.") {
    super(message, 401, "INVALID_TOKEN");
  }
}

/**
 * 403 Forbidden - User doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string, code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message = "Error interno del servidor.") {
    super(message, 500, "INTERNAL_SERVER_ERROR", false);
  }
}
