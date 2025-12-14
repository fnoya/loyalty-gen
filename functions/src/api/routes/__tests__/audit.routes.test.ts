import request from "supertest";
import express from "express";
import { AuditService } from "../../../services/audit.service";
import auditRoutes from "../audit.routes";
import { authenticate } from "../../middleware/auth.middleware";

// Mock dependencies
jest.mock("../../../services/audit.service");
jest.mock("../../middleware/auth.middleware");
jest.mock("firebase-admin", () => ({
  firestore: jest.fn(),
}));

const mockAuthenticate = authenticate as jest.Mock;
const mockAuditService = AuditService as jest.MockedClass<typeof AuditService>;

// Create a single instance to be returned by the constructor mock
const auditServiceInstance = {
  listAuditLogs: jest.fn(),
  getClientAuditLogs: jest.fn(),
  getAccountAuditLogs: jest.fn(),
};

describe("Audit Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service instance
    mockAuditService.mockImplementation(() => auditServiceInstance as any);

    // Setup mock authentication
    mockAuthenticate.mockImplementation((req, res, next) => {
      req.user = { uid: "test-user", email: "test@example.com" };
      next();
    });

    // Setup express app
    app = express();
    app.use(express.json());
    app.use("/v1/audit-logs", auditRoutes);
    // Add error handler
    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        res.status(err.statusCode || 500).json({
          error: {
            code: err.code || "INTERNAL_ERROR",
            message: err.message,
          },
        });
      }
    );
  });

  describe("GET /v1/audit-logs", () => {
    it("should list audit logs with default limit", async () => {
      const mockResult = {
        data: [{ id: "log1", action: "TEST_ACTION" }],
        paging: { has_more: false },
      };
      auditServiceInstance.listAuditLogs.mockResolvedValue(mockResult);

      const response = await request(app).get("/v1/audit-logs");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(auditServiceInstance.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 30 })
      );
    });

    it("should list audit logs with filters", async () => {
      const mockResult = { data: [], paging: { has_more: false } };
      auditServiceInstance.listAuditLogs.mockResolvedValue(mockResult);

      const response = await request(app).get("/v1/audit-logs").query({
        action: "CREATE",
        resource_type: "client",
        limit: "10",
      });

      expect(response.status).toBe(200);
      expect(auditServiceInstance.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CREATE",
          resource_type: "client",
          limit: 10,
        })
      );
    });

    it("should handle all query parameters", async () => {
      const mockResult = { data: [], paging: { has_more: false } };
      auditServiceInstance.listAuditLogs.mockResolvedValue(mockResult);

      const response = await request(app).get("/v1/audit-logs").query({
        client_id: "c1",
        account_id: "a1",
        from_date: "2023-01-01",
        to_date: "2023-01-02",
        next_cursor: "cursor123",
      });

      expect(response.status).toBe(200);
      expect(auditServiceInstance.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "c1",
          account_id: "a1",
          start_date: "2023-01-01",
          end_date: "2023-01-02",
          next_cursor: "cursor123",
        })
      );
    });

    it("should return 500 (or error status) for invalid limit (too low)", async () => {
      const response = await request(app)
        .get("/v1/audit-logs")
        .query({ limit: "0" });

      expect(response.status).not.toBe(200);
    });

    it("should return 500 (or error status) for invalid limit (too high)", async () => {
      const response = await request(app)
        .get("/v1/audit-logs")
        .query({ limit: "101" });

      expect(response.status).not.toBe(200);
    });
  });

  describe("GET /v1/audit-logs/clients/:clientId/audit-logs", () => {
    it("should get client audit logs", async () => {
      const mockResult = { data: [], paging: { has_more: false } };
      auditServiceInstance.listAuditLogs.mockResolvedValue(mockResult);

      const response = await request(app).get(
        "/v1/audit-logs/clients/c1/audit-logs"
      );

      expect(response.status).toBe(200);
      expect(auditServiceInstance.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "c1",
          limit: 30,
        })
      );
    });

    it("should handle invalid limit for client logs", async () => {
      const response = await request(app)
        .get("/v1/audit-logs/clients/c1/audit-logs")
        .query({ limit: "101" });

      expect(response.status).not.toBe(200);
    });
  });

  describe("GET /v1/audit-logs/clients/:clientId/accounts/:accountId/audit-logs", () => {
    it("should get account audit logs", async () => {
      const mockResult = { data: [], paging: { has_more: false } };
      (auditServiceInstance.listAuditLogs as jest.Mock).mockResolvedValue(
        mockResult
      );

      const response = await request(app).get(
        "/v1/audit-logs/clients/c1/accounts/a1/audit-logs"
      );

      expect(response.status).toBe(200);
      expect(auditServiceInstance.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: "a1",
          limit: 30,
        })
      );
    });

    it("should handle invalid limit for account logs", async () => {
      const response = await request(app)
        .get("/v1/audit-logs/clients/c1/accounts/a1/audit-logs")
        .query({ limit: "101" });

      expect(response.status).not.toBe(200);
    });
  });
});
