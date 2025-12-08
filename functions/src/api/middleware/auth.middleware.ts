import { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { UnauthorizedError } from "../../core/errors";

/**
 * Extended Express Request interface to include authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: admin.auth.DecodedIdToken;
}

/**
 * Authentication middleware
 * Verifies Firebase JWT token and attaches decoded token to request
 *
 * @throws {UnauthorizedError} If token is missing, invalid, or expired
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError("Token de autenticación ausente.");
    }

    // Check Bearer format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new UnauthorizedError(
        "Formato de token inválido. Use: Bearer <token>"
      );
    }

    const token = parts[1];

    if (!token) {
      throw new UnauthorizedError("Token de autenticación ausente.");
    }

    // Verify token with Firebase Admin SDK
    // NOTE: We never log the token itself - only that verification failed
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach decoded token to request for use in routes/services
    (req as AuthenticatedRequest).user = decodedToken;

    next();
  } catch (error) {
    // Check if it's already an UnauthorizedError
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }

    // Firebase token verification errors
    if (error instanceof Error) {
      // Log error type but NOT the token value
      console.error("Token verification failed:", error.message);
      next(new UnauthorizedError("Token de autenticación inválido o expirado."));
      return;
    }

    // Unexpected error
    next(new UnauthorizedError("Error al verificar token de autenticación."));
  }
}
