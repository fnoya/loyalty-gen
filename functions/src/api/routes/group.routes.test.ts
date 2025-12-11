import request from "supertest";
import app from "../../app";
import { groupService } from "../../services/group.service";
import { NotFoundError, AppError } from "../../core/errors";

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "test-user" }),
  }),
}));

// Mock Services - Create mock instance
const mockGroupServiceInstance = {
  listGroups: jest.fn(),
  createGroup: jest.fn(),
  assignClientToGroup: jest.fn(),
  removeClientFromGroup: jest.fn(),
};

jest.mock("../../services/group.service", () => ({
  groupService: {
    get instance() {
      return mockGroupServiceInstance;
    },
  },
}));

// Mock Auth Middleware
jest.mock("../middleware/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { uid: "test-user" };
    next();
  },
}));

describe("Group Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /v1/groups", () => {
    it("should list all groups", async () => {
      const mockGroups = [
        {
          id: "group-1",
          name: "Premium Members",
          description: "Premium tier members",
          created_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "group-2",
          name: "VIP Members",
          description: "VIP tier members",
          created_at: "2024-01-02T00:00:00.000Z",
        },
      ];
      (groupService.instance.listGroups as jest.Mock).mockResolvedValue(mockGroups);

      const res = await request(app).get("/v1/groups");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockGroups);
      expect(groupService.instance.listGroups).toHaveBeenCalled();
    });

    it("should handle service errors", async () => {
      const error = new Error("Database error");
      (groupService.instance.listGroups as jest.Mock).mockRejectedValue(error);

      const res = await request(app).get("/v1/groups");

      expect(res.status).toBe(500);
    });
  });

  describe("POST /v1/groups", () => {
    it("should create a new group", async () => {
      const mockGroup = {
        id: "group-123",
        name: "New Group",
        description: "Test group",
        created_at: "2024-01-03T00:00:00.000Z",
      };
      (groupService.instance.createGroup as jest.Mock).mockResolvedValue(mockGroup);

      const res = await request(app).post("/v1/groups").send({
        name: "New Group",
        description: "Test group",
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockGroup);
      expect(groupService.instance.createGroup).toHaveBeenCalledWith(
        {
          name: "New Group",
          description: "Test group",
        },
        { uid: "test-user", email: null }
      );
    });

    it("should handle validation errors for missing name", async () => {
      const res = await request(app).post("/v1/groups").send({
        description: "Test group",
      });

      expect(res.status).toBe(400);
    });

    it("should handle validation errors for name too long", async () => {
      const res = await request(app)
        .post("/v1/groups")
        .send({
          name: "x".repeat(101),
          description: "Test",
        });

      expect(res.status).toBe(400);
    });

    it("should use default empty description if not provided", async () => {
      const mockGroup = {
        id: "group-123",
        name: "New Group",
        description: "",
        created_at: new Date("2024-01-04T00:00:00Z"),
      };
      (groupService.instance.createGroup as jest.Mock).mockResolvedValue(mockGroup);

      const res = await request(app).post("/v1/groups").send({
        name: "New Group",
      });

      expect(res.status).toBe(201);
      expect(groupService.instance.createGroup).toHaveBeenCalledWith(
        {
          name: "New Group",
          description: "",
        },
        { uid: "test-user", email: null }
      );
    });
  });

  describe("POST /v1/groups/:groupId/clients/:clientId", () => {
    it("should assign a client to a group", async () => {
      (groupService.instance.assignClientToGroup as jest.Mock).mockResolvedValue(
        undefined
      );

      const res = await request(app).post(
        "/v1/groups/group-123/clients/client-456"
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("assigned");
      expect(groupService.instance.assignClientToGroup).toHaveBeenCalledWith(
        "group-123",
        "client-456",
        { uid: "test-user", email: null }
      );
    });

    it("should handle group not found", async () => {
      (groupService.instance.assignClientToGroup as jest.Mock).mockRejectedValue(
        new NotFoundError("Group", "invalid-group")
      );

      const res = await request(app).post(
        "/v1/groups/invalid-group/clients/client-456"
      );

      expect(res.status).toBe(404);
    });

    it("should handle client not found", async () => {
      (groupService.instance.assignClientToGroup as jest.Mock).mockRejectedValue(
        new NotFoundError("Client", "invalid-client")
      );

      const res = await request(app).post(
        "/v1/groups/group-123/clients/invalid-client"
      );

      expect(res.status).toBe(404);
    });

    it("should handle already assigned client", async () => {
      (groupService.instance.assignClientToGroup as jest.Mock).mockRejectedValue(
        new AppError("Client already in group", 400, "VALIDATION_FAILED")
      );

      const res = await request(app).post(
        "/v1/groups/group-123/clients/client-456"
      );

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /v1/groups/:groupId/clients/:clientId", () => {
    it("should remove a client from a group", async () => {
      (groupService.instance.removeClientFromGroup as jest.Mock).mockResolvedValue(
        undefined
      );

      const res = await request(app).delete(
        "/v1/groups/group-123/clients/client-456"
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("removed");
      expect(groupService.instance.removeClientFromGroup).toHaveBeenCalledWith(
        "group-123",
        "client-456",
        { uid: "test-user", email: null }
      );
    });

    it("should handle group not found", async () => {
      (groupService.instance.removeClientFromGroup as jest.Mock).mockRejectedValue(
        new NotFoundError("Group", "invalid-group")
      );

      const res = await request(app).delete(
        "/v1/groups/invalid-group/clients/client-456"
      );

      expect(res.status).toBe(404);
    });

    it("should handle client not found", async () => {
      (groupService.instance.removeClientFromGroup as jest.Mock).mockRejectedValue(
        new NotFoundError("Client", "invalid-client")
      );

      const res = await request(app).delete(
        "/v1/groups/group-123/clients/invalid-client"
      );

      expect(res.status).toBe(404);
    });

    it("should handle client not in group", async () => {
      (groupService.instance.removeClientFromGroup as jest.Mock).mockRejectedValue(
        new AppError("Client not in group", 400, "VALIDATION_FAILED")
      );

      const res = await request(app).delete(
        "/v1/groups/group-123/clients/client-456"
      );

      expect(res.status).toBe(400);
    });
  });
});
