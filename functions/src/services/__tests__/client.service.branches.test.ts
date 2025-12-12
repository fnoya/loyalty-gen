import { ClientService } from "../client.service";
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

describe("ClientService Branch Coverage", () => {
  let clientService: ClientService;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockDoc: jest.Mock;
  let mockCollection: jest.Mock;
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockWhere: jest.Mock;
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
    mockSet = jest.fn().mockResolvedValue(undefined);
    mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockWhere = jest.fn().mockReturnThis();
    mockOrderBy = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();
    mockStartAfter = jest.fn().mockReturnThis();
    mockDoc = jest.fn();
    mockCollection = jest.fn();

    // Setup chainable mocks
    const mockQuery = {
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      startAfter: mockStartAfter,
      get: mockGet,
      doc: mockDoc,
      collection: mockCollection,
      set: mockSet,
      update: mockUpdate,
    };

    mockWhere.mockReturnValue(mockQuery);
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

    clientService = new ClientService(mockFirestoreInstance as any);
  });

  describe("createClient branches", () => {
    it("should handle full data with all optional fields", async () => {
      const clientData = {
        name: {
          firstName: "John",
          secondName: "Paul",
          firstLastName: "Doe",
          secondLastName: "Smith",
        },
        email: "john@example.com",
        identity_document: {
          type: "cedula_identidad" as const,
          number: "12345678",
        },
        phones: [
          { type: "mobile" as const, number: "1234567890", isPrimary: true },
        ],
        addresses: [],
        extra_data: {},
      };

      // Mock email check (empty)
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });
      // Mock identity check (empty)
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      // Mock doc creation
      mockDoc.mockReturnValue({
        set: mockSet,
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "client123",
          data: () => ({
            ...clientData,
            created_at: new Date(),
            updated_at: new Date(),
            // Mock normalized fields to verify they were set correctly in set()
            name_lower: {
              firstName: "john",
              secondName: "paul",
              firstLastName: "doe",
              secondLastName: "smith",
            },
            email_lower: "john@example.com",
            identity_document_lower: {
              type: "cedula_identidad",
              number: "12345678",
            },
            phone_numbers: ["1234567890"],
          }),
        }),
      });

      await clientService.createClient(clientData, mockActor);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name_lower: expect.objectContaining({
            secondName: "paul",
            secondLastName: "smith",
          }),
          email_lower: "john@example.com",
          identity_document_lower: expect.anything(),
          phone_numbers: ["1234567890"],
        })
      );
    });

    it("should handle minimal data with missing optional fields", async () => {
      const clientData = {
        name: {
          firstName: "John",
          firstLastName: "Doe",
        },
        email: "john@example.com",
        // Missing identity_document, phones
        phones: [],
        addresses: [],
        extra_data: {},
      };

      // Mock email check (empty)
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      // Mock doc creation (no uniqueness checks needed if fields missing)
      mockDoc.mockReturnValue({
        set: mockSet,
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "client123",
          data: () => ({
            ...clientData,
            created_at: new Date(),
            updated_at: new Date(),
          }),
        }),
      });

      await clientService.createClient(clientData, mockActor);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name_lower: expect.objectContaining({
            secondName: null,
            secondLastName: null,
          }),
          email_lower: "john@example.com",
          identity_document_lower: null,
          phone_numbers: [],
        })
      );
    });
  });

  describe("updateClient branches", () => {
    it("should handle partial updates (only name)", async () => {
      const updateData = {
        name: {
          firstName: "Jane",
          firstLastName: "Smith",
        },
      };

      // Mock existing client
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: "client123",
        data: () => ({
          name: { firstName: "John", firstLastName: "Doe" },
          created_at: new Date(),
        }),
      });

      // Mock updated client fetch
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: "client123",
        data: () => ({
          name: { firstName: "Jane", firstLastName: "Smith" },
          created_at: new Date(),
        }),
      });

      await clientService.updateClient("client123", updateData, mockActor);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name_lower: expect.anything(),
        })
      );
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          phone_numbers: expect.anything(),
        })
      );
    });

    it("should handle partial updates (only phones)", async () => {
      const updateData = {
        phones: [
          { type: "mobile" as const, number: "9876543210", isPrimary: true },
        ],
      };

      // Mock existing client
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: "client123",
        data: () => ({
          name: { firstName: "John", firstLastName: "Doe" },
          created_at: new Date(),
        }),
      });

      // Mock updated client fetch
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: "client123",
        data: () => ({
          name: { firstName: "John", firstLastName: "Doe" },
          phones: [{ type: "mobile", number: "9876543210" }],
          created_at: new Date(),
        }),
      });

      await clientService.updateClient("client123", updateData, mockActor);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_numbers: ["9876543210"],
        })
      );
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          name_lower: expect.anything(),
        })
      );
    });
  });

  describe("searchClients branches", () => {
    it("should handle number search (digits only)", async () => {
      const query = "123";

      // Mock searchByNumber results
      // searchByField calls where twice
      // searchByArrayField calls limit().get()

      mockGet.mockResolvedValue({ docs: [], empty: true });

      await clientService.searchClients(query);

      // Check if number search was triggered
      expect(mockWhere).toHaveBeenCalledWith(
        "identity_document_lower.number",
        ">=",
        "123"
      );
    });

    it("should handle name search (letters only)", async () => {
      const query = "John";

      mockGet.mockResolvedValue({ docs: [], empty: true });

      await clientService.searchClients(query);

      // Check if name search was triggered (firstName)
      expect(mockWhere).toHaveBeenCalledWith(
        "name_lower.firstName",
        ">=",
        "john"
      );
    });

    it("should handle multi-word name search with intersection", async () => {
      const query = "John Doe";

      // Mock firstName results
      const johnDocs = [
        {
          id: "c1",
          data: () => ({ name: { firstName: "John", firstLastName: "Doe" } }),
        },
      ];
      // Mock lastName results
      const doeDocs = [
        {
          id: "c1",
          data: () => ({ name: { firstName: "John", firstLastName: "Doe" } }),
        },
      ];

      // Mock searchByField calls
      mockGet
        .mockResolvedValueOnce({ docs: johnDocs }) // firstName
        .mockResolvedValueOnce({ docs: doeDocs }); // lastName

      const result = await clientService.searchClients(query);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("c1");
    });

    it("should handle multi-word name search without intersection", async () => {
      const query = "John Doe";

      // Mock firstName results
      const johnDocs = [
        {
          id: "c1",
          data: () => ({ name: { firstName: "John", firstLastName: "Smith" } }),
        },
      ];
      // Mock lastName results
      const doeDocs = [
        {
          id: "c2",
          data: () => ({ name: { firstName: "Jane", firstLastName: "Doe" } }),
        },
      ];

      // Mock searchByField calls
      mockGet
        .mockResolvedValueOnce({ docs: johnDocs }) // firstName
        .mockResolvedValueOnce({ docs: doeDocs }); // lastName

      const result = await clientService.searchClients(query);

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toContain("c1");
      expect(result.map((c) => c.id)).toContain("c2");
    });
  });

  describe("documentToClient branches", () => {
    it("should handle missing optional fields in documentToClient", async () => {
      // We can test this via getClient
      mockGet.mockResolvedValue({
        exists: true,
        id: "client123",
        data: () => ({
          name: { firstName: "John", firstLastName: "Doe" },
          created_at: new Date(),
          updated_at: new Date(),
          // All optional fields missing
        }),
      });

      const result = await clientService.getClient("client123");

      expect(result.email).toBeNull();
      expect(result.identity_document).toBeNull();
      expect(result.photoUrl).toBeNull();
      expect(result.phones).toEqual([]);
      expect(result.addresses).toEqual([]);
      expect(result.extra_data).toEqual({});
      expect(result.affinityGroupIds).toEqual([]);
      expect(result.familyCircle).toBeNull();
      expect(result.familyCircleMembers).toBeNull();
      expect(result.account_balances).toEqual({});
    });
  });
});
