import { GroupService } from "./group.service";
import { AuditService } from "./audit.service";
import { ValidationError } from "../core/errors";

// Mock firebase-admin/firestore
jest.mock("firebase-admin/firestore", () => {
  const mockFirestore = {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  };

  return {
    getFirestore: jest.fn(() => mockFirestore),
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date()),
      arrayUnion: jest.fn((value) => ({ _arrayUnion: value })),
      arrayRemove: jest.fn((value) => ({ _arrayRemove: value })),
    },
  };
});

// Mock AuditService
jest.mock("./audit.service");

// Get the mocked firestore instance for test setup
const { getFirestore } = require("firebase-admin/firestore");
const mockFirestoreInstance = getFirestore();

describe("GroupService Branch Coverage", () => {
  let groupService: GroupService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockDoc: jest.Mock;
  let mockCollection: jest.Mock;
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockOrderBy: jest.Mock;

  const mockActor = {
    uid: "user123",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockSet = jest.fn().mockResolvedValue(undefined);
    mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockOrderBy = jest.fn().mockReturnThis();
    mockDoc = jest.fn();
    mockCollection = jest.fn();

    // Setup chainable mocks
    const mockQuery = {
      orderBy: mockOrderBy,
      get: mockGet,
      doc: mockDoc,
      collection: mockCollection,
      set: mockSet,
      update: mockUpdate,
    };

    mockOrderBy.mockReturnValue(mockQuery);
    mockCollection.mockReturnValue(mockQuery);
    mockDoc.mockReturnValue(mockQuery);

    mockFirestoreInstance.collection = mockCollection;

    mockAuditService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);

    groupService = new GroupService(mockFirestoreInstance as any);
  });

  describe("Optional fields handling", () => {
    it("should handle missing description in createGroup", async () => {
      const request = {
        name: "Test Group",
        // Missing description
      };

      // Mock doc creation
      mockDoc.mockReturnValue({
        set: mockSet,
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "group123",
          data: () => ({
            name: "Test Group",
            // Missing description in data
            created_at: new Date(),
          }),
        }),
      });

      const result = await groupService.createGroup(request as any, mockActor);

      expect(result.description).toBe("");
    });

    it("should handle missing description in listGroups", async () => {
      const mockGroups = [
        {
          id: "group1",
          data: () => ({
            name: "Test Group",
            // Missing description
            created_at: new Date(),
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockGroups,
        forEach: (cb: any) => mockGroups.forEach(cb),
      });

      const result = await groupService.listGroups();

      expect(result[0]?.description).toBe(""); // Schema default might be empty string or undefined depending on implementation
    });

    it("should handle missing description in getGroup", async () => {
      const groupId = "group123";

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: groupId,
          data: () => ({
            name: "Test Group",
            // Missing description
            created_at: new Date(),
          }),
        }),
      });

      const result = await groupService.getGroup(groupId);

      expect(result.description).toBe("");
    });
  });

  describe("Client group assignment branches", () => {
    it("should handle client with undefined affinityGroupIds in assignClientToGroup", async () => {
      const groupId = "group123";
      const clientId = "client123";

      // Mock group exists
      mockGet.mockResolvedValueOnce({ exists: true });

      // Mock client exists but has no affinityGroupIds
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          name: "Test Client",
          // affinityGroupIds is undefined
        }),
      });

      await groupService.assignClientToGroup(groupId, clientId, mockActor);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          affinityGroupIds: expect.anything(),
        })
      );
    });

    it("should handle client with undefined affinityGroupIds in removeClientFromGroup", async () => {
      const groupId = "group123";
      const clientId = "client123";

      // Mock group exists
      mockGet.mockResolvedValueOnce({ exists: true });

      // Mock client exists but has no affinityGroupIds
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          name: "Test Client",
          // affinityGroupIds is undefined
        }),
      });

      // Should throw because client is not in group (empty list)
      await expect(
        groupService.removeClientFromGroup(groupId, clientId, mockActor)
      ).rejects.toThrow(ValidationError);
    });
  });
});
