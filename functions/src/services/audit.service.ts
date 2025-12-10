import { Firestore, Transaction, FieldValue } from "firebase-admin/firestore";
import {
  auditLogSchema,
  auditLogQuerySchema,
  AuditLog,
  AuditLogQuery,
  AuditAction,
  AuditResourceType,
  AuditActor,
  AuditChanges,
  AuditMetadata,
} from "../schemas/audit.schema";

/**
 * Interface for creating an audit log entry
 */
export interface CreateAuditLogRequest {
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string;
  client_id?: string | null;
  account_id?: string | null;
  group_id?: string | null;
  transaction_id?: string | null;
  actor: AuditActor;
  changes?: AuditChanges | null;
  metadata?: AuditMetadata;
}

/**
 * Interface for paginated audit log response
 */
export interface PaginatedAuditLogs {
  data: AuditLog[];
  paging: {
    next_cursor: string | null;
  };
}

/**
 * AuditService handles all audit logging operations
 */
export class AuditService {
  private readonly firestore: Firestore;
  private readonly COLLECTION_NAME = "auditLogs";

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  /**
   * Creates an audit log entry
   * Can be used both standalone and within a transaction
   *
   * @param request - The audit log data
   * @param transaction - Optional Firestore transaction for atomic operations
   * @returns The created audit log (only when not in a transaction)
   */
  async createAuditLog(
    request: CreateAuditLogRequest,
    transaction?: Transaction
  ): Promise<AuditLog | void> {
    const docRef = this.firestore.collection(this.COLLECTION_NAME).doc();

    const auditData = {
      action: request.action,
      resource_type: request.resource_type,
      resource_id: request.resource_id,
      client_id: request.client_id ?? null,
      account_id: request.account_id ?? null,
      group_id: request.group_id ?? null,
      transaction_id: request.transaction_id ?? null,
      actor: request.actor,
      changes: request.changes ?? null,
      metadata: request.metadata ?? {
        ip_address: null,
        user_agent: null,
        description: null,
      },
      timestamp: FieldValue.serverTimestamp(),
    };

    // If in a transaction, use transaction.set and don't return anything
    if (transaction) {
      transaction.set(docRef, auditData);
      return;
    }

    // Otherwise, regular set and return the created log
    await docRef.set(auditData);

    // Fetch back to get the actual timestamp
    const doc = await docRef.get();
    const data = doc.data()!;

    return auditLogSchema.parse({
      id: doc.id,
      action: data.action,
      resource_type: data.resource_type,
      resource_id: data.resource_id,
      client_id: data.client_id,
      account_id: data.account_id,
      group_id: data.group_id,
      transaction_id: data.transaction_id,
      actor: data.actor,
      changes: data.changes,
      metadata: data.metadata,
      timestamp: data.timestamp.toDate
        ? data.timestamp.toDate()
        : data.timestamp,
    });
  }

  /**
   * Lists audit logs with optional filters and pagination
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of audit logs
   */
  async listAuditLogs(query: AuditLogQuery): Promise<PaginatedAuditLogs> {
    // Validate query parameters
    const validatedQuery = auditLogQuerySchema.parse(query);

    // Start building the query
    let firestoreQuery = this.firestore
      .collection(this.COLLECTION_NAME)
      .orderBy("timestamp", "desc");

    // Apply filters
    if (validatedQuery.action) {
      firestoreQuery = firestoreQuery.where(
        "action",
        "==",
        validatedQuery.action
      );
    }

    if (validatedQuery.resource_type) {
      firestoreQuery = firestoreQuery.where(
        "resource_type",
        "==",
        validatedQuery.resource_type
      );
    }

    if (validatedQuery.client_id) {
      firestoreQuery = firestoreQuery.where(
        "client_id",
        "==",
        validatedQuery.client_id
      );
    }

    if (validatedQuery.account_id) {
      firestoreQuery = firestoreQuery.where(
        "account_id",
        "==",
        validatedQuery.account_id
      );
    }

    // Apply date range filters
    if (validatedQuery.start_date) {
      const startDate = new Date(validatedQuery.start_date);
      firestoreQuery = firestoreQuery.where("timestamp", ">=", startDate);
    }

    if (validatedQuery.end_date) {
      const endDate = new Date(validatedQuery.end_date);
      firestoreQuery = firestoreQuery.where("timestamp", "<=", endDate);
    }

    // Apply cursor pagination
    if (validatedQuery.next_cursor) {
      const cursorDoc = await this.firestore
        .collection(this.COLLECTION_NAME)
        .doc(validatedQuery.next_cursor)
        .get();
      if (cursorDoc.exists) {
        firestoreQuery = firestoreQuery.startAfter(cursorDoc);
      }
    }

    // Apply limit
    const limit = validatedQuery.limit;
    firestoreQuery = firestoreQuery.limit(limit);

    // Execute query
    const snapshot = await firestoreQuery.get();

    // Parse results
    const data: AuditLog[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data();
      data.push(
        auditLogSchema.parse({
          id: doc.id,
          action: docData.action,
          resource_type: docData.resource_type,
          resource_id: docData.resource_id,
          client_id: docData.client_id,
          account_id: docData.account_id,
          group_id: docData.group_id,
          transaction_id: docData.transaction_id,
          actor: docData.actor,
          changes: docData.changes,
          metadata: docData.metadata,
          timestamp: docData.timestamp.toDate
            ? docData.timestamp.toDate()
            : docData.timestamp,
        })
      );
    });

    // Determine next cursor
    const nextCursor =
      data.length === limit && snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]!.id
        : null;

    return {
      data,
      paging: {
        next_cursor: nextCursor,
      },
    };
  }

  /**
   * Gets audit logs for a specific client
   *
   * @param clientId - The client ID
   * @param limit - Maximum number of logs to return
   * @param next_cursor - Cursor for pagination
   * @returns Paginated list of client audit logs
   */
  async getClientAuditLogs(
    clientId: string,
    limit: number = 30,
    next_cursor?: string
  ): Promise<PaginatedAuditLogs> {
    return this.listAuditLogs({
      client_id: clientId,
      limit,
      next_cursor,
    });
  }

  /**
   * Gets audit logs for a specific loyalty account
   *
   * @param accountId - The account ID
   * @param limit - Maximum number of logs to return
   * @param next_cursor - Cursor for pagination
   * @returns Paginated list of account audit logs
   */
  async getAccountAuditLogs(
    accountId: string,
    limit: number = 30,
    next_cursor?: string
  ): Promise<PaginatedAuditLogs> {
    return this.listAuditLogs({
      account_id: accountId,
      limit,
      next_cursor,
    });
  }

  /**
   * Gets audit logs for a specific affinity group
   *
   * @param groupId - The group ID
   * @param limit - Maximum number of logs to return
   * @param next_cursor - Cursor for pagination
   * @returns Paginated list of group audit logs
   */
  async getGroupAuditLogs(
    groupId: string,
    limit: number = 30,
    next_cursor?: string
  ): Promise<PaginatedAuditLogs> {
    return this.listAuditLogs({
      resource_type: "group",
      limit,
      next_cursor,
    });
  }
}
