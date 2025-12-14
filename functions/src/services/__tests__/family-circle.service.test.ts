import { FamilyCircleService, familyCircleService as familyCircleServiceSingleton } from "../family-circle.service";
import { AuditService } from "../audit.service";
import { NotFoundError, AppError, ConflictError } from "../../core/errors";

const mockAdminFirestore = {
  collection: jest.fn(),
  runTransaction: jest.fn(),
};


jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => mockAdminFirestore),
}));

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
jest.mock("../audit.service");

const { getFirestore } = require("firebase-admin/firestore");
const mockFirestoreInstance = getFirestore();

describe("FamilyCircleService", () => {
  let familyCircleService: FamilyCircleService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockDoc: jest.Mock;

  const mockActor = {
    uid: "user123",
    email: "user@example.com",
  };

  // Helper to create mock doc references
  const createMockDocRef: any = (docId: string) => ({
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn(() => ({
      doc: jest.fn((id?: string) =>
        createMockDocRef(id || "default-doc-id")
      ),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
    })),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc = jest.fn((id?: string) => createMockDocRef(id || "default-id"));

    mockFirestoreInstance.collection.mockReturnValue({
      doc: mockDoc,
      get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
    });

    mockFirestoreInstance.runTransaction.mockImplementation(
      async (callback: any) => {
        const transaction = {
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        };
        await callback(transaction);
        return undefined;
      }
    );

    mockAuditService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);

    familyCircleService = new FamilyCircleService(mockFirestoreInstance as any);
  });

  describe("getFamilyCircleInfo", () => {
    it("should throw NotFoundError if holder client not found", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.getFamilyCircleInfo("holder123")
      ).rejects.toThrow(NotFoundError);
    });

    it("should return null role info if holder has no family circle", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircle: null }),
        }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleInfo("holder123");
      expect(result).toEqual({
        role: null,
        message: "This client is not part of any family circle",
      });
    });

    it("should return family circle info for holder", async () => {
      const now = new Date();
      const mockMembersSnapshot = {
        docs: [
          {
            id: "member1",
            data: () => ({
              relationshipType: "spouse",
              addedAt: now,
              addedBy: "user123",
            }),
          },
        ],
      };

      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "holder",
              memberCount: 2,
            },
          }),
        }),
        collection: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockMembersSnapshot),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleInfo("holder123");
      expect(result).toEqual({
        role: "holder",
        members: [
          {
            memberId: "member1",
            relationshipType: "spouse",
            addedAt: now,
            addedBy: "user123",
          },
        ],
        totalMembers: 1,
      });
    });

    it("should convert member addedAt using toDate for holder view", async () => {
      const addedAt = new Date("2024-02-02T00:00:00.000Z");
      const mockMembersSnapshot = {
        docs: [
          {
            id: "member1",
            data: () => ({
              relationshipType: "child",
              addedAt: { toDate: jest.fn(() => addedAt) },
              addedBy: "user123",
            }),
          },
        ],
      };

      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "holder",
              memberCount: 1,
            },
          }),
        }),
        collection: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockMembersSnapshot),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleInfo("holder123");

      if (result.role === "holder") {
        expect(result.members?.[0]?.addedAt).toEqual(addedAt);
      } else {
        throw new Error("Expected holder role");
      }
    });

    it("should return family circle info for member", async () => {
      const now = new Date();
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "member",
              memberCount: 2,
              relationshipType: "sibling",
              joinedAt: now,
            },
          }),
        }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleInfo("member123");
      expect(result).toEqual({
        role: "member",
        holderId: "holder123",
        relationshipType: "sibling",
        joinedAt: now,
      });
    });

    it("should convert joinedAt using toDate when provided", async () => {
      const joinedAt = new Date("2024-01-01T00:00:00.000Z");
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "member",
              relationshipType: "parent",
              joinedAt: { toDate: jest.fn(() => joinedAt) },
            },
          }),
        }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleInfo("member123");

      expect(result).toEqual({
        role: "member",
        holderId: "holder123",
        relationshipType: "parent",
        joinedAt,
      });
    });
  });

  describe("getFamilyCircleMembers", () => {
    it("should throw error if requester is not holder", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "member",
            },
          }),
        }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.getFamilyCircleMembers("holder123", "member123")
      ).rejects.toThrow(AppError);
    });

    it("should throw NotFoundError when holder does not exist", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.getFamilyCircleMembers("missing-holder", "user123")
      ).rejects.toThrow(NotFoundError);
    });

    it("should return members list for holder with no members", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "holder",
            },
          }),
        }),
        collection: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: [],
            empty: true,
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleMembers(
        "holder123",
        "holder123"
      );
      expect(result.data).toEqual([]);
    });

    it("should return members list for holder with members", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "holder",
            },
          }),
        }),
        collection: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: "member1",
                data: () => ({
                  memberId: "member1",
                  relationshipType: "spouse",
                  addedAt: new Date(),
                }),
              },
            ],
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleMembers(
        "holder123",
        "holder123"
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.memberId).toBe("member1");
    });

    it("should convert addedAt with toDate in members list", async () => {
      const addedAt = new Date("2024-03-03T00:00:00.000Z");
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "holder",
            },
          }),
        }),
        collection: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: "member1",
                data: () => ({
                  memberId: "member1",
                  relationshipType: "sibling",
                  addedAt: { toDate: jest.fn(() => addedAt) },
                  addedBy: "user123",
                }),
              },
            ],
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleMembers(
        "holder123",
        "holder123"
      );

      expect(result.data[0]?.addedAt).toEqual(addedAt);
    });
  });

  describe("addFamilyCircleMember", () => {
    it("should throw NotFoundError if holder not found", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.addFamilyCircleMember(
          "holder123",
          { memberId: "member123", relationshipType: "spouse" },
          mockActor
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ConflictError if holder already in family circle", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "another123",
              role: "MEMBER",
            },
          }),
        }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.addFamilyCircleMember(
          "holder123",
          { memberId: "member123", relationshipType: "spouse" },
          mockActor
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should throw NotFoundError if member not found", async () => {
      let callCount = 0;
      const mockClientRef = {
        get: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              exists: true,
              data: () => ({ familyCircle: null }),
            });
          }
          return Promise.resolve({ exists: false });
        }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.addFamilyCircleMember(
          "holder123",
          { memberId: "member123", relationshipType: "spouse" },
          mockActor
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should add member to family circle with atomic transaction", async () => {
      const now = new Date();

      const memberSubDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            memberId: "member123",
            relationshipType: "spouse",
            addedAt: now,
            addedBy: "user123",
          }),
        }),
        set: jest.fn(),
      };

      const holderDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircle: null }),
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue(memberSubDoc),
        })),
      };

      const memberDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircle: null }),
        }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "holder123") return holderDocRef;
        if (id === "member123") return memberDocRef;
        return {} as any;
      });

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            get: jest.fn(),
          };
          await callback(transaction);
          return undefined;
        }
      );

      const result = await familyCircleService.addFamilyCircleMember(
        "holder123",
        { memberId: "member123", relationshipType: "spouse" },
        mockActor
      );

      expect(result).toEqual({
        memberId: "member123",
        relationshipType: "spouse",
        addedAt: now,
        addedBy: "user123",
      });
      expect(mockAuditService.createAuditLog).toHaveBeenCalled();
    });

    it("should skip holder initialization when already holder and convert addedAt using toDate", async () => {
      const addedAt = new Date("2024-04-04T00:00:00.000Z");

      const memberSubDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            memberId: "member123",
            relationshipType: "spouse",
            addedAt: { toDate: jest.fn(() => addedAt) },
            addedBy: "user123",
          }),
        }),
        set: jest.fn(),
      };

      const holderDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircle: { role: "holder" } }),
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue(memberSubDoc),
        })),
      };

      const memberDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircle: null }),
        }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "holder123") return holderDocRef;
        if (id === "member123") return memberDocRef;
        return createMockDocRef(id);
      });

      const transactionUpdate = jest.fn();

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            set: jest.fn(),
            update: transactionUpdate,
            delete: jest.fn(),
            get: jest.fn(),
          };
          await callback(transaction);
          return undefined;
        }
      );

      const result = await familyCircleService.addFamilyCircleMember(
        "holder123",
        { memberId: "member123", relationshipType: "spouse" },
        mockActor
      );

      expect(transactionUpdate).toHaveBeenCalledTimes(1);
      expect(result.addedAt).toEqual(addedAt);
    });
  });

  describe("removeFamilyCircleMember", () => {
    it("should throw NotFoundError if holder not found", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.removeFamilyCircleMember(
          "holder123",
          "member123",
          mockActor
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if member client not found", async () => {
      const holderDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "holder",
            },
          }),
        }),
      };

      const memberDocRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "holder123") return holderDocRef;
        if (id === "member123") return memberDocRef;
        return createMockDocRef(id);
      });

      await expect(
        familyCircleService.removeFamilyCircleMember(
          "holder123",
          "member123",
          mockActor
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw AppError if member not in circle", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "holder",
            },
          }),
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: false }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            get: jest.fn().mockResolvedValue({ exists: false }),
          };
          await callback(transaction);
          return undefined;
        }
      );

      await expect(
        familyCircleService.removeFamilyCircleMember(
          "holder123",
          "member123",
          mockActor
        )
      ).rejects.toThrow(AppError);
    });

    it("should remove member from family circle", async () => {
      const mockClientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              holderId: "holder123",
              role: "holder",
            },
          }),
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ relationshipType: "spouse" }),
            }),
            delete: jest.fn().mockResolvedValue(undefined),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ relationshipType: "spouse" }),
            }),
            update: jest.fn(),
            delete: jest.fn(),
          };
          await callback(transaction);
          return undefined;
        }
      );

      await familyCircleService.removeFamilyCircleMember(
        "holder123",
        "member123",
        mockActor
      );

      expect(mockAuditService.createAuditLog).toHaveBeenCalled();
    });
  });

  describe("getFamilyCircleConfig", () => {
    it("should throw NotFoundError if account not found", async () => {
      const mockClientRef = {
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: false }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.getFamilyCircleConfig("client123", "account123")
      ).rejects.toThrow(NotFoundError);
    });

    it("should return default config if none exists", async () => {
      const mockClientRef = {
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ familyCircleConfig: null }),
            }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleConfig(
        "client123",
        "account123"
      );

      expect(result).toHaveProperty("allowMemberCredits");
      expect(result).toHaveProperty("allowMemberDebits");
    });

    it("should return existing family circle config", async () => {
      const mockClientRef = {
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                familyCircleConfig: {
                  allowMemberCredits: true,
                  allowMemberDebits: false,
                },
              }),
            }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result = await familyCircleService.getFamilyCircleConfig(
        "client123",
        "account123"
      );

      expect(result!.allowMemberCredits).toBe(true);
      expect(result!.allowMemberDebits).toBe(false);
    });
  });

  describe("updateFamilyCircleConfig", () => {
    it("should update family circle config", async () => {
      const accountDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircleConfig: {
              allowMemberCredits: false,
              allowMemberDebits: false,
            },
            created_at: new Date(),
          }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      const holderDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "holder",
            },
          }),
        }),
        collection: jest.fn((collectionName: string) => {
          if (collectionName === "loyaltyAccounts") {
            return {
              doc: jest.fn().mockReturnValue(accountDocRef),
            } as any;
          }
          return { doc: jest.fn() } as any;
        }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "client123") return holderDocRef;
        return {} as any;
      });

      const result = await familyCircleService.updateFamilyCircleConfig(
        "client123",
        "account123",
        { allowMemberCredits: true, allowMemberDebits: true },
        mockActor
      );

      expect(result).toMatchObject({
        allowMemberCredits: true,
        allowMemberDebits: true,
      });
      expect(accountDocRef.update).toHaveBeenCalled();
      expect(mockAuditService.createAuditLog).toHaveBeenCalled();
    });

    it("should throw NotFoundError when client does not exist", async () => {
      const missingClientRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "missing-client") return missingClientRef;
        return createMockDocRef(id);
      });

      await expect(
        familyCircleService.updateFamilyCircleConfig(
          "missing-client",
          "account123",
          { allowMemberCredits: true, allowMemberDebits: false },
          mockActor
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw AppError when requester is not holder", async () => {
      const clientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "member",
              holderId: "another",
            },
          }),
        }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "client123") return clientRef;
        return createMockDocRef(id);
      });

      await expect(
        familyCircleService.updateFamilyCircleConfig(
          "client123",
          "account123",
          { allowMemberCredits: false, allowMemberDebits: true },
          mockActor
        )
      ).rejects.toThrow(AppError);
    });

    it("should throw NotFoundError when account does not exist", async () => {
      const accountRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };

      const clientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "holder",
            },
          }),
        }),
        collection: jest.fn(() => ({
          doc: jest.fn(() => accountRef),
        })),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "client123") return clientRef;
        return createMockDocRef(id);
      });

      await expect(
        familyCircleService.updateFamilyCircleConfig(
          "client123",
          "missing-account",
          { allowMemberCredits: false, allowMemberDebits: false },
          mockActor
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw AppError when client familyCircle is null", async () => {
      const clientRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircle: null }),
        }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "client123") return clientRef;
        return createMockDocRef(id);
      });

      await expect(
        familyCircleService.updateFamilyCircleConfig(
          "client123",
          "account123",
          { allowMemberCredits: true, allowMemberDebits: true },
          mockActor
        )
      ).rejects.toThrow(AppError);
    });

    it("should keep existing config values when request fields are undefined", async () => {
      const accountDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircleConfig: {
              allowMemberCredits: true,
              allowMemberDebits: false,
            },
            created_at: new Date(),
          }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      const holderDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "holder",
            },
          }),
        }),
        collection: jest.fn((collectionName: string) => {
          if (collectionName === "loyaltyAccounts") {
            return {
              doc: jest.fn().mockReturnValue(accountDocRef),
            } as any;
          }
          return { doc: jest.fn() } as any;
        }),
      };

      mockDoc.mockImplementation((id: string) => {
        if (id === "client123") return holderDocRef;
        return createMockDocRef(id);
      });

      const result = await familyCircleService.updateFamilyCircleConfig(
        "client123",
        "account123",
        {} as any,
        mockActor
      );

      expect(result).not.toBeNull();
      expect(result!.allowMemberCredits).toBe(true);
      expect(result!.allowMemberDebits).toBe(false);
      expect(accountDocRef.update).toHaveBeenCalled();
    });
  });

  describe("validateMemberTransactionPermission", () => {
    it("should throw AppError if member not in circle", async () => {
      let callCount = 0;
      const mockClientRef = {
        get: jest.fn(() => {
          callCount++;
          if (callCount === 1 || callCount === 2) {
            return Promise.resolve({ exists: false });
          }
          return Promise.resolve({ exists: false });
        }),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "credit"
        )
      ).rejects.toThrow(AppError);
    });

    it("should throw AppError when config is missing for credit", async () => {
      const memberRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "member",
              holderId: "holder123",
              relationshipType: "sibling",
            },
          }),
        }),
      };

      const accountRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircleConfig: null }),
        }),
      };

      mockDoc.mockImplementation((id?: string) => {
        if (id === "member123") return memberRef;
        return {
          collection: jest.fn(() => ({
            doc: jest.fn(() => accountRef),
          })),
        } as any;
      });

      await expect(
        familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "credit"
        )
      ).rejects.toThrow(AppError);
    });

    it("should throw AppError when config is missing for debit", async () => {
      const memberRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "member",
              holderId: "holder123",
              relationshipType: "sibling",
            },
          }),
        }),
      };

      const accountRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ familyCircleConfig: null }),
        }),
      };

      mockDoc.mockImplementation((id?: string) => {
        if (id === "member123") return memberRef;
        return {
          collection: jest.fn(() => ({
            doc: jest.fn(() => accountRef),
          })),
        } as any;
      });

      await expect(
        familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "debit"
        )
      ).rejects.toThrow(AppError);
    });

    it("should throw AppError when member is in a different holder circle", async () => {
      const memberRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "member",
              holderId: "other-holder",
              relationshipType: "sibling",
            },
          }),
        }),
      };

      mockDoc.mockImplementation((id?: string) => {
        if (id === "member123") return memberRef;
        return {
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ familyCircleConfig: {} }) }),
            })),
          })),
        } as any;
      });

      await expect(
        familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "credit"
        )
      ).rejects.toThrow(AppError);
    });

    it("should throw NotFoundError when account is missing", async () => {
      const memberRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            familyCircle: {
              role: "member",
              holderId: "holder123",
              relationshipType: "sibling",
            },
          }),
        }),
      };

      const accountRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };

      mockDoc.mockImplementation((id?: string) => {
        if (id === "member123") return memberRef;
        return {
          collection: jest.fn(() => ({
            doc: jest.fn(() => accountRef),
          })),
        } as any;
      });

      await expect(
        familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "debit"
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw AppError if permission denied for credit", async () => {
      let callCount = 0;
      const mockClientRef = {
        get: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                },
              }),
            });
          }
          if (callCount === 2) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                },
              }),
            });
          }
          return Promise.resolve({ exists: false });
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                familyCircleConfig: {
                  allowMemberCredits: false,
                  allowMemberDebits: true,
                },
              }),
            }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "credit"
        )
      ).rejects.toThrow(AppError);
    });

    it("should return relationship type if credit permission granted", async () => {
      let callCount = 0;
      const mockClientRef = {
        get: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                  relationshipType: "spouse",
                },
              }),
            });
          }
          if (callCount === 2) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                  relationshipType: "spouse",
                },
              }),
            });
          }
          return Promise.resolve({ exists: false });
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                familyCircleConfig: {
                  allowMemberCredits: true,
                  allowMemberDebits: false,
                },
              }),
            }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result =
        await familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "credit"
        );

      expect(result).toBe("spouse");
    });

    it("should throw AppError if debit permission denied", async () => {
      let callCount = 0;
      const mockClientRef = {
        get: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                },
              }),
            });
          }
          if (callCount === 2) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                },
              }),
            });
          }
          return Promise.resolve({ exists: false });
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                familyCircleConfig: {
                  allowMemberCredits: true,
                  allowMemberDebits: false,
                },
              }),
            }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      await expect(
        familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "debit"
        )
      ).rejects.toThrow(AppError);
    });

    it("should return relationship type if debit permission granted", async () => {
      let callCount = 0;
      const mockClientRef = {
        get: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                  relationshipType: "parent",
                },
              }),
            });
          }
          if (callCount === 2) {
            return Promise.resolve({
              exists: true,
              data: () => ({
                familyCircle: {
                  holderId: "holder123",
                  role: "member",
                  relationshipType: "parent",
                },
              }),
            });
          }
          return Promise.resolve({ exists: false });
        }),
        collection: jest.fn(() => ({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                familyCircleConfig: {
                  allowMemberCredits: false,
                  allowMemberDebits: true,
                },
              }),
            }),
          }),
        })),
      };
      mockDoc.mockReturnValue(mockClientRef);

      const result =
        await familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "debit"
        );

      expect(result).toBe("parent");
    });
  });

  describe("Branch coverage for uncovered lines", () => {
    describe("getFamilyCircleMembers - role check branch", () => {
      it("should throw when client is member (line 125 - role !== holder)", async () => {
        const mockClientRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: {
                role: "member",
                holderId: "other-holder",
              },
            }),
          }),
        };
        mockDoc.mockReturnValue(mockClientRef);

        await expect(
          familyCircleService.getFamilyCircleMembers("member123", "user123")
        ).rejects.toThrow(AppError);
      });

      it("should throw when client has null family circle (line 125 - role check)", async () => {
        const mockClientRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: null,
            }),
          }),
        };
        mockDoc.mockReturnValue(mockClientRef);

        await expect(
          familyCircleService.getFamilyCircleMembers("client123", "user123")
        ).rejects.toThrow(AppError);
      });
    });

    describe("addFamilyCircleMember - self add check", () => {
      it("should throw when trying to add self (line 200)", async () => {
        const mockClientRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: null,
            }),
          }),
        };
        mockDoc.mockReturnValue(mockClientRef);

        await expect(
          familyCircleService.addFamilyCircleMember(
            "client123",
            {
              memberId: "client123",
              relationshipType: "spouse",
            },
            mockActor
          )
        ).rejects.toThrow("Cannot add self");
      });
    });

    describe("addFamilyCircleMember - holder already member", () => {
      it("should throw when holder is already member (line 209)", async () => {
        const mockClientRef = createMockDocRef("default");
        const memberMockRef = createMockDocRef("member-ref");

        mockDoc.mockImplementation((id?: string) => {
          if (id === "holder123") {
            return {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  familyCircle: {
                    role: "member",
                    holderId: "other-holder",
                  },
                }),
              }),
              collection: jest.fn(() => ({
                doc: jest.fn(() => memberMockRef),
              })),
            };
          }
          if (id === "member123") {
            return {
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  familyCircle: null,
                }),
              }),
            };
          }
          return mockClientRef;
        });

        await expect(
          familyCircleService.addFamilyCircleMember(
            "holder123",
            {
              memberId: "member123",
              relationshipType: "spouse",
            },
            mockActor
          )
        ).rejects.toThrow("Holder is already a member");
      });
    });

    describe("updateFamilyCircleConfig - merge behavior", () => {
      it("should merge partial config updates (line 433-441)", async () => {
        const mockAccountRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircleConfig: {
                allowMemberCredits: true,
                allowMemberDebits: false,
              },
            }),
          }),
          update: jest.fn().mockResolvedValue(undefined),
        };

        const mockClientRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: {
                holderId: "holder123",
                role: "holder",
              },
            }),
          }),
          collection: jest.fn(() => ({
            doc: jest.fn((id?: string) => {
              if (id === "account123") {
                return mockAccountRef;
              }
              return createMockDocRef(id || "default");
            }),
          })),
        };

        mockDoc.mockReturnValue(mockClientRef);

        // Only update allowMemberDebits, allowMemberCredits should be preserved
        const result = await familyCircleService.updateFamilyCircleConfig(
          "holder123",
          "account123",
          {
            allowMemberCredits: true,
            allowMemberDebits: true,
          },
          mockActor
        );

        expect(result?.allowMemberCredits).toBe(true);
        expect(result?.allowMemberDebits).toBe(true);
      });

      it("should default config values when not set (line 433-441)", async () => {
        const mockAccountRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircleConfig: null,
            }),
          }),
          update: jest.fn().mockResolvedValue(undefined),
        };

        const mockClientRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: {
                holderId: "holder123",
                role: "holder",
              },
            }),
          }),
          collection: jest.fn(() => ({
            doc: jest.fn((id?: string) => {
              if (id === "account123") {
                return mockAccountRef;
              }
              return createMockDocRef(id || "default");
            }),
          })),
        };

        mockDoc.mockReturnValue(mockClientRef);

        const result = await familyCircleService.updateFamilyCircleConfig(
          "holder123",
          "account123",
          {
            allowMemberCredits: true,
            allowMemberDebits: true,
          },
          mockActor
        );

        expect(result?.allowMemberCredits).toBe(true);
        expect(result?.allowMemberDebits).toBe(true);
      });
    });

    describe("validateMemberTransactionPermission - config conditions", () => {
      it("should allow credit when config allows (line 572-591)", async () => {
        const mockAccountRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircleConfig: {
                allowMemberCredits: true,
                allowMemberDebits: false,
              },
            }),
          }),
        };

        const mockMemberRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: {
                role: "member",
                holderId: "holder123",
                relationshipType: "spouse",
              },
            }),
          }),
        };

        mockDoc.mockImplementation((id?: string) => {
          if (id === "member123") {
            return mockMemberRef;
          }
          return {
            collection: jest.fn(() => ({
              doc: jest.fn((accountId?: string) => {
                if (accountId === "account123") {
                  return mockAccountRef;
                }
                return createMockDocRef(accountId || "default");
              }),
            })),
          };
        });

        const result = await familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "credit"
        );

        expect(result).toBe("spouse");
      });

      it("should deny credit when config denies (line 572-591)", async () => {
        const mockAccountRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircleConfig: {
                allowMemberCredits: false,
                allowMemberDebits: true,
              },
            }),
          }),
        };


        const mockMemberRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: {
                role: "member",
                holderId: "holder123",
                relationshipType: "child",
              },
            }),
          }),
        };

        mockDoc.mockImplementation((id?: string) => {
          if (id === "member123") {
            return mockMemberRef;
          }
          return {
            collection: jest.fn(() => ({
              doc: jest.fn((accountId?: string) => {
                if (accountId === "account123") {
                  return mockAccountRef;
                }
                return createMockDocRef(accountId || "default");
              }),
            })),
          };
        });

        await expect(
          familyCircleService.validateMemberTransactionPermission(
            "holder123",
            "member123",
            "account123",
            "credit"
          )
        ).rejects.toThrow("not allowed to credit");
      });

      it("should allow debit when config allows (line 572-591)", async () => {
        const mockAccountRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircleConfig: {
                allowMemberCredits: false,
                allowMemberDebits: true,
              },
            }),
          }),
        };

        const mockMemberRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: {
                role: "member",
                holderId: "holder123",
                relationshipType: "parent",
              },
            }),
          }),
        };

        mockDoc.mockImplementation((id?: string) => {
          if (id === "member123") {
            return mockMemberRef;
          }
          return {
            collection: jest.fn(() => ({
              doc: jest.fn((accountId?: string) => {
                if (accountId === "account123") {
                  return mockAccountRef;
                }
                return createMockDocRef(accountId || "default");
              }),
            })),
          };
        });

        const result = await familyCircleService.validateMemberTransactionPermission(
          "holder123",
          "member123",
          "account123",
          "debit"
        );

        expect(result).toBe("parent");
      });

      it("should deny debit when config denies (line 572-591)", async () => {
        const mockAccountRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircleConfig: {
                allowMemberCredits: true,
                allowMemberDebits: false,
              },
            }),
          }),
        };

        const mockMemberRef = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              familyCircle: {
                role: "member",
                holderId: "holder123",
                relationshipType: "sibling",
              },
            }),
          }),
        };

        mockDoc.mockImplementation((id?: string) => {
          if (id === "member123") {
            return mockMemberRef;
          }
          return {
            collection: jest.fn(() => ({
              doc: jest.fn((accountId?: string) => {
                if (accountId === "account123") {
                  return mockAccountRef;
                }
                return createMockDocRef(accountId || "default");
              }),
            })),
          };
        });

        await expect(
          familyCircleService.validateMemberTransactionPermission(
            "holder123",
            "member123",
            "account123",
            "debit"
          )
        ).rejects.toThrow("not allowed to debit");
      });
    });
  });

  describe("familyCircleService factory", () => {
    it("should lazily create singleton instance and proxy calls", async () => {
      const infoSpy = jest
        .spyOn(FamilyCircleService.prototype as any, "getFamilyCircleInfo")
        .mockResolvedValue({ role: null, message: "ok" });
      const membersSpy = jest
        .spyOn(FamilyCircleService.prototype as any, "getFamilyCircleMembers")
        .mockResolvedValue({ data: [], metadata: { totalMembers: 0, holder: { clientId: "h1" } } });
      const addSpy = jest
        .spyOn(FamilyCircleService.prototype as any, "addFamilyCircleMember")
        .mockResolvedValue({
          memberId: "m1",
          relationshipType: "child",
          addedAt: new Date("2024-01-01T00:00:00.000Z"),
          addedBy: "actor",
        });
      const removeSpy = jest
        .spyOn(FamilyCircleService.prototype as any, "removeFamilyCircleMember")
        .mockResolvedValue(undefined);
      const getConfigSpy = jest
        .spyOn(FamilyCircleService.prototype as any, "getFamilyCircleConfig")
        .mockResolvedValue({
          allowMemberCredits: true,
          allowMemberDebits: false,
          updatedAt: new Date(),
          updatedBy: "actor",
        });
      const updateConfigSpy = jest
        .spyOn(FamilyCircleService.prototype as any, "updateFamilyCircleConfig")
        .mockResolvedValue({
          allowMemberCredits: false,
          allowMemberDebits: true,
          updatedAt: new Date(),
          updatedBy: "actor",
        });
      const validateSpy = jest
        .spyOn(FamilyCircleService.prototype as any, "validateMemberTransactionPermission")
        .mockResolvedValue("spouse");

      const firstInstance = familyCircleServiceSingleton.instance;
      const secondInstance = familyCircleServiceSingleton.instance;

      expect(firstInstance).toBeInstanceOf(FamilyCircleService);
      expect(secondInstance).toBe(firstInstance);

      await familyCircleServiceSingleton.getFamilyCircleInfo("holder1");
      await familyCircleServiceSingleton.getFamilyCircleMembers("holder1", "requester1");
      await familyCircleServiceSingleton.addFamilyCircleMember(
        "holder1",
        { memberId: "member1", relationshipType: "sibling" },
        mockActor
      );
      await familyCircleServiceSingleton.removeFamilyCircleMember("holder1", "member1", mockActor);
      await familyCircleServiceSingleton.getFamilyCircleConfig("holder1", "account1");
      await familyCircleServiceSingleton.updateFamilyCircleConfig(
        "holder1",
        "account1",
        { allowMemberCredits: false, allowMemberDebits: true },
        mockActor
      );
      await familyCircleServiceSingleton.validateMemberTransactionPermission(
        "holder1",
        "member1",
        "account1",
        "credit"
      );

      expect(infoSpy).toHaveBeenCalledWith("holder1");
      expect(membersSpy).toHaveBeenCalledWith("holder1", "requester1");
      expect(addSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(getConfigSpy).toHaveBeenCalled();
      expect(updateConfigSpy).toHaveBeenCalled();
      expect(validateSpy).toHaveBeenCalledWith("holder1", "member1", "account1", "credit");
    });
  });
});
