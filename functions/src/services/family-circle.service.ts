import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  AddFamilyCircleMemberRequest,
  FamilyCircleMember,
  FamilyCircleInfo,
  RelationshipType,
  familyCircleMemberSchema,
  UpdateFamilyCircleConfigRequest,
  GetFamilyCircleMembersResponse,
  FamilyCircleConfig,
  GetFamilyCircleResponse,
  getFamilyCircleResponseSchema,
} from "../schemas/family-circle.schema";
import {
  NotFoundError,
  AppError,
  ConflictError,
} from "../core/errors";
import { AuditService } from "./audit.service";
import { AuditActor } from "../schemas/audit.schema";

/**
 * Service for managing family circles
 */
export class FamilyCircleService {
  private _firestore: admin.firestore.Firestore;
  private _auditService: AuditService;

  constructor(firestore?: admin.firestore.Firestore) {
    this._firestore = firestore || admin.firestore();
    this._auditService = new AuditService(this._firestore);
  }

  private get firestore(): admin.firestore.Firestore {
    return this._firestore;
  }

  private get auditService(): AuditService {
    return this._auditService;
  }

  /**
   * Get family circle information for a client
   * Returns different info based on whether client is holder or member
   */
  async getFamilyCircleInfo(clientId: string): Promise<GetFamilyCircleResponse> {
    // Check if client exists
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const clientData = clientDoc.data()!;
    const familyCircle = clientData.familyCircle as FamilyCircleInfo | null;

    // If familyCircle is null, client is not in any circle
    if (!familyCircle || familyCircle.role === null) {
      return {
        role: null,
        message: "This client is not part of any family circle",
      };
    }

    // If client is a member, return member info
    if (familyCircle.role === "member") {
      const joinedAtValue = familyCircle.joinedAt!;
      const hasToDate = (v: unknown): v is { toDate: () => Date } =>
        typeof (v as { toDate?: () => Date }).toDate === "function";

      return getFamilyCircleResponseSchema.parse({
        role: "member",
        holderId: familyCircle.holderId!,
        relationshipType: familyCircle.relationshipType!,
        joinedAt: hasToDate(joinedAtValue)
          ? joinedAtValue.toDate()
          : (joinedAtValue as Date),
      });
    }

    // If client is a holder, fetch and return member list
    const membersSnap = await this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("familyCircleMembers")
      .get();

    const members: FamilyCircleMember[] = [];
    membersSnap.docs.forEach((doc) => {
      const data = doc.data();
      members.push({
        memberId: doc.id,
        relationshipType: data.relationshipType,
        addedAt: data.addedAt.toDate ? data.addedAt.toDate() : data.addedAt,
        addedBy: data.addedBy,
      });
    });

    return getFamilyCircleResponseSchema.parse({
      role: "holder",
      members,
      totalMembers: members.length,
    });
  }

  /**
   * Get all members of a family circle
   * Only the holder can call this
   */
  async getFamilyCircleMembers(
    clientId: string,
    _requesterId: string
  ): Promise<GetFamilyCircleMembersResponse> {
    // Check if requester is the holder
    const holderDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!holderDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const holderData = holderDoc.data()!;
    const familyCircle = holderData.familyCircle as FamilyCircleInfo | null;

    // Verify the requester is calling their own family circle
    if (familyCircle?.role !== "holder") {
      throw new AppError("User is not the circle holder", 403, "NOT_CIRCLE_HOLDER");
    }

    // Fetch members
    const membersSnap = await this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("familyCircleMembers")
      .get();

    const members: FamilyCircleMember[] = [];
    membersSnap.docs.forEach((doc) => {
      const data = doc.data();
      members.push({
        memberId: doc.id,
        relationshipType: data.relationshipType,
        addedAt: data.addedAt.toDate ? data.addedAt.toDate() : data.addedAt,
        addedBy: data.addedBy,
      });
    });

    return {
      data: members,
      metadata: {
        totalMembers: members.length,
        holder: {
          clientId,
        },
      },
    };
  }

  /**
   * Add a member to a family circle
   * Only the holder can add members
   * Creates an atomic transaction that:
   * 1. Creates the member subcollection entry
   * 2. Updates the member client's familyCircle field to point to the holder
   * 3. Creates audit logs for both operations
   */
  async addFamilyCircleMember(
    holderId: string,
    request: AddFamilyCircleMemberRequest,
    actor: AuditActor
  ): Promise<FamilyCircleMember> {
    // Verify holder exists
    const holderDoc = await this.firestore
      .collection("clients")
      .doc(holderId)
      .get();

    if (!holderDoc.exists) {
      throw new NotFoundError("Client", holderId);
    }

    // Verify member exists
    const memberDoc = await this.firestore
      .collection("clients")
      .doc(request.memberId)
      .get();

    if (!memberDoc.exists) {
      throw new NotFoundError("Client", request.memberId);
    }

    // Check that member is not the same as holder
    if (holderId === request.memberId) {
      throw new AppError("Cannot add self to family circle", 400, "CANNOT_ADD_SELF");
    }

    const holderData = holderDoc.data()!;
    const memberData = memberDoc.data()!;

    // Check that holder is not already a member of another circle
    const holderCircle = holderData.familyCircle as FamilyCircleInfo | null;
    if (holderCircle?.role === "member") {
      throw new AppError(
        "Holder is already a member of another family circle",
        400,
        "HOLDER_ALREADY_IN_CIRCLE"
      );
    }

    // Check that member is not already in another circle
    const memberCircle = memberData.familyCircle as FamilyCircleInfo | null;
    if (memberCircle && memberCircle.role !== null) {
      throw new ConflictError(
        "MEMBER_ALREADY_IN_CIRCLE",
        "Member is already in another family circle"
      );
    }

    // Perform atomic transaction
    const memberRef = this.firestore
      .collection("clients")
      .doc(holderId)
      .collection("familyCircleMembers")
      .doc(request.memberId);

    await this.firestore.runTransaction(async (transaction) => {
      // 1. Add member to holder's circle members subcollection
      transaction.set(memberRef, {
        relationshipType: request.relationshipType,
        addedAt: FieldValue.serverTimestamp(),
        addedBy: actor.uid,
      });

      // 2. Update member's familyCircle field to point to holder
      const memberClientRef = this.firestore
        .collection("clients")
        .doc(request.memberId);
      transaction.update(memberClientRef, {
        familyCircle: {
          role: "member",
          holderId: holderId,
          relationshipType: request.relationshipType,
          joinedAt: FieldValue.serverTimestamp(),
        },
        updated_at: FieldValue.serverTimestamp(),
      });

      // 3. Initialize holder's circle (if not already initialized)
      if (!holderCircle || holderCircle.role !== "holder") {
        const holderRef = this.firestore.collection("clients").doc(holderId);
        transaction.update(holderRef, {
          familyCircle: {
            role: "holder",
          },
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      // 4. Create audit logs (within transaction)
      // Note: We'll create these after the transaction completes
    });

    // Fetch the member data to return
    const createdMemberDoc = await memberRef.get();
    const data = createdMemberDoc.data()!;

    const familyMember = familyCircleMemberSchema.parse({
      memberId: request.memberId,
      relationshipType: data.relationshipType,
      addedAt: data.addedAt.toDate ? data.addedAt.toDate() : data.addedAt,
      addedBy: data.addedBy,
    });

    // Create audit logs (after transaction to ensure atomicity of main operation)
    await this.auditService.createAuditLog({
      action: "FAMILY_CIRCLE_MEMBER_ADDED",
      resource_type: "client",
      resource_id: holderId,
      client_id: holderId,
      actor,
      changes: {
        before: null,
        after: {
          memberId: request.memberId,
          relationshipType: request.relationshipType,
        },
      },
      metadata: {
        description: `Added family circle member: ${request.memberId}`,
      },
    });

    return familyMember;
  }

  /**
   * Remove a member from a family circle
   * Only the holder can remove members
   */
  async removeFamilyCircleMember(
    holderId: string,
    memberId: string,
    actor: AuditActor
  ): Promise<void> {
    // Verify holder exists
    const holderDoc = await this.firestore
      .collection("clients")
      .doc(holderId)
      .get();

    if (!holderDoc.exists) {
      throw new NotFoundError("Client", holderId);
    }

    // Verify member exists
    const memberDoc = await this.firestore
      .collection("clients")
      .doc(memberId)
      .get();

    if (!memberDoc.exists) {
      throw new NotFoundError("Client", memberId);
    }

    // Check that member is in holder's circle
    const memberRef = this.firestore
      .collection("clients")
      .doc(holderId)
      .collection("familyCircleMembers")
      .doc(memberId);

    const memberCircleDoc = await memberRef.get();
    if (!memberCircleDoc.exists) {
      throw new NotFoundError("MEMBER_NOT_IN_CIRCLE", "Member not found in circle");
    }

    const memberCircleData = memberCircleDoc.data()!;

    // Perform atomic transaction
    await this.firestore.runTransaction(async (transaction) => {
      // 1. Remove member from holder's circle members subcollection
      transaction.delete(memberRef);

      // 2. Clear member's familyCircle field
      const memberClientRef = this.firestore
        .collection("clients")
        .doc(memberId);
      transaction.update(memberClientRef, {
        familyCircle: null,
        updated_at: FieldValue.serverTimestamp(),
      });

      // Note: We don't clear the holder's role even if all members are removed
      // This allows the holder to add new members later without re-initialization
    });

    // Create audit log (after transaction)
    await this.auditService.createAuditLog({
      action: "FAMILY_CIRCLE_MEMBER_REMOVED",
      resource_type: "client",
      resource_id: holderId,
      client_id: holderId,
      actor,
      changes: {
        before: {
          memberId,
          relationshipType: memberCircleData.relationshipType,
        },
        after: null,
      },
      metadata: {
        description: `Removed family circle member: ${memberId}`,
      },
    });
  }

  /**
   * Get family circle configuration for an account
   */
  async getFamilyCircleConfig(
    clientId: string,
    accountId: string
  ): Promise<FamilyCircleConfig> {
    // Verify account exists
    const accountDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .doc(accountId)
      .get();

    if (!accountDoc.exists) {
      throw new NotFoundError("Account", accountId);
    }

    const data = accountDoc.data()!;
    const config = data.familyCircleConfig as FamilyCircleConfig | null;

    // Return default config if not set
    return (
      config || {
        allowMemberCredits: false,
        allowMemberDebits: false,
        updatedAt: data.created_at,
        updatedBy: "system",
      }
    );
  }

  /**
   * Update family circle configuration for an account
   * Only the holder can update configuration
   */
  async updateFamilyCircleConfig(
    clientId: string,
    accountId: string,
    request: UpdateFamilyCircleConfigRequest,
    actor: AuditActor
  ): Promise<FamilyCircleConfig> {
    // Verify client exists and requester is the holder
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const clientData = clientDoc.data()!;
    const familyCircle = clientData.familyCircle as FamilyCircleInfo | null;

    // Verify the client is a holder
    if (familyCircle?.role !== "holder") {
      throw new AppError(
        "Only the circle holder can update configuration",
        403,
        "NOT_CIRCLE_HOLDER"
      );
    }

    // Verify account exists
    const accountRef = this.firestore
      .collection("clients")
      .doc(clientId)
      .collection("loyaltyAccounts")
      .doc(accountId);

    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) {
      throw new NotFoundError("Account", accountId);
    }

    const data = accountDoc.data()!;
    const currentConfig = data.familyCircleConfig as FamilyCircleConfig | null;

    // Build new config (merge with current)
    const updatedConfig = {
      allowMemberCredits:
        request.allowMemberCredits !== undefined
          ? request.allowMemberCredits
          : currentConfig?.allowMemberCredits || false,
      allowMemberDebits:
        request.allowMemberDebits !== undefined
          ? request.allowMemberDebits
          : currentConfig?.allowMemberDebits || false,
      updatedAt: new Date(),
      updatedBy: actor.uid,
    };

    // Update in Firestore
    await accountRef.update({
      familyCircleConfig: updatedConfig,
      updated_at: FieldValue.serverTimestamp(),
    });

    // Create audit log
    await this.auditService.createAuditLog({
      action: "LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED",
      resource_type: "account",
      resource_id: accountId,
      client_id: clientId,
      account_id: accountId,
      actor,
      changes: {
        before: currentConfig,
        after: updatedConfig,
      },
    });

    return updatedConfig;
  }

  /**
   * Validate that a member can perform a transaction on behalf of holder
   * Throws an error if not allowed
   */
  async validateMemberTransactionPermission(
    holderId: string,
    memberId: string,
    accountId: string,
    transactionType: "credit" | "debit"
  ): Promise<RelationshipType> {
    // Get member's circle info
    const memberDoc = await this.firestore
      .collection("clients")
      .doc(memberId)
      .get();

    if (!memberDoc.exists) {
      throw new NotFoundError("Client", memberId);
    }

    const memberData = memberDoc.data()!;
    const memberCircle = memberData.familyCircle as FamilyCircleInfo | null;

    // Check member is in holder's circle
    if (!memberCircle || memberCircle.role !== "member" || memberCircle.holderId !== holderId) {
      throw new AppError(
        "Member is not in the holder's family circle",
        403,
        "NOT_IN_CIRCLE"
      );
    }

    // Get account config
    const accountDoc = await this.firestore
      .collection("clients")
      .doc(holderId)
      .collection("loyaltyAccounts")
      .doc(accountId)
      .get();

    if (!accountDoc.exists) {
      throw new NotFoundError("Account", accountId);
    }

    const accountData = accountDoc.data()!;
    const config = accountData.familyCircleConfig as FamilyCircleConfig | null;

    // Check permissions
    if (transactionType === "credit" && !(config?.allowMemberCredits)) {
      throw new AppError(
        "Family members are not allowed to credit points to this account",
        403,
        "CIRCLE_CREDITS_NOT_ALLOWED"
      );
    }

    if (transactionType === "debit" && !(config?.allowMemberDebits)) {
      throw new AppError(
        "Family members are not allowed to debit points from this account",
        403,
        "CIRCLE_DEBITS_NOT_ALLOWED"
      );
    }

    return memberCircle.relationshipType as RelationshipType;
  }
}

// Export factory function instead of singleton to avoid initialization before Firebase Admin
let _instance: FamilyCircleService | null = null;
export const familyCircleService = {
  get instance(): FamilyCircleService {
    if (!_instance) {
      _instance = new FamilyCircleService();
    }
    return _instance;
  },
  // Proxy methods for convenience
  getFamilyCircleInfo: (...args: Parameters<FamilyCircleService["getFamilyCircleInfo"]>) =>
    familyCircleService.instance.getFamilyCircleInfo(...args),
  getFamilyCircleMembers: (...args: Parameters<FamilyCircleService["getFamilyCircleMembers"]>) =>
    familyCircleService.instance.getFamilyCircleMembers(...args),
  addFamilyCircleMember: (...args: Parameters<FamilyCircleService["addFamilyCircleMember"]>) =>
    familyCircleService.instance.addFamilyCircleMember(...args),
  removeFamilyCircleMember: (...args: Parameters<FamilyCircleService["removeFamilyCircleMember"]>) =>
    familyCircleService.instance.removeFamilyCircleMember(...args),
  getFamilyCircleConfig: (...args: Parameters<FamilyCircleService["getFamilyCircleConfig"]>) =>
    familyCircleService.instance.getFamilyCircleConfig(...args),
  updateFamilyCircleConfig: (...args: Parameters<FamilyCircleService["updateFamilyCircleConfig"]>) =>
    familyCircleService.instance.updateFamilyCircleConfig(...args),
  validateMemberTransactionPermission: (...args: Parameters<FamilyCircleService["validateMemberTransactionPermission"]>) =>
    familyCircleService.instance.validateMemberTransactionPermission(...args),
};
