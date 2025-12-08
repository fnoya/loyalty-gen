export class AppError extends Error {
  constructor(public code: string, message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('RESOURCE_NOT_FOUND', `${resource} con ID '${id}' no fue encontrado.`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_FAILED', message, 400);
  }
}

export class MissingIdentifierError extends AppError {
  constructor() {
    super(
      'MISSING_IDENTIFIER',
      'Debe proporcionar al menos un identificador: email o documento de identidad.',
      400
    );
  }
}

export class InsufficientBalanceError extends AppError {
  constructor() {
    super(
      'INSUFFICIENT_BALANCE',
      'El saldo de la cuenta es insuficiente para realizar el débito.',
      400
    );
  }
}
