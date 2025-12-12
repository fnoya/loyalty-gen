import { AccountService } from "../account.service";
import { AuditService } from "../audit.service";

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
  let mockWhere: jest.Mock;

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
    mockWhere = jest.fn().mockReturnThis();
    mockDoc = jest.fn();
    mockCollection = jest.fn();

    // Setup chainable mocks
    const mockQuery = {
      orderBy: mockOrderBy,
      limit: mockLimit,
      startAfter: mockStartAfter,
      where: mockWhere,
      get: mockGet,
      doc: mockDoc,
      collection: mockCollection,
    };

    mockOrderBy.mockReturnValue(mockQuery);
    mockLimit.mockReturnValue(mockQuery);
    mockStartAfter.mockReturnValue(mockQuery);
    mockWhere.mockReturnValue(mockQuery);
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

  describe("listTransactions filtering", () => {
    it("should filter transactions by type credit only", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const transactionType = "credit";

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

      // All mock transactions
      const allMockTransactions = [
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Credit 1",
            timestamp: { toDate: () => new Date("2025-01-15") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "debit",
            amount: 30,
            description: "Debit should not be returned",
            timestamp: { toDate: () => new Date("2025-01-18") },
          }),
        },
        {
          id: "tx3",
          data: () => ({
            transaction_type: "credit",
            amount: 50,
            description: "Credit 2",
            timestamp: { toDate: () => new Date("2025-01-20") },
          }),
        },
        {
          id: "tx4",
          data: () => ({
            transaction_type: "debit",
            amount: 75,
            description: "Another debit should not be returned",
            timestamp: { toDate: () => new Date("2025-01-25") },
          }),
        },
      ];

      // Filtered to only credit transactions
      const filteredMockTransactions = allMockTransactions.filter(
        (tx) => tx.data().transaction_type === transactionType
      );

      mockGet.mockResolvedValueOnce({
        docs: filteredMockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        undefined,
        undefined,
        transactionType as any
      );

      expect(mockWhere).toHaveBeenCalledWith(
        "transaction_type",
        "==",
        transactionType
      );
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every((tx) => tx.transaction_type === "credit")).toBe(true);
      expect(result.transactions.some((tx) => tx.transaction_type === "debit")).toBe(false);
    });

    it("should filter transactions by type debit only", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const transactionType = "debit";

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

      // All mock transactions
      const allMockTransactions = [
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Credit should not be returned",
            timestamp: { toDate: () => new Date("2025-01-12") },
          }),
        },
        {
          id: "tx3",
          data: () => ({
            transaction_type: "debit",
            amount: 30,
            description: "Debit 1",
            timestamp: { toDate: () => new Date("2025-01-18") },
          }),
        },
        {
          id: "tx4",
          data: () => ({
            transaction_type: "credit",
            amount: 200,
            description: "Another credit should not be returned",
            timestamp: { toDate: () => new Date("2025-01-22") },
          }),
        },
      ];

      // Filtered to only debit transactions
      const filteredMockTransactions = allMockTransactions.filter(
        (tx) => tx.data().transaction_type === transactionType
      );

      mockGet.mockResolvedValueOnce({
        docs: filteredMockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        undefined,
        undefined,
        transactionType as any
      );

      expect(mockWhere).toHaveBeenCalledWith(
        "transaction_type",
        "==",
        transactionType
      );
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]?.transaction_type).toBe("debit");
      expect(result.transactions.some((tx) => tx.transaction_type === "credit")).toBe(false);
    });

    it("should filter transactions by date range with both start and end dates", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const startDate = new Date("2025-01-10");
      const endDate = new Date("2025-01-20");

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

      // All mock transactions
      const allMockTransactions = [
        {
          id: "tx0",
          data: () => ({
            transaction_type: "credit",
            amount: 50,
            description: "Before range should not be returned",
            timestamp: { toDate: () => new Date("2025-01-05") },
          }),
        },
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Within range",
            timestamp: { toDate: () => new Date("2025-01-15") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "credit",
            amount: 200,
            description: "Also within range",
            timestamp: { toDate: () => new Date("2025-01-18") },
          }),
        },
        {
          id: "tx3",
          data: () => ({
            transaction_type: "credit",
            amount: 150,
            description: "After range should not be returned",
            timestamp: { toDate: () => new Date("2025-01-25") },
          }),
        },
      ];

      // Filtered by date range
      const filteredMockTransactions = allMockTransactions.filter((tx) => {
        const timestamp = tx.data().timestamp.toDate();
        return timestamp >= startDate && timestamp <= endDate;
      });

      mockGet.mockResolvedValueOnce({
        docs: filteredMockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        startDate,
        endDate
      );

      expect(mockWhere).toHaveBeenCalledWith("timestamp", ">=", startDate);
      expect(mockWhere).toHaveBeenCalledWith("timestamp", "<=", endDate);
      expect(result.transactions).toHaveLength(2);
    });

    it("should filter transactions with only start date (no end date)", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const startDate = new Date("2025-01-15");

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

      // All mock transactions
      const allMockTransactions = [
        {
          id: "tx0",
          data: () => ({
            transaction_type: "credit",
            amount: 75,
            description: "Before start date should not be returned",
            timestamp: { toDate: () => new Date("2025-01-10") },
          }),
        },
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "On start date",
            timestamp: { toDate: () => new Date("2025-01-15") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "credit",
            amount: 200,
            description: "After start date",
            timestamp: { toDate: () => new Date("2025-02-10") },
          }),
        },
      ];

      // Filtered by start date only
      const filteredMockTransactions = allMockTransactions.filter(
        (tx) => tx.data().timestamp.toDate() >= startDate
      );

      mockGet.mockResolvedValueOnce({
        docs: filteredMockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        startDate,
        undefined
      );

      expect(mockWhere).toHaveBeenCalledWith("timestamp", ">=", startDate);
      expect(mockWhere).not.toHaveBeenCalledWith(
        "timestamp",
        "<=",
        expect.anything()
      );
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every((tx) => tx.timestamp >= startDate)).toBe(true);
    });

    it("should filter transactions with only end date (no start date)", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const endDate = new Date("2025-01-20");

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

      // All mock transactions
      const allMockTransactions = [
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Before end date",
            timestamp: { toDate: () => new Date("2025-01-10") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "credit",
            amount: 200,
            description: "On end date",
            timestamp: { toDate: () => new Date("2025-01-20") },
          }),
        },
        {
          id: "tx3",
          data: () => ({
            transaction_type: "credit",
            amount: 150,
            description: "After end date should not be returned",
            timestamp: { toDate: () => new Date("2025-02-01") },
          }),
        },
      ];

      // Filtered by end date only
      const filteredMockTransactions = allMockTransactions.filter(
        (tx) => tx.data().timestamp.toDate() <= endDate
      );

      mockGet.mockResolvedValueOnce({
        docs: filteredMockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        undefined,
        endDate
      );

      expect(mockWhere).toHaveBeenCalledWith("timestamp", "<=", endDate);
      expect(mockWhere).not.toHaveBeenCalledWith(
        "timestamp",
        ">=",
        expect.anything()
      );
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every((tx) => tx.timestamp <= endDate)).toBe(true);
    });

    it("should combine type filter with date range", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const startDate = new Date("2025-01-10");
      const endDate = new Date("2025-01-20");
      const transactionType = "credit";

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

      // All mock transactions
      const allMockTransactions = [
        {
          id: "tx0",
          data: () => ({
            transaction_type: "credit",
            amount: 50,
            description: "Credit before range should not be returned",
            timestamp: { toDate: () => new Date("2025-01-05") },
          }),
        },
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Credit within range",
            timestamp: { toDate: () => new Date("2025-01-15") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "debit",
            amount: 30,
            description: "Debit within range should not be returned",
            timestamp: { toDate: () => new Date("2025-01-17") },
          }),
        },
        {
          id: "tx3",
          data: () => ({
            transaction_type: "credit",
            amount: 150,
            description: "Credit after range should not be returned",
            timestamp: { toDate: () => new Date("2025-01-25") },
          }),
        },
      ];

      // Filtered by type and date range
      const filteredMockTransactions = allMockTransactions.filter((tx) => {
        const data = tx.data();
        const timestamp = data.timestamp.toDate();
        return (
          data.transaction_type === transactionType &&
          timestamp >= startDate &&
          timestamp <= endDate
        );
      });

      mockGet.mockResolvedValueOnce({
        docs: filteredMockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        startDate,
        endDate,
        transactionType as any
      );

      expect(mockWhere).toHaveBeenCalledWith("timestamp", ">=", startDate);
      expect(mockWhere).toHaveBeenCalledWith("timestamp", "<=", endDate);
      expect(mockWhere).toHaveBeenCalledWith(
        "transaction_type",
        "==",
        transactionType
      );
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]?.transaction_type).toBe("credit");
      expect(result.transactions[0]?.amount).toBe(100);
    });

    it("should combine type filter with only start date", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const startDate = new Date("2025-01-15");
      const transactionType = "debit";

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

      // All mock transactions
      const allMockTransactions = [
        {
          id: "tx0",
          data: () => ({
            transaction_type: "debit",
            amount: 20,
            description: "Debit before start should not be returned",
            timestamp: { toDate: () => new Date("2025-01-10") },
          }),
        },
        {
          id: "tx1",
          data: () => ({
            transaction_type: "debit",
            amount: 50,
            description: "Debit after start",
            timestamp: { toDate: () => new Date("2025-01-18") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Credit after start should not be returned",
            timestamp: { toDate: () => new Date("2025-01-20") },
          }),
        },
        {
          id: "tx3",
          data: () => ({
            transaction_type: "debit",
            amount: 30,
            description: "Debit much later",
            timestamp: { toDate: () => new Date("2025-02-01") },
          }),
        },
      ];

      // Filtered by type and start date
      const filteredMockTransactions = allMockTransactions.filter((tx) => {
        const data = tx.data();
        const timestamp = data.timestamp.toDate();
        return (
          data.transaction_type === transactionType && timestamp >= startDate
        );
      });

      mockGet.mockResolvedValueOnce({
        docs: filteredMockTransactions,
        empty: false,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        startDate,
        undefined,
        transactionType as any
      );

      expect(mockWhere).toHaveBeenCalledWith("timestamp", ">=", startDate);
      expect(mockWhere).toHaveBeenCalledWith(
        "transaction_type",
        "==",
        transactionType
      );
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every((tx) => tx.transaction_type === "debit")).toBe(true);
      expect(result.transactions.every((tx) => tx.timestamp >= startDate)).toBe(true);
      expect(result.transactions.some((tx) => tx.transaction_type === "credit")).toBe(false);
    });

    it("should handle no filters (retrieve all transactions)", async () => {
      const clientId = "client123";
      const accountId = "account123";

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

      // Mock transactions list with mixed types and dates
      const mockTransactions = [
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "Old credit",
            timestamp: { toDate: () => new Date("2024-12-01") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "debit",
            amount: 50,
            description: "Recent debit",
            timestamp: { toDate: () => new Date("2025-02-01") },
          }),
        },
        {
          id: "tx3",
          data: () => ({
            transaction_type: "credit",
            amount: 200,
            description: "Another credit",
            timestamp: { toDate: () => new Date("2025-01-15") },
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
        10
      );

      // Verify no filters were applied
      expect(mockWhere).not.toHaveBeenCalled();
      expect(result.transactions).toHaveLength(3);
    });

    it("should handle empty result set with filters", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const startDate = new Date("2025-03-01");
      const endDate = new Date("2025-03-31");
      const transactionType = "credit";

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

      // Mock empty transactions list
      mockGet.mockResolvedValueOnce({
        docs: [],
        empty: true,
      });

      const result = await accountService.listTransactions(
        clientId,
        accountId,
        10,
        undefined,
        startDate,
        endDate,
        transactionType as any
      );

      expect(result.transactions).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it("should handle boundary dates (inclusive)", async () => {
      const clientId = "client123";
      const accountId = "account123";
      const startDate = new Date("2025-01-01T00:00:00Z");
      const endDate = new Date("2025-01-31T23:59:59Z");

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

      // Mock transactions at exact boundaries
      const mockTransactions = [
        {
          id: "tx1",
          data: () => ({
            transaction_type: "credit",
            amount: 100,
            description: "At start boundary",
            timestamp: { toDate: () => new Date("2025-01-01T00:00:00Z") },
          }),
        },
        {
          id: "tx2",
          data: () => ({
            transaction_type: "credit",
            amount: 200,
            description: "At end boundary",
            timestamp: { toDate: () => new Date("2025-01-31T23:59:59Z") },
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
        undefined,
        startDate,
        endDate
      );

      expect(mockWhere).toHaveBeenCalledWith("timestamp", ">=", startDate);
      expect(mockWhere).toHaveBeenCalledWith("timestamp", "<=", endDate);
      expect(result.transactions).toHaveLength(2);
    });
  });
});
