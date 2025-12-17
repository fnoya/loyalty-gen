import { z } from "zod";
import { firestoreIdSchema, timestampSchema } from "./common.schema";

/**
 * Audit action enum
 */
export const auditActionSchema = z.enum([
  "CLIENT_CREATED",
  "CLIENT_UPDATED",
  "CLIENT_DELETED",
  "ACCOUNT_CREATED",
  "POINTS_CREDITED",
  "POINTS_DEBITED",
  "GROUP_CREATED",
  "GROUP_UPDATED",
  "GROUP_DELETED",
  "CLIENT_ADDED_TO_GROUP",
  "CLIENT_REMOVED_FROM_GROUP",
  "FAMILY_CIRCLE_MEMBER_ADDED",
  "FAMILY_CIRCLE_MEMBER_REMOVED",
  "LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED",
  "POINTS_CREDITED_BY_CIRCLE_MEMBER",
  "POINTS_DEBITED_BY_CIRCLE_MEMBER",
]);

export type AuditAction = z.infer<typeof auditActionSchema>;

/**
 * Audit resource type enum
 */
export const auditResourceTypeSchema = z.enum([
  "client",
  "account",
  "transaction",
  "group",
]);

export type AuditResourceType = z.infer<typeof auditResourceTypeSchema>;

/**
 * Audit actor schema
 */
export const auditActorSchema = z.object({
  uid: z.string().describe("Firebase Auth UID of the actor"),
  email: z
    .string()
    .email()
    .nullable()
    .describe("Actor's email for historical reference"),
});

export type AuditActor = z.infer<typeof auditActorSchema>;

/**
 * Audit changes schema
 */
export const auditChangesSchema = z.object({
  before: z
    .record(z.unknown())
    .nullable()
    .describe("State before the operation"),
  after: z.record(z.unknown()).nullable().describe("State after the operation"),
});

export type AuditChanges = z.infer<typeof auditChangesSchema>;

/**
 * Audit metadata schema
 */
export const auditMetadataSchema = z.object({
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type AuditMetadata = z.infer<typeof auditMetadataSchema>;

/**
 * Audit log schema
 */
export const auditLogSchema = z.object({
  id: firestoreIdSchema.describe("Unique audit log ID"),
  action: auditActionSchema,
  resource_type: auditResourceTypeSchema,
  resource_id: firestoreIdSchema.describe("ID of the affected resource"),
  client_id: firestoreIdSchema.nullable().optional(),
  account_id: firestoreIdSchema.nullable().optional(),
  group_id: firestoreIdSchema.nullable().optional(),
  transaction_id: firestoreIdSchema.nullable().optional(),
  actor: auditActorSchema,
  changes: auditChangesSchema.nullable(),
  metadata: auditMetadataSchema,
  timestamp: timestampSchema,
});

export type AuditLog = z.infer<typeof auditLogSchema>;

/**
 * Audit log query parameters
 */
export const auditLogQuerySchema = z.object({
  action: auditActionSchema.optional(),
  resource_type: auditResourceTypeSchema.optional(),
  client_id: firestoreIdSchema.optional(),
  account_id: firestoreIdSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  next_cursor: z.string().optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
