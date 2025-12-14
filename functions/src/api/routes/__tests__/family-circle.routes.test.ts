import request from "supertest";
import app from "../../../app";
import { AppError, NotFoundError, ConflictError } from "../../../core/errors";

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "test-user" }),
  }),
}));

// Mock Auth Middleware with configurable user
let mockUser: any = { uid: "test-user", email: "user@example.com" };

jest.mock("../../middleware/auth.middleware", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  },
  get __esModule() {
    return true;
  },
}));

// Mock Family Circle Service instance
const mockServiceInstance = {
  getFamilyCircleInfo: jest.fn(),
  getFamilyCircleMembers: jest.fn(),
  addFamilyCircleMember: jest.fn(),
  removeFamilyCircleMember: jest.fn(),
  getFamilyCircleConfig: jest.fn(),
  updateFamilyCircleConfig: jest.fn(),
};

jest.mock("../../../services/family-circle.service", () => ({
  familyCircleService: {
    get instance() {
      return mockServiceInstance;
    },
    getFamilyCircleInfo: (...args: any[]) => mockServiceInstance.getFamilyCircleInfo(...args),
    getFamilyCircleMembers: (...args: any[]) => mockServiceInstance.getFamilyCircleMembers(...args),
    addFamilyCircleMember: (...args: any[]) => mockServiceInstance.addFamilyCircleMember(...args),
    removeFamilyCircleMember: (...args: any[]) => mockServiceInstance.removeFamilyCircleMember(...args),
    getFamilyCircleConfig: (...args: any[]) => mockServiceInstance.getFamilyCircleConfig(...args),
    updateFamilyCircleConfig: (...args: any[]) => mockServiceInstance.updateFamilyCircleConfig(...args),
  },
}));

describe("Family Circle Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /v1/clients/:clientId/family-circle", () => {
    it("returns family circle info", async () => {
      mockServiceInstance.getFamilyCircleInfo.mockResolvedValue({ role: "member", holderId: "h1", relationshipType: "spouse", joinedAt: new Date() });
      const res = await request(app).get("/v1/clients/client-1/family-circle");
      expect(res.status).toBe(200);
      expect(mockServiceInstance.getFamilyCircleInfo).toHaveBeenCalledWith("client-1");
    });

    it("handles unexpected errors", async () => {
      mockServiceInstance.getFamilyCircleInfo.mockRejectedValue(new Error("boom"));
      const res = await request(app).get("/v1/clients/client-1/family-circle");
      expect(res.status).toBe(500);
    });
  });

  describe("GET /v1/clients/:clientId/family-circle/members", () => {
    it("returns members list for holder", async () => {
      mockServiceInstance.getFamilyCircleMembers.mockResolvedValue({ data: [], metadata: { totalMembers: 0, holder: { clientId: "client-1" } } });
      const res = await request(app).get("/v1/clients/client-1/family-circle/members");
      expect(res.status).toBe(200);
      expect(mockServiceInstance.getFamilyCircleMembers).toHaveBeenCalledWith("client-1", "test-user");
    });

    it("handles not found holder", async () => {
      mockServiceInstance.getFamilyCircleMembers.mockRejectedValue(new NotFoundError("Client", "client-1"));
      const res = await request(app).get("/v1/clients/client-1/family-circle/members");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /v1/clients/:clientId/family-circle/members", () => {
    it("adds a member to family circle", async () => {
      const member = { memberId: "m1", relationshipType: "child", addedAt: new Date(), addedBy: "test-user" };
      mockServiceInstance.addFamilyCircleMember.mockResolvedValue(member);

      const res = await request(app)
        .post("/v1/clients/client-1/family-circle/members")
        .send({ memberId: "m1", relationshipType: "child" });

      expect(res.status).toBe(201);
      expect(res.body.member).toMatchObject({
        memberId: "m1",
        relationshipType: "child",
        addedBy: "test-user",
      });
      expect(new Date(res.body.member.addedAt).toISOString()).toBe(member.addedAt.toISOString());
      expect(mockServiceInstance.addFamilyCircleMember).toHaveBeenCalledWith(
        "client-1",
        { memberId: "m1", relationshipType: "child" },
        { uid: "test-user", email: "user@example.com" }
      );
    });

    it("validates body (missing memberId)", async () => {
      const res = await request(app)
        .post("/v1/clients/client-1/family-circle/members")
        .send({ relationshipType: "child" });
      expect(res.status).toBe(400);
    });

    it("handles conflict when member already in circle", async () => {
      mockServiceInstance.addFamilyCircleMember.mockRejectedValue(new ConflictError("MEMBER_ALREADY_IN_CIRCLE", "Already in circle"));
      const res = await request(app)
        .post("/v1/clients/client-1/family-circle/members")
        .send({ memberId: "m1", relationshipType: "child" });
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /v1/clients/:clientId/family-circle/members/:memberId", () => {
    it("removes a member", async () => {
      mockServiceInstance.removeFamilyCircleMember.mockResolvedValue(undefined);
      const res = await request(app).delete("/v1/clients/client-1/family-circle/members/m1");
      expect(res.status).toBe(200);
      expect(mockServiceInstance.removeFamilyCircleMember).toHaveBeenCalledWith("client-1", "m1", { uid: "test-user", email: "user@example.com" });
    });

    it("handles member not found", async () => {
      mockServiceInstance.removeFamilyCircleMember.mockRejectedValue(new NotFoundError("Client", "m1"));
      const res = await request(app).delete("/v1/clients/client-1/family-circle/members/m1");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /v1/clients/:clientId/accounts/:accountId/family-circle-config", () => {
    it("returns config", async () => {
      const cfg = { allowMemberCredits: true, allowMemberDebits: false, updatedAt: new Date(), updatedBy: "test-user" };
      mockServiceInstance.getFamilyCircleConfig.mockResolvedValue(cfg);
      const res = await request(app).get("/v1/clients/client-1/accounts/acc-1/family-circle-config");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ allowMemberCredits: true });
    });

    it("handles account not found", async () => {
      mockServiceInstance.getFamilyCircleConfig.mockRejectedValue(new NotFoundError("Account", "acc-404"));
      const res = await request(app).get("/v1/clients/client-1/accounts/acc-404/family-circle-config");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /v1/clients/:clientId/accounts/:accountId/family-circle-config", () => {
    it("updates config", async () => {
      const cfg = { allowMemberCredits: true, allowMemberDebits: true, updatedAt: new Date(), updatedBy: "test-user" };
      mockServiceInstance.updateFamilyCircleConfig.mockResolvedValue(cfg);
      const res = await request(app)
        .patch("/v1/clients/client-1/accounts/acc-1/family-circle-config")
        .send({ allowMemberCredits: true, allowMemberDebits: true });
      expect(res.status).toBe(200);
      expect(res.body.config).toMatchObject({ allowMemberCredits: true, allowMemberDebits: true });
      expect(mockServiceInstance.updateFamilyCircleConfig).toHaveBeenCalledWith(
        "client-1",
        "acc-1",
        { allowMemberCredits: true, allowMemberDebits: true },
        { uid: "test-user", email: "user@example.com" }
      );
    });

    it("validates body (invalid types)", async () => {
      const res = await request(app)
        .patch("/v1/clients/client-1/accounts/acc-1/family-circle-config")
        .send({ allowMemberCredits: "yes" });
      expect(res.status).toBe(400);
    });

    it("handles not holder error", async () => {
      mockServiceInstance.updateFamilyCircleConfig.mockRejectedValue(new AppError("NOT_CIRCLE_HOLDER", 403, "NOT_CIRCLE_HOLDER"));
      const res = await request(app)
        .patch("/v1/clients/client-1/accounts/acc-1/family-circle-config")
        .send({ allowMemberCredits: true, allowMemberDebits: true });
      expect(res.status).toBe(403);
    });
  });

  describe("getActor helper (branch coverage)", () => {
    beforeEach(() => {
      // Reset mock user to default
      mockUser = { uid: "test-user", email: "user@example.com" };
    });

    it("passes actor with email when provided", async () => {
      mockServiceInstance.addFamilyCircleMember.mockResolvedValue({
        memberId: "m1",
        relationshipType: "child",
        addedAt: new Date(),
        addedBy: "test-user",
      });

      const res = await request(app)
        .post("/v1/clients/client-1/family-circle/members")
        .send({ memberId: "m1", relationshipType: "child" });

      expect(res.status).toBe(201);
      const [_holderId, _request, actor] = mockServiceInstance.addFamilyCircleMember.mock.calls[0];
      expect(actor).toEqual({
        uid: "test-user",
        email: "user@example.com",
      });
    });

    it("passes actor with null email when undefined", async () => {
      // Set user without email to trigger || null branch
      mockUser = { uid: "test-user-no-email" };

      mockServiceInstance.addFamilyCircleMember.mockResolvedValue({
        memberId: "m1",
        relationshipType: "child",
        addedAt: new Date(),
        addedBy: "test-user-no-email",
      });

      const res = await request(app)
        .post("/v1/clients/client-1/family-circle/members")
        .send({ memberId: "m1", relationshipType: "child" });

      expect(res.status).toBe(201);
      const [_holderId, _request, actor] = mockServiceInstance.addFamilyCircleMember.mock.calls[0];
      expect(actor).toEqual({
        uid: "test-user-no-email",
        email: null,
      });
    });

    it("passes actor to removeFamilyCircleMember", async () => {
      mockServiceInstance.removeFamilyCircleMember.mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/v1/clients/client-1/family-circle/members/m1");

      expect(res.status).toBe(200);
      const [_holderId, _memberId, actor] = mockServiceInstance.removeFamilyCircleMember.mock.calls[0];
      expect(actor).toHaveProperty("uid");
      expect(actor).toHaveProperty("email");
    });

    it("passes actor to updateFamilyCircleConfig", async () => {
      mockServiceInstance.updateFamilyCircleConfig.mockResolvedValue({
        allowMemberCredits: true,
        allowMemberDebits: true,
        updatedAt: new Date(),
        updatedBy: "test-user",
      });

      const res = await request(app)
        .patch("/v1/clients/client-1/accounts/acc-1/family-circle-config")
        .send({ allowMemberCredits: true, allowMemberDebits: true });

      expect(res.status).toBe(200);
      const [_clientId, _accountId, _request, actor] = mockServiceInstance.updateFamilyCircleConfig.mock.calls[0];
      expect(actor).toHaveProperty("uid");
      expect(actor).toHaveProperty("email");
    });
  });
});
