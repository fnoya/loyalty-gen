import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  createClientRequestSchema,
  updateClientRequestSchema,
} from "../schemas/client.schema";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../core/errors";

/**
 * Client Service - Business logic for client management
 */
export class ClientService {
  private get db(): ReturnType<typeof getFirestore> {
    return getFirestore();
  }

  private get clientsCollection(): ReturnType<
    ReturnType<typeof getFirestore>["collection"]
    > {
    return this.db.collection("clients");
  }

  /**
   * Create a new client with uniqueness validation
   */
  async createClient(data: CreateClientRequest): Promise<Client> {
    // Validate input with Zod
    const validatedData = createClientRequestSchema.parse(data);

    // Check uniqueness for email
    if (validatedData.email) {
      const existingEmail = await this.findClientByEmail(validatedData.email);
      if (existingEmail) {
        throw new ConflictError(
          `Client with email '${validatedData.email}' already exists`
        );
      }
    }

    // Check uniqueness for identity_document
    if (validatedData.identity_document) {
      const existingDoc = await this.findClientByIdentityDocument(
        validatedData.identity_document.type,
        validatedData.identity_document.number
      );
      if (existingDoc) {
        throw new ConflictError(
          `Client with identity document '${validatedData.identity_document.type}:${validatedData.identity_document.number}' already exists`
        );
      }
    }

    // Create new client document
    const clientRef = this.clientsCollection.doc();
    const now = FieldValue.serverTimestamp();

    const clientData = {
      ...validatedData,
      // Add normalized lowercase fields for case-insensitive search
      name_lower: {
        firstName: validatedData.name.firstName.toLowerCase(),
        secondName: validatedData.name.secondName?.toLowerCase() || null,
        firstLastName: validatedData.name.firstLastName.toLowerCase(),
        secondLastName: validatedData.name.secondLastName?.toLowerCase() || null,
      },
      email_lower: validatedData.email?.toLowerCase() || null,
      identity_document_lower: validatedData.identity_document
        ? {
          type: validatedData.identity_document.type.toLowerCase(),
          number: validatedData.identity_document.number.toLowerCase(),
        }
        : null,
      // Add phone numbers as array for easier searching
      phone_numbers: validatedData.phones?.map((p) => p.number) || [],
      // Initialize empty account balances and family circle
      account_balances: {},
      familyCircle: null,
      familyCircleMembers: null,
      affinityGroupIds: [],
      created_at: now,
      updated_at: now,
    };

    await clientRef.set(clientData);

    // Fetch the created document to return with server-generated timestamp
    const createdDoc = await clientRef.get();
    return this.documentToClient(createdDoc);
  }

  /**
   * Get a client by ID
   */
  async getClient(clientId: string): Promise<Client> {
    const docRef = this.clientsCollection.doc(clientId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    return this.documentToClient(doc);
  }

  /**
   * Update a client with uniqueness validation
   */
  async updateClient(
    clientId: string,
    data: UpdateClientRequest
  ): Promise<Client> {
    // Validate input with Zod
    const validatedData = updateClientRequestSchema.parse(data);

    // Check if client exists
    const docRef = this.clientsCollection.doc(clientId);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    // Prepare update data with normalized fields
    const updateData: Record<string, unknown> = {
      ...validatedData,
      updated_at: FieldValue.serverTimestamp(),
    };

    // Add normalized fields if name is updated
    if (validatedData.name) {
      updateData.name_lower = {
        firstName: validatedData.name.firstName.toLowerCase(),
        secondName: validatedData.name.secondName?.toLowerCase() || null,
        firstLastName: validatedData.name.firstLastName.toLowerCase(),
        secondLastName: validatedData.name.secondLastName?.toLowerCase() || null,
      };
    }

    // Update phone_numbers array if phones updated
    if (validatedData.phones) {
      updateData.phone_numbers = validatedData.phones.map((p) => p.number);
    }

    await docRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await docRef.get();
    return this.documentToClient(updatedDoc);
  }

  /**
   * Delete a client (soft delete by marking as deleted)
   */
  async deleteClient(clientId: string): Promise<void> {
    const docRef = this.clientsCollection.doc(clientId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    // For MVP, we do hard delete. In production, consider soft delete.
    await docRef.delete();
  }

  /**
   * List clients with pagination
   */
  async listClients(
    limit: number = 30,
    startAfterCursor?: string
  ): Promise<{ clients: Client[]; nextCursor: string | null }> {
    let query = this.clientsCollection.orderBy("created_at", "desc").limit(limit);

    if (startAfterCursor) {
      const cursorDoc = await this.clientsCollection.doc(startAfterCursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const clients = snapshot.docs.map((doc) => this.documentToClient(doc));

    const nextCursor =
      snapshot.docs && snapshot.docs.length === limit
        ? snapshot.docs[snapshot.docs.length - 1]!.id
        : null;

    return { clients, nextCursor };
  }

  /**
   * Search clients by query string
   * Supports: name search, identity document search, phone search
   */
  async searchClients(
    queryString: string,
    limit: number = 30
  ): Promise<Client[]> {
    if (!queryString || queryString.trim().length === 0) {
      throw new ValidationError("Search query cannot be empty");
    }

    const query = queryString.trim().toLowerCase();

    // Detect search type based on input
    const hasDigits = /\d/.test(query);
    const hasLetters = /[a-z]/.test(query);

    // Number search (identity document or phone)
    if (hasDigits && !hasLetters) {
      return this.searchByNumber(query, limit);
    }

    // Name search (single or multiple words)
    if (hasLetters) {
      return this.searchByName(query, limit);
    }

    // Mixed search - try both strategies and merge
    const [nameResults, numberResults] = await Promise.all([
      this.searchByName(query, limit),
      this.searchByNumber(query, limit),
    ]);

    return this.mergeAndDeduplicateResults(nameResults, numberResults, limit);
  }

  /**
   * Search by name (supports multi-word queries)
   */
  private async searchByName(
    query: string,
    limit: number
  ): Promise<Client[]> {
    const words = query.split(/\s+/).filter((w) => w.length > 0);

    if (words.length === 0) {
      return [];
    }

    // Single word - search all name fields
    if (words.length === 1) {
      const searchTerm = words[0]!;
      const results = await Promise.all([
        this.searchByField("name_lower.firstName", searchTerm, limit),
        this.searchByField("name_lower.secondName", searchTerm, limit),
        this.searchByField("name_lower.firstLastName", searchTerm, limit),
        this.searchByField("name_lower.secondLastName", searchTerm, limit),
      ]);

      return this.mergeAndDeduplicateResults(...results, limit);
    }

    // Multi-word - assume first word is firstName, last word is surname
    const firstName = words[0]!;
    const lastName = words[words.length - 1]!;

    const [firstNameResults, lastNameResults] = await Promise.all([
      this.searchByField("name_lower.firstName", firstName, limit),
      this.searchByField("name_lower.firstLastName", lastName, limit),
    ]);

    // Find intersection (clients matching both criteria)
    const firstNameIds = new Set(firstNameResults.map((c) => c.id));
    const intersection = lastNameResults.filter((c) => firstNameIds.has(c.id));

    // If we have intersection, return those; otherwise return union
    if (intersection.length > 0) {
      return intersection.slice(0, limit);
    }

    return this.mergeAndDeduplicateResults(
      firstNameResults,
      lastNameResults,
      limit
    );
  }

  /**
   * Search by number (identity document or phone)
   */
  private async searchByNumber(
    query: string,
    limit: number
  ): Promise<Client[]> {
    const [docResults, phoneResults] = await Promise.all([
      this.searchByField("identity_document_lower.number", query, limit),
      this.searchByArrayField("phone_numbers", query, limit),
    ]);

    return this.mergeAndDeduplicateResults(docResults, phoneResults, limit);
  }

  /**
   * Generic field search using startsWith (prefix match)
   */
  private async searchByField(
    fieldPath: string,
    searchTerm: string,
    limit: number
  ): Promise<Client[]> {
    const endTerm = searchTerm + "\uf8ff"; // Unicode character to create range

    const snapshot = await this.clientsCollection
      .where(fieldPath, ">=", searchTerm)
      .where(fieldPath, "<", endTerm)
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.documentToClient(doc));
  }

  /**
   * Search in array field (for phone numbers)
   */
  private async searchByArrayField(
    fieldPath: string,
    searchTerm: string,
    limit: number
  ): Promise<Client[]> {
    // For array fields, we need to fetch all and filter client-side
    // This is a Firestore limitation - no startsWith on array elements
    const snapshot = await this.clientsCollection.limit(limit * 10).get(); // Fetch more to filter

    const results = snapshot.docs
      .filter((doc) => {
        const phoneNumbers = (doc.data() as { phone_numbers?: string[] })
          .phone_numbers;
        return phoneNumbers?.some((phone) =>
          phone.toLowerCase().startsWith(searchTerm)
        );
      })
      .map((doc) => this.documentToClient(doc))
      .slice(0, limit);

    return results;
  }

  /**
   * Find client by email (for uniqueness check)
   */
  private async findClientByEmail(email: string): Promise<Client | null> {
    const emailLower = email.toLowerCase();
    const snapshot = await this.clientsCollection
      .where("email_lower", "==", emailLower)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.documentToClient(snapshot.docs[0]!);
  }

  /**
   * Find client by identity document (for uniqueness check)
   */
  private async findClientByIdentityDocument(
    type: string,
    number: string
  ): Promise<Client | null> {
    const numberLower = number.toLowerCase();
    const snapshot = await this.clientsCollection
      .where("identity_document_lower.number", "==", numberLower)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.documentToClient(snapshot.docs[0]!);
  }

  /**
   * Merge and deduplicate results from multiple queries
   */
  private mergeAndDeduplicateResults(
    ...resultArrays: Client[][]
  ): Client[];
  private mergeAndDeduplicateResults(
    ...args: [...Client[][], number]
  ): Client[];
  private mergeAndDeduplicateResults(
    ...args: (Client[] | number)[]
  ): Client[] {
    const limit =
      typeof args[args.length - 1] === "number"
        ? (args.pop() as number)
        : Infinity;
    const resultArrays = args as Client[][];

    const seen = new Set<string>();
    const merged: Client[] = [];

    for (const results of resultArrays) {
      for (const client of results) {
        if (!seen.has(client.id)) {
          seen.add(client.id);
          merged.push(client);

          if (merged.length >= limit) {
            return merged;
          }
        }
      }
    }

    return merged;
  }

  /**
   * Convert Firestore document to Client type
   */
  private documentToClient(
    doc: FirebaseFirestore.DocumentSnapshot
  ): Client {
    const data = doc.data();
    if (!data) {
      throw new Error("Document data is undefined");
    }

    return {
      id: doc.id,
      name: data.name,
      email: data.email || null,
      identity_document: data.identity_document || null,
      photoUrl: data.photoUrl || null,
      phones: data.phones || [],
      addresses: data.addresses || [],
      extra_data: data.extra_data || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
      affinityGroupIds: data.affinityGroupIds || [],
      familyCircle: data.familyCircle || null,
      familyCircleMembers: data.familyCircleMembers || null,
      account_balances: data.account_balances || {},
    };
  }
}

// Export factory function instead of singleton to avoid initialization before Firebase Admin
let _instance: ClientService | null = null;
export const clientService = {
  get instance(): ClientService {
    if (!_instance) {
      _instance = new ClientService();
    }
    return _instance;
  },
  // Proxy methods for convenience
  createClient: (...args: Parameters<ClientService["createClient"]>) =>
    clientService.instance.createClient(...args),
  getClient: (...args: Parameters<ClientService["getClient"]>) =>
    clientService.instance.getClient(...args),
  updateClient: (...args: Parameters<ClientService["updateClient"]>) =>
    clientService.instance.updateClient(...args),
  deleteClient: (...args: Parameters<ClientService["deleteClient"]>) =>
    clientService.instance.deleteClient(...args),
  listClients: (...args: Parameters<ClientService["listClients"]>) =>
    clientService.instance.listClients(...args),
  searchClients: (...args: Parameters<ClientService["searchClients"]>) =>
    clientService.instance.searchClients(...args),
};
