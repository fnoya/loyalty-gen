import { z } from "zod";
import { firestoreIdSchema, timestampSchema } from "./common.schema";

/**
 * Family circle configuration for loyalty accounts
 */
export const familyCircleConfigSchema = z
  .object({
    allowMemberCredits: z
      .boolean()
      .describe("Allow family members to credit points"),
    allowMemberDebits: z
      .boolean()
      .describe("Allow family members to debit points"),
    updatedAt: timestampSchema,
    updatedBy: z.string().describe("UID of user who updated the config"),
  })
  .nullable();

export type FamilyCircleConfig = z.infer<typeof familyCircleConfigSchema>;

/**
 * Loyalty account schema
 */
export const loyaltyAccountSchema = z.object({
  id: firestoreIdSchema.describe("Unique account ID in Firestore"),
  account_name: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Account name too long")
    .describe("Account name"),
  points: z
    .number()
    .int("Points must be an integer")
    .min(0, "Points cannot be negative")
    .describe("Current point balance (source of truth)"),
  familyCircleConfig: familyCircleConfigSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type LoyaltyAccount = z.infer<typeof loyaltyAccountSchema>;

/**
 * Create loyalty account request schema
 */
export const createAccountRequestSchema = z.object({
  account_name: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Account name too long")
    .describe("Account name"),
});

export type CreateAccountRequest = z.infer<typeof createAccountRequestSchema>;

/**
 * Credit/Debit request schema
 */
export const creditDebitRequestSchema = z.object({
  amount: z
    .number()
    .int("Amount must be an integer")
    .positive("Amount must be positive")
    .min(1, "Amount must be at least 1")
    .describe("Amount to credit or debit (always positive)"),
  description: z
    .string()
    .max(500, "Description too long")
    .optional()
    .default("")
    .describe("Transaction description"),
});

export type CreditDebitRequest = z.infer<typeof creditDebitRequestSchema>;

/**
 * Balance response schema
 */
export const balanceResponseSchema = z.object({
  points: z
    .number()
    .int()
    .min(0)
    .describe("Current point balance"),
});

export type BalanceResponse = z.infer<typeof balanceResponseSchema>;

/**
 * All balances response schema
 */
export const allBalancesResponseSchema = z.record(
  z.number().int().min(0)
).describe("Map of account IDs to point balances");

export type AllBalancesResponse = z.infer<typeof allBalancesResponseSchema>;

/**
 * Update family circle config request
 */
export const updateFamilyCircleConfigRequestSchema = z.object({
  allowMemberCredits: z
    .boolean()
    .describe("Allow family members to credit points"),
  allowMemberDebits: z
    .boolean()
    .describe("Allow family members to debit points"),
});

export type UpdateFamilyCircleConfigRequest = z.infer<
  typeof updateFamilyCircleConfigRequestSchema
>;
