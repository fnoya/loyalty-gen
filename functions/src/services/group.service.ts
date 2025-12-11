import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  Group,
  CreateGroupRequest,
  groupSchema,
} from "../schemas/group.schema";
import { NotFoundError, ValidationError } from "../core/errors";
import { AuditService } from "./audit.service";
import { AuditActor } from "../schemas/audit.schema";

/**
 * Service for managing affinity groups
 */
export class GroupService {
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
   * Create a new affinity group
   */
  async createGroup(
    request: CreateGroupRequest,
    actor: AuditActor
  ): Promise<Group> {
    const groupRef = this.firestore.collection("affinityGroups").doc();

    // Write to Firestore with server timestamps
    await groupRef.set({
      name: request.name,
      description: request.description || "",
      created_at: FieldValue.serverTimestamp(),
    });

    // Fetch the created document to get actual server timestamp
    const createdDoc = await groupRef.get();
    const data = createdDoc.data()!;

    const group = groupSchema.parse({
      id: createdDoc.id,
      name: data.name,
      description: data.description,
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
    });

    // Create audit log
    await this.auditService.createAuditLog({
      action: "GROUP_CREATED",
      resource_type: "group",
      resource_id: group.id,
      group_id: group.id,
      actor,
      changes: {
        before: null,
        after: group,
      },
    });

    return group;
  }

  /**
   * List all affinity groups
   */
  async listGroups(): Promise<Group[]> {
    const snapshot = await this.firestore
      .collection("affinityGroups")
      .orderBy("created_at", "desc")
      .get();

    const groups: Group[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      groups.push(
        groupSchema.parse({
          id: doc.id,
          name: data.name,
          description: data.description || "",
          created_at: data.created_at.toDate
            ? data.created_at.toDate()
            : data.created_at,
        })
      );
    });

    return groups;
  }

  /**
   * Get a specific group by ID
   */
  async getGroup(groupId: string): Promise<Group> {
    const doc = await this.firestore
      .collection("affinityGroups")
      .doc(groupId)
      .get();

    if (!doc.exists) {
      throw new NotFoundError("Group", groupId);
    }

    const data = doc.data()!;
    return groupSchema.parse({
      id: doc.id,
      name: data.name,
      description: data.description || "",
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
    });
  }

  /**
   * Assign a client to an affinity group
   */
  async assignClientToGroup(
    groupId: string,
    clientId: string,
    actor: AuditActor
  ): Promise<void> {
    // Verify group exists
    const groupDoc = await this.firestore
      .collection("affinityGroups")
      .doc(groupId)
      .get();

    if (!groupDoc.exists) {
      throw new NotFoundError("Group", groupId);
    }

    // Verify client exists
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const clientData = clientDoc.data()!;
    const currentGroups: string[] = clientData.affinityGroupIds || [];

    // Check if client is already in this group
    if (currentGroups.includes(groupId)) {
      throw new ValidationError(
        `Client '${clientId}' is already assigned to group '${groupId}'`
      );
    }

    // Add group to client's affinityGroupIds array
    await this.firestore
      .collection("clients")
      .doc(clientId)
      .update({
        affinityGroupIds: FieldValue.arrayUnion(groupId),
        updated_at: FieldValue.serverTimestamp(),
      });

    // Create audit log
    await this.auditService.createAuditLog({
      action: "CLIENT_ADDED_TO_GROUP",
      resource_type: "group",
      resource_id: groupId,
      client_id: clientId,
      group_id: groupId,
      actor,
      changes: {
        before: { affinityGroupIds: currentGroups },
        after: { affinityGroupIds: [...currentGroups, groupId] },
      },
    });
  }

  /**
   * Remove a client from an affinity group
   */
  async removeClientFromGroup(
    groupId: string,
    clientId: string,
    actor: AuditActor
  ): Promise<void> {
    // Verify group exists
    const groupDoc = await this.firestore
      .collection("affinityGroups")
      .doc(groupId)
      .get();

    if (!groupDoc.exists) {
      throw new NotFoundError("Group", groupId);
    }

    // Verify client exists
    const clientDoc = await this.firestore
      .collection("clients")
      .doc(clientId)
      .get();

    if (!clientDoc.exists) {
      throw new NotFoundError("Client", clientId);
    }

    const clientData = clientDoc.data()!;
    const currentGroups: string[] = clientData.affinityGroupIds || [];

    // Check if client is in this group
    if (!currentGroups.includes(groupId)) {
      throw new ValidationError(
        `Client '${clientId}' is not in group '${groupId}'`
      );
    }

    // Remove group from client's affinityGroupIds array
    await this.firestore
      .collection("clients")
      .doc(clientId)
      .update({
        affinityGroupIds: FieldValue.arrayRemove(groupId),
        updated_at: FieldValue.serverTimestamp(),
      });

    // Create audit log
    await this.auditService.createAuditLog({
      action: "CLIENT_REMOVED_FROM_GROUP",
      resource_type: "group",
      resource_id: groupId,
      client_id: clientId,
      group_id: groupId,
      actor,
      changes: {
        before: { affinityGroupIds: currentGroups },
        after: {
          affinityGroupIds: currentGroups.filter((id) => id !== groupId),
        },
      },
    });
  }
}

// Lazy singleton
let _groupServiceInstance: GroupService | null = null;
export const groupService = {
  get instance(): GroupService {
    if (!_groupServiceInstance) {
      _groupServiceInstance = new GroupService();
    }
    return _groupServiceInstance;
  },
};
