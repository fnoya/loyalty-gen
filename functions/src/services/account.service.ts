import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  LoyaltyAccount,
  CreateAccountRequest,
  CreditDebitRequest,
  BalanceResponse,
  AllBalancesResponse,
  loyaltyAccountSchema,
} from "../schemas/account.schema";
import { Transaction, transactionSchema } from "../schemas/transaction.schema";
import { NotFoundError, AppError } from "../core/errors";

/**
 * Service for managing loyalty accounts and transactions
 */
class AccountService {
  private _firestore: admin.firestore.Firestore | null = null;

  /**
   * Lazy-loaded Firestore instance
   */
  private get firestore(): admin.firestore.Firestore {
    if (!this._firestore) {
      this._firestore = admin.firestore();
    }
    return this._firestore;
  }

  /**
   * Create a new loyalty account for a client
   */
  async createAccount(
    clientId: string,
    request: CreateAccountRequest
  ): Promise<LoyaltyAccount> {
    // Verify client exists
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const accountRef = this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .doc();

    // Use transaction to create account and initialize denormalized balance
    await this.firestore.runTransaction(async (transaction) => {
      transaction.set(accountRef, {
        account_name: request.account_name,
        points: 0,
        familyCircleConfig: null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // Initialize denormalized balance in client document
      const clientRef = this.firestore.collection("clients").doc(clientId);
      transaction.update(clientRef, {
        [`account_balances.${accountRef.id}`]: 0,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    // Fetch the created document to get actual server timestamps
    const createdDoc = await accountRef.get();
    const data = createdDoc.data()!;

    return loyaltyAccountSchema.parse({
      id: createdDoc.id,
      account_name: data.account_name,
      points: data.points,
      familyCircleConfig: data.familyCircleConfig,
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
      updated_at: data.updated_at.toDate
        ? data.updated_at.toDate()
        : data.updated_at,
    });
  }

  /**
   * List all loyalty accounts for a client
   */
  async listAccounts(clientId: string): Promise<LoyaltyAccount[]> {
    // Verify client exists
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const snapshot = await this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .orderBy("created_at", "desc")
      .get();

    const accounts: LoyaltyAccount[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      accounts.push(
        loyaltyAccountSchema.parse({
          id: doc.id,
          account_name: data.account_name,
          points: data.points,
          familyCircleConfig: data.familyCircleConfig || null,
          created_at: data.created_at.toDate
            ? data.created_at.toDate()
            : data.created_at,
          updated_at: data.updated_at.toDate
            ? data.updated_at.toDate()
            : data.updated_at,
        })
      );
    });

    return accounts;
  }

  /**
   * Get a specific loyalty account
   */
  async getAccount(
    clientId: string,
    accountId: string
  ): Promise<LoyaltyAccount> {
    // Verify client exists
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const accountDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .doc(accountId)
      .get();

    if (!accountDoc.exists) {
      throw new NotFoundError("LoyaltyAccount", accountId);
    }

    const data = accountDoc.data()!;
    return loyaltyAccountSchema.parse({
      id: accountDoc.id,
      account_name: data.account_name,
      points: data.points,
      familyCircleConfig: data.familyCircleConfig || null,
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
      updated_at: data.updated_at.toDate
        ? data.updated_at.toDate()
        : data.updated_at,
    });
  }

  /**
   * Credit points to an account (atomic transaction)
   */
  async creditPoints(
    clientId: string,
    accountId: string,
    request: CreditDebitRequest
  ): Promise<LoyaltyAccount> {
    const accountRef = this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .doc(accountId);

    const transactionRef = accountRef.collection("pointTransactions").doc();
    const clientRef = this.firestore.collection("clients").doc(clientId);

    // Atomic transaction to credit points
    await this.firestore.runTransaction(async (transaction) => {
      // Read account
      const accountDoc = await transaction.get(accountRef);
      if (!accountDoc.exists) {
        throw new NotFoundError("LoyaltyAccount", accountId);
      }

      const accountData = accountDoc.data()!;
      const currentPoints = accountData.points || 0;
      const newPoints = currentPoints + request.amount;

      // Update account points (source of truth)
      transaction.update(accountRef, {
        points: newPoints,
        updated_at: FieldValue.serverTimestamp(),
      });

      // Update denormalized balance in client document
      transaction.update(clientRef, {
        [`account_balances.${accountId}`]: newPoints,
        updated_at: FieldValue.serverTimestamp(),
      });

      // Create transaction record
      transaction.set(transactionRef, {
        transaction_type: "credit",
        amount: request.amount,
        description: request.description || "",
        timestamp: FieldValue.serverTimestamp(),
      });
    });

    // Fetch updated account to get actual server timestamp
    const updatedDoc = await accountRef.get();
    const data = updatedDoc.data()!;

    return loyaltyAccountSchema.parse({
      id: updatedDoc.id,
      account_name: data.account_name,
      points: data.points,
      familyCircleConfig: data.familyCircleConfig,
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
      updated_at: data.updated_at.toDate
        ? data.updated_at.toDate()
        : data.updated_at,
    });
  }

  /**
   * Debit points from an account (atomic transaction)
   */
  async debitPoints(
    clientId: string,
    accountId: string,
    request: CreditDebitRequest
  ): Promise<LoyaltyAccount> {
    const accountRef = this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .doc(accountId);

    const transactionRef = accountRef.collection("pointTransactions").doc();
    const clientRef = this.firestore.collection("clients").doc(clientId);

    // Atomic transaction to debit points
    await this.firestore.runTransaction(async (transaction) => {
      // Read account
      const accountDoc = await transaction.get(accountRef);
      if (!accountDoc.exists) {
        throw new NotFoundError("LoyaltyAccount", accountId);
      }

      const accountData = accountDoc.data()!;
      const currentPoints = accountData.points || 0;
      const newPoints = currentPoints - request.amount;

      // Check for insufficient balance
      if (newPoints < 0) {
        throw new AppError(
          `Insufficient balance. Current: ${currentPoints}, Required: ${request.amount}`,
          400,
          "INSUFFICIENT_BALANCE"
        );
      }

      // Update account points (source of truth)
      transaction.update(accountRef, {
        points: newPoints,
        updated_at: FieldValue.serverTimestamp(),
      });

      // Update denormalized balance in client document
      transaction.update(clientRef, {
        [`account_balances.${accountId}`]: newPoints,
        updated_at: FieldValue.serverTimestamp(),
      });

      // Create transaction record
      transaction.set(transactionRef, {
        transaction_type: "debit",
        amount: request.amount,
        description: request.description || "",
        timestamp: FieldValue.serverTimestamp(),
      });
    });

    // Fetch updated account to get actual server timestamp
    const updatedDoc = await accountRef.get();
    const data = updatedDoc.data()!;

    return loyaltyAccountSchema.parse({
      id: updatedDoc.id,
      account_name: data.account_name,
      points: data.points,
      familyCircleConfig: data.familyCircleConfig,
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
      updated_at: data.updated_at.toDate
        ? data.updated_at.toDate()
        : data.updated_at,
    });
  }

  /**
   * Get all balances for a client (from denormalized field)
   */
  async getAllBalances(clientId: string): Promise<AllBalancesResponse> {
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const data = clientDoc.data()!;
    return (data.account_balances || {}) as AllBalancesResponse;
  }

  /**
   * Get balance for a specific account
   */
  async getAccountBalance(
    clientId: string,
    accountId: string
  ): Promise<BalanceResponse> {
    const account = await this.getAccount(clientId, accountId);
    return { points: account.points };
  }

  /**
   * List transactions for an account with pagination
   */
  async listTransactions(
    clientId: string,
    accountId: string,
    limit: number = 50,
    nextCursor?: string
  ): Promise<{ transactions: Transaction[]; nextCursor: string | null }> {
    // Verify account exists
    await this.getAccount(clientId, accountId);

    let query = this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .doc(accountId)
      .collection("pointTransactions")
      .orderBy("timestamp", "desc")
      .limit(limit + 1);

    if (nextCursor) {
      const cursorDoc = await this.firestore
        .collection("clients")
        .doc(clientId)
        .collection("loyaltyAccounts")
        .doc(accountId)
        .collection("pointTransactions")
        .doc(nextCursor)
        .get();

      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();

    const transactions: Transaction[] = [];
    let hasMore = false;

    snapshot.docs.forEach((doc, index) => {
      if (index < limit) {
        const data = doc.data();
        transactions.push(
          transactionSchema.parse({
            id: doc.id,
            transaction_type: data.transaction_type,
            amount: data.amount,
            description: data.description || "",
            originatedBy: data.originatedBy || null,
            timestamp: data.timestamp.toDate
              ? data.timestamp.toDate()
              : data.timestamp,
          })
        );
      } else {
        hasMore = true;
      }
    });

    const newCursor =
      hasMore && transactions.length > 0
        ? (transactions[transactions.length - 1]?.id ?? null)
        : null;

    return { transactions, nextCursor: newCursor };
  }
}

export const accountService = new AccountService();
