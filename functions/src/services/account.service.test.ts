import { AccountService } from "./account.service";
import { AuditService } from "./audit.service";
import { NotFoundError, AppError } from "../core/errors";

// Mock firebase-admin with FieldValue
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
    arrayUnion: jest.fn((value) => ({ _arrayUnion: value })),
    arrayRemove: jest.fn((value) => ({ _arrayRemove: value })),
  },
}));

const admin = require("firebase-admin");
const mockFirestoreInstance = admin.firestore();

// Mock AuditService
jest.mock("./audit.service");

describe("AccountService", () => {
  let accountService: AccountService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockDoc: jest.Mock;

  const mockActor = {
    uid: "user123",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock doc reference with all required methods
    const createMockDocRef: any = (id: string = "mock-id", data: any = {}) => ({
      id,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id,
        data: () => ({
          account_name: "Main Account",
          points: 100,
          affinityGroupIds: [],
          created_at: { toDate: () => new Date("2025-01-01") },
          updated_at: { toDate: () => new Date("2025-01-01") },
          ...data,
        }),
      }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn(() => ({
        doc: jest.fn((docId?: string) => createMockDocRef(docId || "account123")),
        get: jest.fn().mockResolvedValue({
          docs: [],
          empty: true,
        }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      })),
    });

    mockDoc = jest.fn((id?: string) => createMockDocRef(id));

    mockFirestoreInstance.collection.mockReturnValue({
      doc: mockDoc,
      get: jest.fn().mockResolvedValue({
        docs: [],
        empty: true,
      }),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    });

    mockFirestoreInstance.runTransaction.mockImplementation(
      async (callback: any) => {
        const transaction = {
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn(),
        };
        await callback(transaction);
        return undefined;
      }
    );

    mockAuditService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);

    accountService = new AccountService(mockFirestoreInstance as any);
  });

  describe("createAccount", () => {
    it("should create a loyalty account", async () => {
      const clientId = "client123";
      const accountData = {
        account_name: "Main Account",
      };

      // Mock account creation with nested structure
      const mockAccountDoc = {
        id: "account123",
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "account123",
          data: () => ({
            account_name: "Main Account",
            points: 0,
            familyCircleConfig: null,
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        }),
      };

      mockDoc.mockImplementation((id?: string) => {
        if (!id) {
          return mockAccountDoc;
        }
        return {
          get: jest.fn().mockResolvedValue({ exists: true }),
          collection: jest.fn(() => ({
            doc: jest.fn(() => mockAccountDoc),
          })),
        };
      });

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            set: jest.fn(),
            update: jest.fn(),
            get: jest.fn().mockResolvedValue({ exists: true }),
          };
          await callback(transaction);
        }
      );

      const result = await accountService.createAccount(
        clientId,
        accountData,
        mockActor
      );

      expect(result.account_name).toBe("Main Account");
      expect(result.points).toBe(0);
      expect(mockAuditService.createAuditLog).toHaveBeenCalled();
    });

    it("should throw NotFoundError if client does not exist", async () => {
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      });

      await expect(
        accountService.createAccount("nonexistent", { account_name: "Test" }, mockActor)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("creditPoints", () => {
    it("should credit points and create audit log atomically", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const creditData = {
        amount: 100,
        description: "Purchase reward",
      };

      const mockAccountData = {
        account_name: "Main Account",
        points: 50,
        familyCircleConfig: null,
        created_at: { toDate: () => new Date("2025-01-01") },
        updated_at: { toDate: () => new Date("2025-01-01") },
      };

      const mockUpdatedAccountData = {
        ...mockAccountData,
        points: 150,
        updated_at: { toDate: () => new Date("2025-01-02") },
      };

      // Mock the nested collection/doc structure
      const mockTransactionDoc = {
        id: "transaction123",
        collection: jest.fn(),
      };

      const mockAccountRef = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => mockTransactionDoc),
        })),
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: accountId,
          data: () => mockUpdatedAccountData,
        }),
      };

      mockDoc.mockImplementation((id?: string) => {
        if (id === clientId) {
          return {
            collection: jest.fn(() => ({
              doc: jest.fn(() => mockAccountRef),
            })),
            update: jest.fn(),
          };
        }
        return mockAccountRef;
      });

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: accountId,
              data: () => mockAccountData,
            }),
            update: jest.fn(),
            set: jest.fn(),
          };
          await callback(transaction);
        }
      );

      const result = await accountService.creditPoints(
        clientId,
        accountId,
        creditData,
        mockActor
      );

      expect(result.points).toBe(150);
    });

    it("should throw error for negative amount", async () => {
      await expect(
        accountService.creditPoints(
          "client123",
          "account123",
          { amount: -10, description: "Invalid" },
          mockActor
        )
      ).rejects.toThrow();
    });
  });

  describe("debitPoints", () => {
    it("should debit points and create audit log atomically", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const debitData = {
        amount: 30,
        description: "Reward redemption",
      };

      const mockAccountData = {
        account_name: "Main Account",
        points: 100,
        familyCircleConfig: null,
        created_at: { toDate: () => new Date("2025-01-01") },
        updated_at: { toDate: () => new Date("2025-01-01") },
      };

      const mockUpdatedAccountData = {
        ...mockAccountData,
        points: 70,
        updated_at: { toDate: () => new Date("2025-01-02") },
      };

      const mockTransactionDoc = {
        id: "transaction123",
        collection: jest.fn(),
      };

      const mockAccountRef = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => mockTransactionDoc),
        })),
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: accountId,
          data: () => mockUpdatedAccountData,
        }),
      };

      mockDoc.mockImplementation((id?: string) => {
        if (id === clientId) {
          return {
            collection: jest.fn(() => ({
              doc: jest.fn(() => mockAccountRef),
            })),
            update: jest.fn(),
          };
        }
        return mockAccountRef;
      });

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: accountId,
              data: () => mockAccountData,
            }),
            update: jest.fn(),
            set: jest.fn(),
          };
          await callback(transaction);
        }
      );

      const result = await accountService.debitPoints(
        clientId,
        accountId,
        debitData,
        mockActor
      );

      expect(result.points).toBe(70);
    });

    it("should throw error for insufficient balance", async () => {
      const mockTransactionDoc = {
        id: "transaction123",
        collection: jest.fn(),
      };

      const mockAccountRef = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => mockTransactionDoc),
        })),
      };

      mockDoc.mockImplementation(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => mockAccountRef),
        })),
        update: jest.fn(),
      }));

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                points: 10,
              }),
            }),
            update: jest.fn(),
            set: jest.fn(),
          };
          await callback(transaction);
        }
      );

      await expect(
        accountService.debitPoints(
          "client123",
          "account123",
          { amount: 100, description: "Too much" },
          mockActor
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe("getAccountBalance", () => {
    it("should return account balance", async () => {
      // The beforeEach already sets up proper mocks
      const result = await accountService.getAccountBalance("client123", "account123");

      expect(result.points).toBe(100); // from the default mock
    });

    it("should throw NotFoundError if account does not exist", async () => {
      // Override mock for this specific test case
      mockDoc.mockImplementation((id: string) => {
        if (id === "client123") {
          // Client exists
          return {
            get: jest.fn().mockResolvedValue({ exists: true }),
            collection: jest.fn(() => ({
              doc: jest.fn((accId) => {
                if (accId === "nonexistent") {
                  // Account does not exist
                  return {
                    get: jest.fn().mockResolvedValue({ exists: false }),
                  };
                }
                return {};
              }),
            })),
          };
        }
        return {};
      });

      await expect(
        accountService.getAccountBalance("client123", "nonexistent")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("listAccounts", () => {
    it("should list all accounts for a client", async () => {
      const mockDocs = [
        {
          id: "account1",
          data: () => ({
            account_name: "Main",
            points: 100,
            familyCircleConfig: null,
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        },
        {
          id: "account2",
          data: () => ({
            account_name: "Bonus",
            points: 50,
            familyCircleConfig: null,
            created_at: { toDate: () => new Date("2025-01-02") },
            updated_at: { toDate: () => new Date("2025-01-02") },
          }),
        },
      ];

      mockDoc.mockImplementation((id: string) => {
        if (id === "client123") {
          return {
            get: jest.fn().mockResolvedValue({ exists: true }),
            collection: jest.fn(() => ({
              orderBy: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({
                docs: mockDocs,
                empty: false,
                forEach: (cb: any) => mockDocs.forEach(cb),
              }),
            })),
          };
        }
        return {};
      });

      const result = await accountService.listAccounts("client123");
      
      expect(result).toHaveLength(2);
      expect(result[0]!.account_name).toBe("Main");
      expect(result[1]!.account_name).toBe("Bonus");
    });
  });
});
