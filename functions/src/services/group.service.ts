import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
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
   * Update a group
   */
  async updateGroup(
    groupId: string,
    request: UpdateGroupRequest,
    actor: AuditActor
  ): Promise<Group> {
    const groupRef = this.firestore.collection("affinityGroups").doc(groupId);
    const doc = await groupRef.get();

    if (!doc.exists) {
      throw new NotFoundError("Group", groupId);
    }

    const beforeData = doc.data()!;
    const before = groupSchema.parse({
      id: doc.id,
      name: beforeData.name,
      description: beforeData.description || "",
      created_at: beforeData.created_at.toDate
        ? beforeData.created_at.toDate()
        : beforeData.created_at,
    });

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: FieldValue.serverTimestamp(),
    };
    if (request.name !== undefined) {
      updateData.name = request.name;
    }
    if (request.description !== undefined) {
      updateData.description = request.description;
    }

    await groupRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await groupRef.get();
    const data = updatedDoc.data()!;

    const group = groupSchema.parse({
      id: updatedDoc.id,
      name: data.name,
      description: data.description || "",
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
    });

    // Create audit log
    await this.auditService.createAuditLog({
      action: "GROUP_UPDATED",
      resource_type: "group",
      resource_id: group.id,
      group_id: group.id,
      actor,
      changes: {
        before,
        after: group,
      },
    });

    return group;
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string, actor: AuditActor): Promise<void> {
    const groupRef = this.firestore.collection("affinityGroups").doc(groupId);
    const doc = await groupRef.get();

    if (!doc.exists) {
      throw new NotFoundError("Group", groupId);
    }

    const data = doc.data()!;
    const group = groupSchema.parse({
      id: doc.id,
      name: data.name,
      description: data.description || "",
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
    });

    // Remove this group from all clients that have it
    const clientsSnapshot = await this.firestore
      .collection("clients")
      .where("affinityGroupIds", "array-contains", groupId)
      .get();

    const batch = this.firestore.batch();
    clientsSnapshot.forEach((clientDoc) => {
      batch.update(clientDoc.ref, {
        affinityGroupIds: FieldValue.arrayRemove(groupId),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    // Delete the group
    batch.delete(groupRef);
    await batch.commit();

    // Create audit log
    await this.auditService.createAuditLog({
      action: "GROUP_DELETED",
      resource_type: "group",
      resource_id: groupId,
      group_id: groupId,
      actor,
      changes: {
        before: group,
        after: null,
      },
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
