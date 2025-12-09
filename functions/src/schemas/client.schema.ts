import { z } from "zod";
import { firestoreIdSchema, timestampSchema } from "./common.schema";

/**
 * Identity document type enum
 */
export const identityDocumentTypeSchema = z.enum([
  "cedula_identidad",
  "pasaporte",
]);

export type IdentityDocumentType = z.infer<typeof identityDocumentTypeSchema>;

/**
 * Identity document schema
 */
export const identityDocumentSchema = z.object({
  type: identityDocumentTypeSchema,
  number: z
    .string()
    .regex(/^[a-zA-Z0-9]+$/, "Document number must be alphanumeric")
    .min(1)
    .max(50)
    .describe("Alphanumeric document number"),
});

export type IdentityDocument = z.infer<typeof identityDocumentSchema>;

/**
 * Client name schema with structured fields
 * Pattern allows letters, spaces, hyphens, apostrophes, and Spanish characters
 */
const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;

export const clientNameSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50)
    .regex(namePattern, "Invalid characters in first name")
    .describe("Client's first name"),
  secondName: z
    .string()
    .max(50)
    .regex(namePattern, "Invalid characters in second name")
    .optional()
    .nullable()
    .describe("Client's second name (optional)"),
  firstLastName: z
    .string()
    .min(1, "First last name is required")
    .max(50)
    .regex(namePattern, "Invalid characters in first last name")
    .describe("Client's first last name"),
  secondLastName: z
    .string()
    .max(50)
    .regex(namePattern, "Invalid characters in second last name")
    .optional()
    .nullable()
    .describe("Client's second last name (optional)"),
});

export type ClientName = z.infer<typeof clientNameSchema>;

/**
 * Phone type enum
 */
export const phoneTypeSchema = z.enum(["mobile", "home", "work", "other"]);

export type PhoneType = z.infer<typeof phoneTypeSchema>;

/**
 * Phone schema
 */
export const phoneSchema = z.object({
  type: phoneTypeSchema,
  number: z
    .string()
    .min(7, "Phone number too short")
    .max(20, "Phone number too long")
    .describe("Phone number, preferably in E.164 format"),
  extension: z
    .string()
    .regex(/^[0-9]+$/, "Extension must be numeric")
    .max(10)
    .optional()
    .nullable()
    .describe("Phone extension (optional)"),
  isPrimary: z
    .boolean()
    .describe("Indicates if this is the primary phone number"),
});

export type Phone = z.infer<typeof phoneSchema>;

/**
 * Address type enum
 */
export const addressTypeSchema = z.enum(["home", "work", "other"]);

export type AddressType = z.infer<typeof addressTypeSchema>;

/**
 * Address schema
 */
export const addressSchema = z.object({
  type: addressTypeSchema,
  street: z
    .string()
    .max(100)
    .describe("Street name"),
  buildingBlock: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .describe("Building, block, etc. (optional)"),
  number: z
    .string()
    .max(20)
    .describe("Street number"),
  apartment: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .describe("Apartment, unit, etc. (optional)"),
  locality: z
    .string()
    .max(100)
    .describe("City or locality"),
  state: z
    .string()
    .max(100)
    .describe("State, province, or department"),
  postalCode: z
    .string()
    .max(20)
    .describe("Postal code"),
  country: z
    .string()
    .length(2, "Country code must be 2 characters")
    .regex(/^[A-Z]{2}$/, "Country code must be uppercase ISO 3166-1 alpha-2")
    .describe("ISO 3166-1 alpha-2 country code"),
  isPrimary: z
    .boolean()
    .describe("Indicates if this is the primary address"),
});

export type Address = z.infer<typeof addressSchema>;

/**
 * Relationship type for family circles
 */
export const relationshipTypeSchema = z.enum([
  "spouse",
  "child",
  "parent",
  "sibling",
  "friend",
  "other",
]);

export type RelationshipType = z.infer<typeof relationshipTypeSchema>;

/**
 * Family circle information
 */
export const familyCircleInfoSchema = z
  .object({
    role: z.enum(["holder", "member"]).nullable(),
    holderId: z.string().nullable().describe("ID of the circle holder"),
    relationshipType: relationshipTypeSchema.nullable(),
    joinedAt: timestampSchema.nullable(),
  })
  .nullable();

export type FamilyCircleInfo = z.infer<typeof familyCircleInfoSchema>;

/**
 * Family circle member
 */
export const familyCircleMemberSchema = z.object({
  memberId: firestoreIdSchema.describe("Member client ID"),
  relationshipType: relationshipTypeSchema,
  addedAt: timestampSchema,
  addedBy: z.string().describe("UID of user who added the member"),
});

export type FamilyCircleMember = z.infer<typeof familyCircleMemberSchema>;

/**
 * Full client schema
 */
export const clientSchema = z.object({
  id: firestoreIdSchema.describe("Unique client ID in Firestore"),
  name: clientNameSchema,
  email: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable()
    .describe("Client email (optional if identity_document provided)"),
  identity_document: identityDocumentSchema
    .optional()
    .nullable()
    .describe("Identity document (optional if email provided)"),
  photoUrl: z
    .string()
    .url("Invalid photo URL")
    .optional()
    .nullable()
    .describe("Profile photo URL in Firebase Storage"),
  phones: z
    .array(phoneSchema)
    .default([])
    .describe("List of phone numbers"),
  addresses: z
    .array(addressSchema)
    .default([])
    .describe("List of addresses"),
  extra_data: z
    .record(z.unknown())
    .default({})
    .describe("Additional key-value data"),
  affinityGroupIds: z
    .array(firestoreIdSchema)
    .default([])
    .describe("IDs of affinity groups"),
  familyCircle: familyCircleInfoSchema,
  familyCircleMembers: z
    .array(familyCircleMemberSchema)
    .nullable()
    .describe("Family circle members (only if holder)"),
  account_balances: z
    .record(z.number().int().min(0))
    .default({})
    .describe("Denormalized account balances"),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type Client = z.infer<typeof clientSchema>;

/**
 * Create client request schema
 * Validates that at least one of email or identity_document is provided
 */
export const createClientRequestSchema = z
  .object({
    name: clientNameSchema,
    email: z
      .string()
      .email("Invalid email format")
      .optional()
      .describe("Client email (required if identity_document not provided)"),
    identity_document: identityDocumentSchema
      .optional()
      .describe("Identity document (required if email not provided)"),
    photoUrl: z
      .string()
      .url("Invalid photo URL")
      .optional()
      .nullable()
      .describe("Profile photo URL"),
    phones: z
      .array(phoneSchema)
      .optional()
      .default([])
      .describe("List of phone numbers"),
    addresses: z
      .array(addressSchema)
      .optional()
      .default([])
      .describe("List of addresses"),
    extra_data: z
      .record(z.unknown())
      .optional()
      .default({})
      .describe("Additional key-value data"),
  })
  .refine(
    (data) => data.email || data.identity_document,
    {
      message: "At least one identifier required: email or identity_document",
      path: ["email"],
    }
  )
  .refine(
    (data) => {
      if (data.phones && data.phones.length > 0) {
        const primaryCount = data.phones.filter((p) => p.isPrimary).length;
        return primaryCount <= 1;
      }
      return true;
    },
    {
      message: "Only one phone can be marked as primary",
      path: ["phones"],
    }
  )
  .refine(
    (data) => {
      if (data.addresses && data.addresses.length > 0) {
        const primaryCount = data.addresses.filter((a) => a.isPrimary).length;
        return primaryCount <= 1;
      }
      return true;
    },
    {
      message: "Only one address can be marked as primary",
      path: ["addresses"],
    }
  );

export type CreateClientRequest = z.infer<typeof createClientRequestSchema>;

/**
 * Update client request schema
 * Note: email and identity_document cannot be changed after creation
 */
export const updateClientRequestSchema = z
  .object({
    name: clientNameSchema.optional(),
    photoUrl: z
      .string()
      .url("Invalid photo URL")
      .optional()
      .nullable()
      .describe("Profile photo URL (null to remove)"),
    phones: z
      .array(phoneSchema)
      .optional()
      .describe("List of phone numbers (replaces existing)"),
    addresses: z
      .array(addressSchema)
      .optional()
      .describe("List of addresses (replaces existing)"),
    extra_data: z
      .record(z.unknown())
      .optional()
      .describe("Additional key-value data"),
  })
  .refine(
    (data) => {
      if (data.phones && data.phones.length > 0) {
        const primaryCount = data.phones.filter((p) => p.isPrimary).length;
        return primaryCount <= 1;
      }
      return true;
    },
    {
      message: "Only one phone can be marked as primary",
      path: ["phones"],
    }
  )
  .refine(
    (data) => {
      if (data.addresses && data.addresses.length > 0) {
        const primaryCount = data.addresses.filter((a) => a.isPrimary).length;
        return primaryCount <= 1;
      }
      return true;
    },
    {
      message: "Only one address can be marked as primary",
      path: ["addresses"],
    }
  );

export type UpdateClientRequest = z.infer<typeof updateClientRequestSchema>;

/**
 * Client search query schema
 */
export const clientSearchQuerySchema = z.object({
  q: z
    .string()
    .min(1, "Search query cannot be empty")
    .describe("Search query (name, document number, or phone)"),
});

export type ClientSearchQuery = z.infer<typeof clientSearchQuerySchema>;
