import { GroupService } from "./group.service";
import { AuditService } from "./audit.service";
import { NotFoundError, AppError } from "../core/errors";

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => mockFirestoreInstance),
  initializeApp: jest.fn(),
}));

// Mock AuditService
jest.mock("./audit.service");

const mockFirestoreInstance = {
  collection: jest.fn(),
  runTransaction: jest.fn(),
};

describe("GroupService", () => {
  let groupService: GroupService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockDoc: jest.Mock;

  const mockActor = {
    uid: "user123",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc = jest.fn();

    mockFirestoreInstance.collection.mockReturnValue({
      doc: mockDoc,
    });

    mockAuditService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);

    groupService = new GroupService();
  });

  describe("createGroup", () => {
    it("should create an affinity group", async () => {
      const groupData = {
        name: "VIP Customers",
        description: "High value customers",
      };

      const mockGroupRef = {
        id: "group123",
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "group123",
          data: () => ({
            name: "VIP Customers",
            description: "High value customers",
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        }),
      };

      mockDoc.mockReturnValue(mockGroupRef);

      const result = await groupService.createGroup(groupData, mockActor);

      expect(result.name).toBe("VIP Customers");
      expect(result.description).toBe("High value customers");
      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "GROUP_CREATED",
          resource_type: "affinity_group",
        })
      );
    });
  });

  describe("listGroups", () => {
    it("should list all affinity groups", async () => {
      const mockDocs = [
        {
          id: "group1",
          data: () => ({
            name: "VIP",
            description: "VIP customers",
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        },
        {
          id: "group2",
          data: () => ({
            name: "Gold",
            description: "Gold members",
            created_at: { toDate: () => new Date("2025-01-02") },
            updated_at: { toDate: () => new Date("2025-01-02") },
          }),
        },
      ];

      mockDoc.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockDocs,
          empty: false,
        }),
      });

      const result = await groupService.listGroups();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("VIP");
      expect(result[1]!.name).toBe("Gold");
    });
  });

  describe("assignClientToGroup", () => {
    it("should assign client to affinity group", async () => {
      const clientId = "client123";
      const groupId = "group123";

      // Mock group exists check
      const mockGroupDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
        }),
      };

      // Mock client exists and get data
      const mockClientGetDoc = {
        exists: true,
        data: () => ({
          affinityGroupIds: [],
        }),
      };

      // Mock client update
      const mockClientUpdateDoc = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      mockDoc
        .mockReturnValueOnce(mockGroupDoc) // For group check
        .mockReturnValueOnce({
          get: jest.fn().mockResolvedValue(mockClientGetDoc),
        }) // For client get
        .mockReturnValueOnce(mockClientUpdateDoc); // For client update

      await groupService.assignClientToGroup(clientId, groupId, mockActor);

      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_ADDED_TO_GROUP",
        })
      );
    });

    it("should throw NotFoundError if client does not exist", async () => {
      // Mock group exists
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
        }),
      });

      // Mock client does not exist
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      });

      await expect(
        groupService.assignClientToGroup("nonexistent", "group123", mockActor)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error if client already in group", async () => {
      // Mock group exists
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
        }),
      });

      // Mock client exists with group already assigned
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            affinityGroupIds: ["group123"],
          }),
        }),
      });

      await expect(
        groupService.assignClientToGroup("client123", "group123", mockActor)
      ).rejects.toThrow(AppError);
    });
  });

  describe("removeClientFromGroup", () => {
    it("should remove client from affinity group", async () => {
      const clientId = "client123";
      const groupId = "group123";

      // Mock group exists
      const mockGroupDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
        }),
      };

      // Mock client exists with group assigned
      const mockClientGetDoc = {
        exists: true,
        data: () => ({
          affinityGroupIds: ["group123"],
        }),
      };

      // Mock client update
      const mockClientUpdateDoc = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      mockDoc
        .mockReturnValueOnce(mockGroupDoc) // For group check
        .mockReturnValueOnce({
          get: jest.fn().mockResolvedValue(mockClientGetDoc),
        }) // For client get
        .mockReturnValueOnce(mockClientUpdateDoc); // For client update

      await groupService.removeClientFromGroup(clientId, groupId, mockActor);

      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_REMOVED_FROM_GROUP",
        })
      );
    });

    it("should throw NotFoundError if client does not exist", async () => {
      // Mock group exists
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
        }),
      });

      // Mock client does not exist
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      });

      await expect(
        groupService.removeClientFromGroup("nonexistent", "group123", mockActor)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error if client not in group", async () => {
      // Mock group exists
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
        }),
      });

      // Mock client exists but not in the group
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            affinityGroupIds: ["other_group"],
          }),
        }),
      });

      await expect(
        groupService.removeClientFromGroup("client123", "group123", mockActor)
      ).rejects.toThrow(AppError);
    });
  });
});
