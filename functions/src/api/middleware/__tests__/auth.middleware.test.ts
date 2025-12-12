import { Request, Response, NextFunction } from "express";
import { authenticate, AuthenticatedRequest } from "../auth.middleware";
import { UnauthorizedError } from "../../../core/errors";

// Mock firebase-admin
const mockVerifyIdToken = jest.fn();
jest.mock("firebase-admin", () => ({
  auth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe("Auth Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it("should call next() with decoded token if token is valid", async () => {
    const token = "valid-token";
    const decodedToken = { uid: "user123", email: "test@example.com" };
    mockReq.headers = { authorization: `Bearer ${token}` };
    mockVerifyIdToken.mockResolvedValue(decodedToken);

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockVerifyIdToken).toHaveBeenCalledWith(token);
    expect((mockReq as AuthenticatedRequest).user).toEqual(decodedToken);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("should throw UnauthorizedError if Authorization header is missing", async () => {
    mockReq.headers = {};

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Token de autenticación ausente.",
      })
    );
  });

  it("should throw UnauthorizedError if token format is invalid", async () => {
    mockReq.headers = { authorization: "InvalidFormat token" };

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Formato de token inválido. Use: Bearer <token>",
      })
    );
  });

  it("should throw UnauthorizedError if token is missing in Bearer", async () => {
    mockReq.headers = { authorization: "Bearer " }; // Empty token part?
    // split(" ") will give ["Bearer", ""]
    // parts[1] is "" which is falsy

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("should throw UnauthorizedError if verifyIdToken fails", async () => {
    mockReq.headers = { authorization: "Bearer invalid-token" };
    mockVerifyIdToken.mockRejectedValue(new Error("Firebase error"));

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Token de autenticación inválido o expirado.",
      })
    );
  });

  it("should pass through UnauthorizedError if thrown inside try block", async () => {
    // This is hard to trigger because we check conditions before try block?
    // No, the whole function is wrapped in try/catch?
    // Wait, let's check the code again.
    // Yes, try { ... } catch (error) { ... }
    // But if I throw UnauthorizedError inside try, it catches it.

    // Let's simulate verifyIdToken throwing UnauthorizedError (unlikely but possible if I mock it)
    mockReq.headers = { authorization: "Bearer token" };
    const error = new UnauthorizedError("Custom error");
    mockVerifyIdToken.mockRejectedValue(error);

    await authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
