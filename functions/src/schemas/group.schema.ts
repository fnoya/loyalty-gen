import { z } from "zod";
import { firestoreIdSchema, timestampSchema } from "./common.schema";

/**
 * Affinity group schema
 */
export const groupSchema = z.object({
  id: firestoreIdSchema.describe("Unique group ID in Firestore"),
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name too long")
    .describe("Group name"),
  description: z
    .string()
    .max(500, "Description too long")
    .optional()
    .default("")
    .describe("Group description"),
  created_at: timestampSchema,
});

export type Group = z.infer<typeof groupSchema>;

/**
 * Create group request schema
 */
export const createGroupRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name too long")
    .describe("Group name"),
  description: z
    .string()
    .max(500, "Description too long")
    .optional()
    .default("")
    .describe("Group description"),
});

export type CreateGroupRequest = z.infer<typeof createGroupRequestSchema>;

/**
 * Assign client to group request
 */
export const assignClientToGroupRequestSchema = z.object({
  client_id: firestoreIdSchema.describe("Client ID to assign to the group"),
});

export type AssignClientToGroupRequest = z.infer<
  typeof assignClientToGroupRequestSchema
>;
