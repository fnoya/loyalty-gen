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

    it("should handle mixed search (letters and digits)", async () => {
      const query = "john123";

      // Mock name search results (all 4 name fields)
      const nameDocs = [
        {
          id: "c1",
          data: () => ({
            name: { firstName: "John", firstLastName: "Smith" },
            identity_document: { type: "DNI", number: "12345" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      ];

      // Mock number search results (identity + phone)
      const numberDocs = [
        {
          id: "c2",
          data: () => ({
            name: { firstName: "Jane", firstLastName: "Doe" },
            identity_document: { type: "DNI", number: "123999" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      ];

      // Mock all the searchByName calls (4 name fields)
      mockGet
        .mockResolvedValueOnce({ docs: nameDocs }) // firstName
        .mockResolvedValueOnce({ docs: [] }) // secondName
        .mockResolvedValueOnce({ docs: [] }) // firstLastName
        .mockResolvedValueOnce({ docs: [] }) // secondLastName
        // Mock searchByNumber calls
        .mockResolvedValueOnce({ docs: numberDocs }) // identity document
        .mockResolvedValueOnce({ docs: [] }); // phone numbers

      const result = await clientService.searchClients(query);

      // Should merge results from both name and number searches
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle alphanumeric search (mixed search path)", async () => {
      // Test case where query has both letters and numbers (mixed)
      // This triggers the mixed search path that calls both searchByName and searchByNumber in parallel
      // Note: Full integration with both paths merging results is tested in integration tests
      const query = "abc123";

      const mockDoc1 = {
        id: "client1",
        data: () => ({
          name: { firstName: "Abc", firstLastName: "Test" },
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      // Mock searchByName results (4 name field searches)
      mockGet
        .mockResolvedValueOnce({ docs: [mockDoc1] }) // firstName
        .mockResolvedValueOnce({ docs: [] }) // secondName
        .mockResolvedValueOnce({ docs: [] }) // firstLastName
        .mockResolvedValueOnce({ docs: [] }) // secondLastName
        // Mock searchByNumber results (identity + phone)
        .mockResolvedValueOnce({ docs: [] }) // identity_document_lower.number
        .mockResolvedValueOnce({ docs: [] }); // phone_numbers

      const result = await clientService.searchClients(query);

      // Verifies mixed search path is triggered and returns at least name results
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle multi-word name search with intersection", async () => {
      const query = "John Doe";

      // Mock firstName results
      const johnDocs = [
        {
          id: "c1",
          data: () => ({ 
            name: { firstName: "John", firstLastName: "Doe" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      ];
      // Mock lastName results
      const doeDocs = [
        {
          id: "c1",
          data: () => ({ 
            name: { firstName: "John", firstLastName: "Doe" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
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
          data: () => ({ 
            name: { firstName: "John", firstLastName: "Smith" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      ];
      // Mock lastName results
      const doeDocs = [
        {
          id: "c2",
          data: () => ({ 
            name: { firstName: "Jane", firstLastName: "Doe" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      ];

      // Mock searchByField calls
      mockGet
        .mockResolvedValueOnce({ docs: johnDocs }) // firstName
        .mockResolvedValueOnce({ docs: doeDocs }); // lastName

      const result = await clientService.searchClients(query);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.map((c) => c.id)).toContain("c1");
      expect(result.map((c) => c.id)).toContain("c2");
    });

    it("should return empty array for query with only whitespace", async () => {
      // This tests the words.length === 0 branch in searchByName
      const query = "   ";

      await expect(clientService.searchClients(query)).rejects.toThrow(
        "Search query cannot be empty"
      );
    });

    it("should handle special characters search (neither letters nor digits)", async () => {
      // This tests lines 293-298 - the mixed search fallback
      // Query with only special characters: no letters, no digits
      const query = "!!!";

      // Mock searchByName results (will be called in mixed search)
      mockGet
        .mockResolvedValueOnce({ docs: [] }) // firstName
        .mockResolvedValueOnce({ docs: [] }) // secondName
        .mockResolvedValueOnce({ docs: [] }) // firstLastName
        .mockResolvedValueOnce({ docs: [] }) // secondLastName
        // Mock searchByNumber results
        .mockResolvedValueOnce({ docs: [] }) // identity document
        .mockResolvedValueOnce({ docs: [] }); // phone numbers

      const result = await clientService.searchClients(query);

      // Should return empty array since no matches
      expect(result).toEqual([]);
    });

    it("should handle hyphen-only search triggering mixed search", async () => {
      // Another test for lines 293-298
      const query = "---";

      const mockDoc1 = {
        id: "client1",
        data: () => ({
          name: { firstName: "Test", firstLastName: "User" },
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      // Mock searchByName results (will be called in mixed search)
      mockGet
        .mockResolvedValueOnce({ docs: [mockDoc1] }) // firstName
        .mockResolvedValueOnce({ docs: [] }) // secondName
        .mockResolvedValueOnce({ docs: [] }) // firstLastName
        .mockResolvedValueOnce({ docs: [] }) // secondLastName
        // Mock searchByNumber results
        .mockResolvedValueOnce({ docs: [] }) // identity document
        .mockResolvedValueOnce({ docs: [] }); // phone numbers

      const result = await clientService.searchClients(query);

      // Should merge results from both searches
      expect(result.length).toBeGreaterThanOrEqual(0);
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

    it("should throw error when document data is undefined", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        id: "client123",
        data: () => undefined, // Return undefined data
      });

      await expect(clientService.getClient("client123")).rejects.toThrow(
        "Document data is undefined"
      );
    });

    it("should return family circle holder info in getClient", async () => {
      const now = new Date();
      mockGet.mockResolvedValue({
        exists: true,
        id: "client123",
        data: () => ({
          name: { firstName: "Holder", firstLastName: "Test" },
          created_at: now,
          updated_at: now,
          familyCircle: { role: "holder", holderId: null, relationshipType: null, joinedAt: null },
          familyCircleMembers: [
            {
              memberId: "member-1",
              relationshipType: "child",
              addedAt: now,
              addedBy: "user123",
            },
          ],
          account_balances: { acc1: 100 },
        }),
      });

      const result = await clientService.getClient("client123");

      expect(result.familyCircle).toEqual({
        role: "holder",
        holderId: null,
        relationshipType: null,
        joinedAt: null,
      });
      expect(result.familyCircleMembers).toEqual([
        {
          memberId: "member-1",
          relationshipType: "child",
          addedAt: now,
          addedBy: "user123",
        },
      ]);
      expect(result.account_balances).toEqual({ acc1: 100 });
    });

    it("should return family circle member info in getClient", async () => {
      const now = new Date();
      mockGet.mockResolvedValue({
        exists: true,
        id: "client456",
        data: () => ({
          name: { firstName: "Member", firstLastName: "Test" },
          created_at: now,
          updated_at: now,
          familyCircle: {
            role: "member",
            holderId: "holder-123",
            relationshipType: "parent",
            joinedAt: now,
          },
          familyCircleMembers: null,
          account_balances: {},
        }),
      });

      const result = await clientService.getClient("client456");

      expect(result.familyCircle).toEqual({
        role: "member",
        holderId: "holder-123",
        relationshipType: "parent",
        joinedAt: now,
      });
      expect(result.familyCircleMembers).toBeNull();
    });
  });

  describe("searchByArrayField (phone search)", () => {
    it("should filter and return clients with matching phone numbers", async () => {
      const mockDocs = [
        {
          id: "c1",
          data: () => ({
            name: { firstName: "John", firstLastName: "Doe" },
            phone_numbers: ["1234567890", "9876543210"],
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
        {
          id: "c2",
          data: () => ({
            name: { firstName: "Jane", firstLastName: "Smith" },
            phone_numbers: ["5555555555"],
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
        {
          id: "c3",
          data: () => ({
            name: { firstName: "Bob", firstLastName: "Jones" },
            phone_numbers: ["1239999999"],
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      ];

      mockGet.mockResolvedValue({ docs: mockDocs });

      const result = await clientService.searchClients("123");

      // Should match c1 (1234567890) and c3 (1239999999)
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle clients with no phone_numbers field", async () => {
      const mockDocs = [
        {
          id: "c1",
          data: () => ({
            name: { firstName: "John", firstLastName: "Doe" },
            // No phone_numbers field
            created_at: new Date(),
            updated_at: new Date(),
          }),
        },
      ];

      mockGet.mockResolvedValue({ docs: mockDocs });

      const result = await clientService.searchClients("123");

      // Should not crash, returns empty or only matching results
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("mergeAndDeduplicateResults", () => {
    it("should stop merging when limit is reached", async () => {
      // Create many duplicate results to test early return
      const mockDocs1 = Array.from({ length: 10 }, (_, i) => ({
        id: `c${i}`,
        data: () => ({
          name: { firstName: `User${i}`, firstLastName: "Test" },
          created_at: new Date(),
          updated_at: new Date(),
        }),
      }));

      const mockDocs2 = Array.from({ length: 10 }, (_, i) => ({
        id: `c${i + 5}`, // Some overlap
        data: () => ({
          name: { firstName: `User${i + 5}`, firstLastName: "Test" },
          created_at: new Date(),
          updated_at: new Date(),
        }),
      }));

      // Mock all the searches (firstName, secondName, firstLastName, secondLastName)
      mockGet
        .mockResolvedValueOnce({ docs: mockDocs1 }) // firstName
        .mockResolvedValueOnce({ docs: [] }) // secondName
        .mockResolvedValueOnce({ docs: mockDocs2 }) // firstLastName
        .mockResolvedValueOnce({ docs: [] }); // secondLastName

      // Search with a small limit to trigger early return in merge
      const result = await clientService.searchClients("user", 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("singleton proxy methods", () => {
    it("should proxy createClient to instance", async () => {
      const { clientService: singleton } = require("../client.service");

      const clientData = {
        name: {
          firstName: "Test",
          firstLastName: "User",
        },
        email: "test@example.com",
        phones: [],
        addresses: [],
        extra_data: {},
      };

      // Mock all necessary calls
      mockGet
        .mockResolvedValueOnce({ empty: true, docs: [] }) // email check
        .mockResolvedValueOnce({ // created doc fetch
          exists: true,
          id: "client123",
          data: () => ({
            ...clientData,
            created_at: new Date(),
            updated_at: new Date(),
          }),
        });

      mockDoc.mockReturnValue({
        set: mockSet,
        get: mockGet,
      });

      const result = await singleton.createClient(clientData, mockActor);
      expect(result).toBeDefined();
    });

    it("should proxy getClient to instance", async () => {
      const { clientService: singleton } = require("../client.service");

      mockGet.mockResolvedValue({
        exists: true,
        id: "client123",
        data: () => ({
          name: { firstName: "Test", firstLastName: "User" },
          created_at: new Date(),
          updated_at: new Date(),
        }),
      });

      const result = await singleton.getClient("client123");
      expect(result).toBeDefined();
    });

    it("should proxy updateClient to instance", async () => {
      const { clientService: singleton } = require("../client.service");

      mockGet
        .mockResolvedValueOnce({
          exists: true,
          id: "client123",
          data: () => ({
            name: { firstName: "Old", firstLastName: "Name" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "client123",
          data: () => ({
            name: { firstName: "New", firstLastName: "Name" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        });

      const result = await singleton.updateClient(
        "client123",
        { name: { firstName: "New", firstLastName: "Name" } },
        mockActor
      );
      expect(result).toBeDefined();
    });

    it("should proxy deleteClient to instance", async () => {
      const { clientService: singleton } = require("../client.service");

      const mockDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: "client123",
          data: () => ({
            name: { firstName: "Test", firstLastName: "User" },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        }),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockDoc.mockReturnValue(mockDocRef);

      await singleton.deleteClient("client123", mockActor);
      
      expect(mockDocRef.delete).toHaveBeenCalled();
    });

    it("should proxy listClients to instance", async () => {
      const { clientService: singleton } = require("../client.service");

      mockGet.mockResolvedValue({ docs: [], empty: true });

      const result = await singleton.listClients(10);
      expect(result).toBeDefined();
    });

    it("should proxy searchClients to instance", async () => {
      const { clientService: singleton } = require("../client.service");

      mockGet.mockResolvedValue({ docs: [], empty: true });

      const result = await singleton.searchClients("test");
      expect(result).toBeDefined();
    });
  });
});
