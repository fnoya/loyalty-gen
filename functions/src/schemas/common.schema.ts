import { z } from "zod";

/**
 * Pagination parameters for list operations
 */
export const paginationParamsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(30)
    .describe("Maximum number of items to return"),
  next_cursor: z
    .string()
    .optional()
    .describe("Cursor for fetching the next page of results"),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

/**
 * Paging information for paginated responses
 */
export const pagingSchema = z.object({
  next_cursor: z
    .string()
    .nullable()
    .describe("Cursor for the next page, null if no more pages"),
});

export type Paging = z.infer<typeof pagingSchema>;

/**
 * Generic paginated response wrapper
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T
): z.ZodObject<{
  data: z.ZodArray<T>;
  paging: typeof pagingSchema;
}> {
  return z.object({
    data: z.array(itemSchema),
    paging: pagingSchema,
  });
}

/**
 * Standard error response
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string().describe("Error code in UPPERCASE"),
    message: z.string().describe("Human-readable error message"),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Success message response
 */
export const successMessageSchema = z.object({
  message: z.string(),
});

export type SuccessMessage = z.infer<typeof successMessageSchema>;

/**
 * Timestamp schema for Firestore dates
 */
export const timestampSchema = z.date();

/**
 * Firestore document ID schema
 */
export const firestoreIdSchema = z.string().min(1);
