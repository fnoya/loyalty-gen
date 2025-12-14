import { GroupService } from "../group.service";
import { AuditService } from "../audit.service";
import { NotFoundError, AppError } from "../../core/errors";

// Mock firebase-admin
jest.mock("firebase-admin", () => {
  const mockFirestore = {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  };

  return {
    firestore: jest.fn(() => mockFirestore),
    initializeApp: jest.fn(),
  };
});

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
    arrayUnion: jest.fn((value) => [value]),
    arrayRemove: jest.fn((value) => []),
  },
}));

const admin = require("firebase-admin");
const mockFirestoreInstance = admin.firestore();

// Mock AuditService
jest.mock("../audit.service");

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
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [],
        empty: true,
      }),
    });

    mockAuditService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);

    groupService = new GroupService(mockFirestoreInstance as any);
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
          resource_type: "group",
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

      mockFirestoreInstance.collection.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockDocs,
          empty: false,
          forEach: (cb: any) => mockDocs.forEach(cb),
        }),
      });

      const result = await groupService.listGroups();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("VIP");
      expect(result[1]!.name).toBe("Gold");
    });
  });

  describe("getGroup", () => {
    it("should get a specific group by ID", async () => {
      const groupId = "group123";

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: groupId,
          data: () => ({
            name: "VIP Customers",
            description: "High value customers",
            created_at: { toDate: () => new Date("2025-01-01") },
          }),
        }),
      });

      const result = await groupService.getGroup(groupId);

      expect(result.id).toBe(groupId);
      expect(result.name).toBe("VIP Customers");
      expect(result.description).toBe("High value customers");
    });

    it("should throw NotFoundError if group does not exist", async () => {
      const groupId = "nonexistent";

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      });

      await expect(groupService.getGroup(groupId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("assignClientToGroup", () => {
    it("should assign client to affinity group", async () => {
      const clientId = "client123";
      const groupId = "group123";

      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            affinityGroupIds: id === clientId ? [] : undefined,
          }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      }));

      await groupService.assignClientToGroup(groupId, clientId, mockActor);

      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_ADDED_TO_GROUP",
        })
      );
    });

    it("should throw NotFoundError if group does not exist", async () => {
      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: id !== "group123",
        }),
        update: jest.fn(),
      }));

      await expect(
        groupService.assignClientToGroup("group123", "client123", mockActor)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if client does not exist", async () => {
      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: id === "group123",
        }),
        update: jest.fn(),
      }));

      await expect(
        groupService.assignClientToGroup("group123", "nonexistent", mockActor)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error if client already in group", async () => {
      const clientId = "client123";
      const groupId = "group123";

      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            affinityGroupIds: id === clientId ? [groupId] : undefined,
          }),
        }),
        update: jest.fn(),
      }));

      await expect(
        groupService.assignClientToGroup(groupId, clientId, mockActor)
      ).rejects.toThrow(AppError);
    });
  });

  describe("removeClientFromGroup", () => {
    it("should remove client from affinity group", async () => {
      const clientId = "client123";
      const groupId = "group123";

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            affinityGroupIds: id === clientId ? [groupId] : undefined,
          }),
        }),
        update: mockUpdate,
      }));

      await groupService.removeClientFromGroup(groupId, clientId, mockActor);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_REMOVED_FROM_GROUP",
        })
      );
    });

    it("should throw NotFoundError if group does not exist", async () => {
      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: id !== "group123",
        }),
        update: jest.fn(),
      }));

      await expect(
        groupService.removeClientFromGroup("group123", "client123", mockActor)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if client does not exist", async () => {
      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: id === "group123",
        }),
        update: jest.fn(),
      }));

      await expect(
        groupService.removeClientFromGroup("group123", "nonexistent", mockActor)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error if client not in group", async () => {
      mockDoc.mockImplementation((id: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            affinityGroupIds: id === "client123" ? ["other_group"] : undefined,
          }),
        }),
        update: jest.fn(),
      }));

      await expect(
        groupService.removeClientFromGroup("group123", "client123", mockActor)
      ).rejects.toThrow(AppError);
    });
  });

  describe("groupService singleton", () => {
    it("should return the same instance on multiple calls", () => {
      // Import the singleton
      const { groupService: singleton } = require("../group.service");

      const instance1 = singleton.instance;
      const instance2 = singleton.instance;

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(GroupService);
    });
  });
});
