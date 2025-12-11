import { z } from "zod";
import { firestoreIdSchema, timestampSchema } from "./common.schema";
import { relationshipTypeSchema } from "./client.schema";

/**
 * Transaction type enum
 */
export const transactionTypeSchema = z.enum(["credit", "debit"]);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

/**
 * Transaction originator (for family circle transactions)
 */
export const transactionOriginatorSchema = z
  .object({
    clientId: firestoreIdSchema.describe(
      "ID of client who originated the transaction"
    ),
    isCircleMember: z
      .boolean()
      .describe("True if originated by circle member, false if by holder"),
    relationshipType: relationshipTypeSchema.nullable(),
  })
  .nullable();

export type TransactionOriginator = z.infer<typeof transactionOriginatorSchema>;

/**
 * Point transaction schema
 */
export const transactionSchema = z.object({
  id: firestoreIdSchema.describe("Unique transaction ID"),
  transaction_type: transactionTypeSchema,
  amount: z
    .number()
    .int("Amount must be an integer")
    .positive("Amount must be positive")
    .describe("Transaction amount (always positive)"),
  description: z
    .string()
    .max(500)
    .default("")
    .describe("Transaction description"),
  originatedBy: transactionOriginatorSchema,
  timestamp: timestampSchema,
});

export type Transaction = z.infer<typeof transactionSchema>;
