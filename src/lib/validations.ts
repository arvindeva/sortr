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
  useGroups: z.boolean(),
  groups: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, "Group name is required")
          .max(50, "Group name must be 50 characters or less"),
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
          .min(1, "Each group must have at least 1 item"),
      }),
    )
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
    .min(2, "At least 2 items are required")
    .optional(),
})
.refine(
  (data) => {
    if (data.useGroups) {
      // If using groups, must have at least 2 groups with valid items
      return data.groups && 
             data.groups.length >= 2 && 
             data.groups.every(group => 
               group.items && 
               group.items.filter(item => item.title.trim()).length >= 1
             );
    } else {
      // If not using groups, must have at least 2 valid items
      return data.items && 
             data.items.length >= 2 &&
             data.items.filter(item => item.title.trim()).length >= 2;
    }
  },
  {
    message: "Must have at least 2 items with names",
    path: ["root"],
  }
);

// Legacy form schema - keeping for backward compatibility
export const createSorterFormSchema = z.object({
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
      }),
    )
    .min(2, "At least 2 items are required"),
});

// Sign-in validation schema
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

// Type exports
export type CreateSorterInput = z.infer<typeof createSorterSchema>;
export type CreateSorterFormInput = z.infer<typeof createSorterFormSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
