import { ClientService } from "./client.service";
import { AuditService } from "./audit.service";
import {
  NotFoundError,
  AppError,
} from "../core/errors";

// Mock firebase-admin/firestore
const mockFirestoreInstance = {
  collection: jest.fn(),
  runTransaction: jest.fn(),
};

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => mockFirestoreInstance),
}));

// Mock AuditService
jest.mock("./audit.service");

describe("ClientService", () => {
  let clientService: ClientService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockDoc: jest.Mock;
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;

  const mockActor = {
    uid: "user123",
    email: "user@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockSet = jest.fn().mockResolvedValue(undefined);
    mockGet = jest.fn();
    mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockDelete = jest.fn().mockResolvedValue(undefined);
    mockDoc = jest.fn();
    mockWhere = jest.fn();
    mockOrderBy = jest.fn();
    mockLimit = jest.fn();

    mockFirestoreInstance.collection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      add: jest.fn(),
    });

    mockAuditService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);

    clientService = new ClientService();
  });

  describe("createClient", () => {
    it("should create a client with required fields", async () => {
      const clientData = {
        name: {
          firstName: "John",
          firstLastName: "Doe",
        },
        email: "john@example.com",
        phones: [],
        addresses: [],
        extra_data: {},
      };

      const mockDocRef = {
        id: "client123",
        set: mockSet,
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "client123",
          data: () => ({
            name: clientData.name,
            email: clientData.email,
            phones: [],
            addresses: [],
            extra_data: {},
            affinityGroupIds: [],
            account_balances: {},
            photoUrl: null,
            identity_document: null,
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        }),
      };

      mockDoc.mockReturnValue(mockDocRef);

      // Mock email check
      mockWhere.mockReturnThis();
      mockLimit.mockReturnThis();
      mockGet.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await clientService.createClient(clientData, mockActor);

      expect(result).toMatchObject({
        id: "client123",
        name: clientData.name,
        email: clientData.email,
      });
      expect(mockSet).toHaveBeenCalled();
      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_CREATED",
          resource_type: "client",
          resource_id: "client123",
          actor: mockActor,
        })
      );
    });

    it("should throw error if email already exists", async () => {
      const clientData = {
        name: {
          firstName: "John",
          firstLastName: "Doe",
        },
        email: "existing@example.com",
        phones: [],
        addresses: [],
        extra_data: {},
      };

      mockWhere.mockReturnThis();
      mockLimit.mockReturnThis();
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ id: "existing-client" }],
      });

      await expect(
        clientService.createClient(clientData, mockActor)
      ).rejects.toThrow(AppError);
    });
  });

  describe("getClient", () => {
    it("should return a client by ID", async () => {
      const mockDocData = {
        name: {
          firstName: "John",
          firstLastName: "Doe",
        },
        email: "john@example.com",
        phones: [],
        addresses: [],
        extra_data: {},
        affinityGroupIds: [],
        account_balances: {},
        photoUrl: null,
        identity_document: null,
        created_at: { toDate: () => new Date("2025-01-01") },
        updated_at: { toDate: () => new Date("2025-01-01") },
      };

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "client123",
          data: () => mockDocData,
        }),
      });

      const result = await clientService.getClient("client123");

      expect(result.id).toBe("client123");
      expect(result.email).toBe("john@example.com");
    });

    it("should throw NotFoundError if client does not exist", async () => {
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      });

      await expect(clientService.getClient("nonexistent")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("updateClient", () => {
    it("should update client and create audit log", async () => {
      const updateData = {
        name: {
          firstName: "Jane",
          firstLastName: "Smith",
        },
      };

      const mockBeforeData = {
        name: {
          firstName: "John",
          firstLastName: "Doe",
        },
        email: "john@example.com",
        phones: [],
        addresses: [],
        extra_data: {},
        affinityGroupIds: [],
        account_balances: {},
        photoUrl: null,
        identity_document: null,
        created_at: { toDate: () => new Date("2025-01-01") },
        updated_at: { toDate: () => new Date("2025-01-01") },
      };

      const mockAfterData = {
        ...mockBeforeData,
        name: {
          firstName: "Jane",
          firstLastName: "Smith",
        },
        updated_at: { toDate: () => new Date("2025-01-02") },
      };

      const mockDocRef = {
        get: jest
          .fn()
          .mockResolvedValueOnce({
            exists: true,
            id: "client123",
            data: () => mockBeforeData,
          })
          .mockResolvedValueOnce({
            exists: true,
            id: "client123",
            data: () => mockAfterData,
          }),
        update: mockUpdate,
      };

      mockDoc.mockReturnValue(mockDocRef);

      const result = await clientService.updateClient(
        "client123",
        updateData,
        mockActor
      );

      expect(result.id).toBe("client123");
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_UPDATED",
          resource_type: "client",
          resource_id: "client123",
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
        clientService.updateClient("nonexistent", {}, mockActor)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteClient", () => {
    it("should delete client and create audit log", async () => {
      const mockClientData = {
        name: {
          firstName: "John",
          firstLastName: "Doe",
        },
        email: "john@example.com",
        phones: [],
        addresses: [],
        extra_data: {},
        affinityGroupIds: [],
        account_balances: {},
        photoUrl: null,
        identity_document: null,
        created_at: { toDate: () => new Date("2025-01-01") },
        updated_at: { toDate: () => new Date("2025-01-01") },
      };

      const mockDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "client123",
          data: () => mockClientData,
        }),
        delete: mockDelete,
      };

      mockDoc.mockReturnValue(mockDocRef);

      await clientService.deleteClient("client123", mockActor);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CLIENT_DELETED",
          resource_type: "client",
          resource_id: "client123",
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
        clientService.deleteClient("nonexistent", mockActor)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("listClients", () => {
    it("should list clients with pagination", async () => {
      const mockDocs = [
        {
          id: "client1",
          data: () => ({
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            phones: [],
            addresses: [],
            extra_data: {},
            affinityGroupIds: [],
            account_balances: {},
            photoUrl: null,
            identity_document: null,
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        },
      ];

      mockOrderBy.mockReturnThis();
      mockLimit.mockReturnThis();
      mockGet.mockResolvedValue({
        docs: mockDocs,
        empty: false,
      });

      const result = await clientService.listClients(10);

      expect(result.clients).toHaveLength(1);
      expect(result.clients[0]!.id).toBe("client1");
    });
  });

  describe("searchClients", () => {
    it("should search clients by name", async () => {
      const mockDocs = [
        {
          id: "client1",
          data: () => ({
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            phones: [],
            addresses: [],
            extra_data: {},
            affinityGroupIds: [],
            account_balances: {},
            photoUrl: null,
            identity_document: null,
            created_at: { toDate: () => new Date("2025-01-01") },
            updated_at: { toDate: () => new Date("2025-01-01") },
          }),
        },
      ];

      mockWhere.mockReturnThis();
      mockOrderBy.mockReturnThis();
      mockLimit.mockReturnThis();
      mockGet.mockResolvedValue({
        docs: mockDocs,
        empty: false,
      });

      const result = await clientService.searchClients("John");

      expect(result).toHaveLength(1);
      expect(result[0]!.name.firstName).toBe("John");
    });
  });
});
