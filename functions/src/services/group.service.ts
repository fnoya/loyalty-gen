import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  Group,
  CreateGroupRequest,
  groupSchema,
} from "../schemas/group.schema";
import { NotFoundError, ValidationError } from "../core/errors";

/**
 * Service for managing affinity groups
 */
class GroupService {
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
   * Create a new affinity group
   */
  async createGroup(request: CreateGroupRequest): Promise<Group> {
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

    return groupSchema.parse({
      id: createdDoc.id,
      name: data.name,
      description: data.description,
      created_at: data.created_at.toDate
        ? data.created_at.toDate()
        : data.created_at,
    });
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
  async assignClientToGroup(groupId: string, clientId: string): Promise<void> {
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
  }

  /**
   * Remove a client from an affinity group
   */
  async removeClientFromGroup(
    groupId: string,
    clientId: string
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
  }
}

export const groupService = new GroupService();
