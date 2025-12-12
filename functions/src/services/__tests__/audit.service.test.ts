import { Firestore } from "firebase-admin/firestore";
import { AuditService } from "../audit.service";
import { AuditActor } from "../../schemas/audit.schema";

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(),
  runTransaction: jest.fn(),
} as unknown as Firestore;

describe("AuditService", () => {
  let auditService: AuditService;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;
  let mockStartAfter: jest.Mock;

  const mockActor: AuditActor = {
    uid: "user123",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockSet = jest.fn().mockResolvedValue(undefined);
    mockGet = jest.fn();
    mockDoc = jest.fn();
    mockWhere = jest.fn();
    mockOrderBy = jest.fn();
    mockLimit = jest.fn();
    mockStartAfter = jest.fn();
    mockCollection = jest.fn();

    // Setup the mock collection chain
    (mockFirestore.collection as jest.Mock).mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
    });

    auditService = new AuditService(mockFirestore);
  });

  describe("createAuditLog", () => {
    it("should create an audit log for CLIENT_CREATED action", async () => {
      const mockDocRef = {
        id: "audit123",
        set: mockSet,
        get: mockGet,
      };

      mockDoc.mockReturnValue(mockDocRef);

      const mockSnapshot = {
        id: "audit123",
        data: () => ({
          action: "CLIENT_CREATED",
          resource_type: "client",
          resource_id: "client123",
          client_id: "client123",
          account_id: null,
          group_id: null,
          transaction_id: null,
          actor: mockActor,
          changes: {
            before: null,
            after: { name: "John Doe", email: "john@example.com" },
          },
          metadata: {
            ip_address: "192.168.1.1",
            user_agent: "Mozilla/5.0",
            description: null,
          },
          timestamp: { toDate: () => new Date("2025-01-01T00:00:00Z") },
        }),
      };

      mockGet.mockResolvedValue(mockSnapshot);

      const result = await auditService.createAuditLog({
        action: "CLIENT_CREATED",
        resource_type: "client",
        resource_id: "client123",
        client_id: "client123",
        actor: mockActor,
        changes: {
          before: null,
          after: { name: "John Doe", email: "john@example.com" },
        },
        metadata: {
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
        },
      });

      expect(result).toBeDefined();
      expect(result!.action).toBe("CLIENT_CREATED");
      expect(result!.resource_type).toBe("client");
      expect(result!.resource_id).toBe("client123");
      expect(result!.actor).toEqual(mockActor);
      expect(mockSet).toHaveBeenCalledTimes(1);
    });

    it("should create an audit log for POINTS_CREDITED action", async () => {
      const mockDocRef = {
        id: "audit456",
        set: mockSet,
        get: mockGet,
      };

      mockDoc.mockReturnValue(mockDocRef);

      const mockSnapshot = {
        id: "audit456",
        data: () => ({
          action: "POINTS_CREDITED",
          resource_type: "transaction",
          resource_id: "trans123",
          client_id: "client123",
          account_id: "account123",
          group_id: null,
          transaction_id: "trans123",
          actor: mockActor,
          changes: {
            before: { points: 100 },
            after: { points: 200 },
          },
          metadata: {
            ip_address: null,
            user_agent: null,
            description: "Added 100 points",
          },
          timestamp: { toDate: () => new Date("2025-01-01T00:00:00Z") },
        }),
      };

      mockGet.mockResolvedValue(mockSnapshot);

      const result = await auditService.createAuditLog({
        action: "POINTS_CREDITED",
        resource_type: "transaction",
        resource_id: "trans123",
        client_id: "client123",
        account_id: "account123",
        transaction_id: "trans123",
        actor: mockActor,
        changes: {
          before: { points: 100 },
          after: { points: 200 },
        },
        metadata: {
          description: "Added 100 points",
        },
      });

      expect(result).toBeDefined();
      expect(result!.action).toBe("POINTS_CREDITED");
      expect(result!.account_id).toBe("account123");
      expect(result!.transaction_id).toBe("trans123");
    });

    it("should create audit log within a transaction without returning", async () => {
      const mockTransaction = {
        set: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
      };

      const mockDocRef = {
        id: "audit789",
        set: mockSet,
        get: mockGet,
      };

      mockDoc.mockReturnValue(mockDocRef);

      const result = await auditService.createAuditLog(
        {
          action: "POINTS_DEBITED",
          resource_type: "transaction",
          resource_id: "trans456",
          client_id: "client123",
          account_id: "account123",
          actor: mockActor,
        },
        mockTransaction as any
      );

      expect(result).toBeUndefined();
      expect(mockTransaction.set).toHaveBeenCalledTimes(1);
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe("listAuditLogs", () => {
    it("should list audit logs with default pagination", async () => {
      const mockQuery = {
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        startAfter: mockStartAfter,
        get: mockGet,
      };

      mockOrderBy.mockReturnValue(mockQuery);
      mockWhere.mockReturnValue(mockQuery);
      mockLimit.mockReturnValue(mockQuery);
      mockStartAfter.mockReturnValue(mockQuery);

      mockCollection.mockReturnValue({
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      (mockFirestore.collection as jest.Mock).mockReturnValue(mockCollection());

      const mockDocs = [
        {
          id: "audit1",
          data: () => ({
            action: "CLIENT_CREATED",
            resource_type: "client",
            resource_id: "client1",
            client_id: "client1",
            account_id: null,
            group_id: null,
            transaction_id: null,
            actor: mockActor,
            changes: { before: null, after: { name: "Test" } },
            metadata: {},
            timestamp: { toDate: () => new Date("2025-01-01T00:00:00Z") },
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback),
      });

      const result = await auditService.listAuditLogs({
        limit: 30,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.action).toBe("CLIENT_CREATED");
      // Since we only have 1 result but limit is 30, there's no next page
      expect(result.paging.next_cursor).toBeNull();
    });

    it("should filter audit logs by action", async () => {
      const mockQuery = {
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        startAfter: mockStartAfter,
        get: mockGet,
      };

      mockOrderBy.mockReturnValue(mockQuery);
      mockWhere.mockReturnValue(mockQuery);
      mockLimit.mockReturnValue(mockQuery);

      mockCollection.mockReturnValue({
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      (mockFirestore.collection as jest.Mock).mockReturnValue(mockCollection());

      mockGet.mockResolvedValue({
        docs: [],
        forEach: (callback: any) => {},
      });

      await auditService.listAuditLogs({
        action: "POINTS_CREDITED",
        limit: 30,
      });

      expect(mockWhere).toHaveBeenCalledWith("action", "==", "POINTS_CREDITED");
    });

    it("should filter audit logs by client_id", async () => {
      const mockQuery = {
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
      };

      mockOrderBy.mockReturnValue(mockQuery);
      mockWhere.mockReturnValue(mockQuery);
      mockLimit.mockReturnValue(mockQuery);

      mockCollection.mockReturnValue({
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      (mockFirestore.collection as jest.Mock).mockReturnValue(mockCollection());

      mockGet.mockResolvedValue({
        docs: [],
        forEach: (callback: any) => {},
      });

      await auditService.listAuditLogs({
        client_id: "client123",
        limit: 30,
      });

      expect(mockWhere).toHaveBeenCalledWith("client_id", "==", "client123");
    });
  });

  describe("getClientAuditLogs", () => {
    it("should get audit logs for a specific client", async () => {
      const mockQuery = {
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
      };

      mockOrderBy.mockReturnValue(mockQuery);
      mockWhere.mockReturnValue(mockQuery);
      mockLimit.mockReturnValue(mockQuery);

      mockCollection.mockReturnValue({
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      (mockFirestore.collection as jest.Mock).mockReturnValue(mockCollection());

      mockGet.mockResolvedValue({
        docs: [],
        forEach: (callback: any) => {},
      });

      await auditService.getClientAuditLogs("client123");

      expect(mockWhere).toHaveBeenCalledWith("client_id", "==", "client123");
    });
  });

  describe("getAccountAuditLogs", () => {
    it("should get audit logs for a specific account", async () => {
      const mockQuery = {
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
      };

      mockOrderBy.mockReturnValue(mockQuery);
      mockWhere.mockReturnValue(mockQuery);
      mockLimit.mockReturnValue(mockQuery);

      mockCollection.mockReturnValue({
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      (mockFirestore.collection as jest.Mock).mockReturnValue(mockCollection());

      mockGet.mockResolvedValue({
        docs: [],
        forEach: (callback: any) => {},
      });

      await auditService.getAccountAuditLogs("account123");

      expect(mockWhere).toHaveBeenCalledWith("account_id", "==", "account123");
    });
  });
});
