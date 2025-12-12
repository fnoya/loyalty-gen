import { AccountService } from "./account.service";
import { AuditService } from "./audit.service";

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

describe("AccountService Branch Coverage", () => {
  let accountService: AccountService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockDoc: jest.Mock;
  let mockCollection: jest.Mock;
  let mockGet: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;
  let mockStartAfter: jest.Mock;

  const mockActor = {
    uid: "user123",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockOrderBy = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();
    mockStartAfter = jest.fn().mockReturnThis();
    mockDoc = jest.fn();
    mockCollection = jest.fn();

    // Setup chainable mocks
    const mockQuery = {
      orderBy: mockOrderBy,
      limit: mockLimit,
      startAfter: mockStartAfter,
      get: mockGet,
      doc: mockDoc,
      collection: mockCollection,
    };

    mockOrderBy.mockReturnValue(mockQuery);
    mockLimit.mockReturnValue(mockQuery);
    mockStartAfter.mockReturnValue(mockQuery);
    mockCollection.mockReturnValue(mockQuery);
    mockDoc.mockReturnValue(mockQuery);

    mockFirestoreInstance.collection = mockCollection;

    mockAuditService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);

    accountService = new AccountService(mockFirestoreInstance as any);
  });

  describe("listTransactions pagination", () => {
    it("should handle pagination with nextCursor", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const nextCursor = "cursor123";

      // Mock client exists
      mockGet.mockResolvedValueOnce({ exists: true });
      // Mock account exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: accountId,
        data: () => ({
          account_name: "Test",
          points: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      });
      // Mock cursor doc exists
      mockGet.mockResolvedValueOnce({ exists: true });

      // Mock transactions list
      const mockTransactions = [
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Test",
            timestamp: { toDate: () => new Date() },
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        nextCursor
      );

      expect(mockStartAfter).toHaveBeenCalled();
      expect(result.transactions).toHaveLength(1);
    });

    it("should handle pagination when cursor doc does not exist", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const nextCursor = "invalid-cursor";

      // Mock client exists
      mockGet.mockResolvedValueOnce({ exists: true });
      // Mock account exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: accountId,
        data: () => ({
          account_name: "Test",
          points: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      });
      // Mock cursor doc DOES NOT exist
      mockGet.mockResolvedValueOnce({ exists: false });

      // Mock transactions list (should still be called, but without startAfter)
      mockGet.mockResolvedValueOnce({
        docs: [],
        empty: true,
      });

      await accountService.listTransactions(
        clientId,
        accountId,
        10,
        nextCursor
      );

      expect(mockStartAfter).not.toHaveBeenCalled();
    });

    it("should return nextCursor when there are more results", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const limit = 2;

      // Mock client exists
      mockGet.mockResolvedValueOnce({ exists: true });
      // Mock account exists
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: accountId,
        data: () => ({
          account_name: "Test",
          points: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      });

      // Mock transactions list with limit + 1 items
      const mockTransactions = [
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            timestamp: new Date(), // Test raw Date handling too
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "credit",
            amount: 200,
            timestamp: new Date(),
          }),
        },
        {
          id: "tx3", // This one should be cut off and used for cursor
          data: () => ({
            transaction_type: "credit",
            amount: 300,
            timestamp: new Date(),
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        limit
      );

      expect(result.transactions).toHaveLength(2);
      expect(result.nextCursor).toBe("tx2");
    });
  });

  describe("Optional fields handling", () => {
    it("should handle missing optional fields in listAccounts", async () => {
      const clientId = "client123";

      // Mock client exists
      mockGet.mockResolvedValueOnce({ exists: true });

      // Mock accounts list with missing optional fields
      const mockAccounts = [
        {
          id: "acc1",
          data: () => ({
            account_name: "Test",
            points: 0,
            // Missing familyCircleConfig
            created_at: new Date(), // Raw Date
            updated_at: new Date(), // Raw Date
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockAccounts,
        forEach: (cb: any) => mockAccounts.forEach(cb),
      });

      const result = await accountService.listAccounts(clientId);

      expect(result[0]?.familyCircleConfig).toBeNull();
    });

    it("should handle missing optional fields in getAccount", async () => {
      const clientId = "client123";
      const accountId = "acc1";

      // Mock client exists
      mockGet.mockResolvedValueOnce({ exists: true });

      // Mock account doc
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: accountId,
        data: () => ({
          account_name: "Test",
          points: 0,
          // Missing familyCircleConfig
          created_at: new Date(),
          updated_at: new Date(),
        }),
      });

      const result = await accountService.getAccount(clientId, accountId);

      expect(result.familyCircleConfig).toBeNull();
    });

    it("should handle missing description in creditPoints", async () => {
      const clientId = "client123";
      const accountId = "acc1";
      const request = { amount: 100 }; // Missing description

      // Mock transaction run
      mockFirestoreInstance.runTransaction.mockImplementation(
        async (cb: any) => {
          const transaction = {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ points: 0 }),
            }),
            update: jest.fn(),
            set: jest.fn(),
          };
          await cb(transaction);
        }
      );

      // Mock account fetch after transaction
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: accountId,
          data: () => ({
            account_name: "Test",
            points: 100,
            familyCircleConfig: null,
            created_at: new Date(),
            updated_at: new Date(),
          }),
        }),
        collection: mockCollection, // For pointTransactions
      });

      const result = await accountService.creditPoints(
        clientId,
        accountId,
        request as any,
        mockActor
      );
      expect(result.points).toBe(100);
    });

    it("should handle missing description in debitPoints", async () => {
      const clientId = "client123";
      const accountId = "acc1";
      const request = { amount: 50 }; // Missing description

      // Mock transaction run
      mockFirestoreInstance.runTransaction.mockImplementation(
        async (cb: any) => {
          const transaction = {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ points: 100 }),
            }),
            update: jest.fn(),
            set: jest.fn(),
          };
          await cb(transaction);
        }
      );

      // Mock account fetch after transaction
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: accountId,
          data: () => ({
            account_name: "Test",
            points: 50,
            familyCircleConfig: null,
            created_at: new Date(),
            updated_at: new Date(),
          }),
        }),
        collection: mockCollection,
      });

      const result = await accountService.debitPoints(
        clientId,
        accountId,
        request as any,
        mockActor
      );
      expect(result.points).toBe(50);
    });
  });
});
