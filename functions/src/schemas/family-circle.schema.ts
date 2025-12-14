import { z } from "zod";
import { firestoreIdSchema, timestampSchema } from "./common.schema";

// Import existing family circle schemas from other modules
export {
  relationshipTypeSchema,
  type RelationshipType,
  familyCircleMemberSchema,
  type FamilyCircleMember,
  familyCircleInfoSchema,
  type FamilyCircleInfo,
} from "./client.schema";

export {
  transactionOriginatorSchema,
  type TransactionOriginator,
} from "./transaction.schema";

export {
  updateFamilyCircleConfigRequestSchema,
  type UpdateFamilyCircleConfigRequest,
  familyCircleConfigSchema,
  type FamilyCircleConfig,
} from "./account.schema";

/**
 * Request to add member to family circle
 */
export const addFamilyCircleMemberRequestSchema = z.object({
  memberId: firestoreIdSchema.describe("ID of client to add as member"),
  relationshipType: z
    .enum(["spouse", "child", "parent", "sibling", "friend", "other"])
    .describe("Relationship type"),
});

export type AddFamilyCircleMemberRequest = z.infer<
  typeof addFamilyCircleMemberRequestSchema
>;

/**
 * Get family circle info response
 */
export const getFamilyCircleResponseSchema = z.union([
  z.object({
    role: z.literal("holder"),
    members: z
      .array(
        z.object({
          memberId: firestoreIdSchema,
          relationshipType: z.enum([
            "spouse",
            "child",
            "parent",
            "sibling",
            "friend",
            "other",
          ]),
          addedAt: timestampSchema,
          addedBy: z.string(),
        })
      )
      .default([]),
    totalMembers: z.number().int().min(0),
  }),
  z.object({
    role: z.literal("member"),
    holderId: firestoreIdSchema,
    relationshipType: z.enum(["spouse", "child", "parent", "sibling", "friend", "other"]),
    joinedAt: timestampSchema,
  }),
  z.object({
    role: z.null(),
    message: z.string(),
  }),
]);

export type GetFamilyCircleResponse = z.infer<typeof getFamilyCircleResponseSchema>;

/**
 * Get family circle members response
 */
export const getFamilyCircleMembersResponseSchema = z.object({
  data: z.array(
    z.object({
      memberId: firestoreIdSchema,
      relationshipType: z.enum(["spouse", "child", "parent", "sibling", "friend", "other"]),
      addedAt: timestampSchema,
      addedBy: z.string(),
    })
  ),
  metadata: z.object({
    totalMembers: z.number().int().min(0),
    holder: z.object({
      clientId: firestoreIdSchema,
    }),
  }),
});

export type GetFamilyCircleMembersResponse = z.infer<
  typeof getFamilyCircleMembersResponseSchema
>;

/**
 * Add family circle member response
 */
export const addFamilyCircleMemberResponseSchema = z.object({
  message: z.string(),
  member: z.object({
    memberId: firestoreIdSchema,
    relationshipType: z.enum(["spouse", "child", "parent", "sibling", "friend", "other"]),
    addedAt: timestampSchema,
    addedBy: z.string(),
  }),
});

export type AddFamilyCircleMemberResponse = z.infer<
  typeof addFamilyCircleMemberResponseSchema
>;

/**
 * Family circle config response
 */
export const familyCircleConfigResponseSchema = z.object({
  allowMemberCredits: z.boolean(),
  allowMemberDebits: z.boolean(),
  updatedAt: timestampSchema,
  updatedBy: z.string(),
});

export type FamilyCircleConfigResponse = z.infer<
  typeof familyCircleConfigResponseSchema
>;

/**
 * Update family circle config response
 */
export const updateFamilyCircleConfigResponseSchema = z.object({
  message: z.string(),
  config: familyCircleConfigResponseSchema,
});

export type UpdateFamilyCircleConfigResponse = z.infer<
  typeof updateFamilyCircleConfigResponseSchema
>;
