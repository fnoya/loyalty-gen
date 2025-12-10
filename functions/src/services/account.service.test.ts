import { AccountService } from "./account.service";
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

    mockDoc = jest.fn();

    mockFirestoreInstance.collection.mockReturnValue({
      doc: mockDoc,
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

    accountService = new AccountService();
  });

  describe("createAccount", () => {
    it("should create a loyalty account", async () => {
      const clientId = "client123";
      const accountData = {
        account_name: "Main Account",
      };

      // Mock client exists
      mockDoc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
        }),
      });

      // Mock account creation
      const mockAccountRef = {
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

      mockDoc
        .mockReturnValueOnce({
          get: jest.fn().mockResolvedValue({ exists: true }),
        })
        .mockReturnValueOnce({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(mockAccountRef),
          }),
        });

      mockFirestoreInstance.runTransaction.mockImplementation(
        async (callback: any) => {
          const transaction = {
            set: jest.fn(),
            update: jest.fn(),
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
      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCOUNT_CREATED",
          resource_type: "loyalty_account",
        })
      );
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

      const mockAccountRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: accountId,
          data: () => mockUpdatedAccountData,
        }),
      };

      mockDoc.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue(mockAccountRef),
        }),
      });

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

      const mockAccountRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: accountId,
          data: () => mockUpdatedAccountData,
        }),
      };

      mockDoc.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue(mockAccountRef),
        }),
      });

      const result = await accountService.debitPoints(
        clientId,
        accountId,
        debitData,
        mockActor
      );

      expect(result.points).toBe(70);
    });

    it("should throw error for insufficient balance", async () => {
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
      const mockAccountData = {
        account_name: "Main Account",
        points: 250,
        familyCircleConfig: null,
        created_at: { toDate: () => new Date("2025-01-01") },
        updated_at: { toDate: () => new Date("2025-01-01") },
      };

      mockDoc.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: "account123",
              data: () => mockAccountData,
            }),
          }),
        }),
      });

      const result = await accountService.getAccountBalance("client123", "account123");

      expect(result.points).toBe(250);
    });

    it("should throw NotFoundError if account does not exist", async () => {
      mockDoc.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: false,
            }),
          }),
        }),
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
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        },
      ];

      mockDoc.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: mockDocs,
            empty: false,
          }),
        }),
      });

      const result = await accountService.listAccounts("client123");

      expect(result).toHaveLength(2);
      expect(result[0]!.account_name).toBe("Main");
      expect(result[1]!.account_name).toBe("Bonus");
    });
  });
});
