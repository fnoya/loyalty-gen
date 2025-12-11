import { z } from "zod";

const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]*$/;

export const clientSchema = z.object({
  name: z.object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50)
      .regex(namePattern, "Invalid characters in first name"),
    secondName: z
      .string()
      .max(50)
      .regex(namePattern, "Invalid characters in second name")
      .optional()
      .nullable(),
    firstLastName: z
      .string()
      .min(1, "First last name is required")
      .max(50)
      .regex(namePattern, "Invalid characters in first last name"),
    secondLastName: z
      .string()
      .max(50)
      .regex(namePattern, "Invalid characters in second last name")
      .optional()
      .nullable(),
  }),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  identity_document: z.object({
    type: z.enum(["cedula_identidad", "pasaporte"]),
    number: z
      .string()
      .regex(/^[a-zA-Z0-9]*$/, "Document number must be alphanumeric")
      .max(50)
      .optional()
      .or(z.literal("")),
  }).optional().nullable(),
  phones: z.array(z.object({
    type: z.enum(["mobile", "home", "work", "other"]),
    number: z.string().min(7, "Phone number too short").max(20, "Phone number too long"),
    extension: z.string().regex(/^[0-9]*$/, "Extension must be numeric").max(10).optional().nullable().or(z.literal("")),
    isPrimary: z.boolean(),
  })).optional(),
  addresses: z.array(z.object({
    type: z.enum(["home", "work", "other"]),
    street: z.string().min(1, "Street is required"),
    number: z.string().min(1, "Number is required"),
    locality: z.string().min(1, "Locality is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    postalCode: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    isPrimary: z.boolean(),
  })).optional(),
}).refine((data) => {
  const hasEmail = !!data.email;
  const hasDocument = !!data.identity_document?.number;
  return hasEmail || hasDocument;
}, {
  message: "Either email or identity document is required",
  path: ["email"], // Attach error to email field
});

export type ClientFormValues = z.infer<typeof clientSchema>;
