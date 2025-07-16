import { z } from "zod";

// Shared validation schemas for the application

export const createSorterSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  category: z
    .string()
    .max(50, "Category must be 50 characters or less")
    .optional(),
  items: z
    .array(
      z.object({
        title: z
          .string()
          .min(1, "Item title is required")
          .max(100, "Item title must be 100 characters or less"),
        imageUrl: z.string().url("Invalid URL").optional(),
      }),
    )
    .min(2, "At least 2 items are required"),
});

// Frontend form schema (subset without imageUrl for now)
export const createSorterFormSchema = createSorterSchema
  .omit({
    items: true,
  })
  .extend({
    items: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, "Item title is required")
            .max(100, "Item title must be 100 characters or less"),
        }),
      )
      .min(2, "At least 2 items are required"),
  });

// Type exports
export type CreateSorterInput = z.infer<typeof createSorterSchema>;
export type CreateSorterFormInput = z.infer<typeof createSorterFormSchema>;
