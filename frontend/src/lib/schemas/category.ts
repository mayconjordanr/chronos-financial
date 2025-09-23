import { z } from "zod"

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be less than 50 characters")
    .trim(),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex code"),
  icon: z
    .string()
    .min(1, "Please select an icon"),
  type: z.enum(["income", "expense"], {
    required_error: "Please select a category type",
  }),
  isActive: z.boolean().default(true),
  sortOrder: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export const createCategorySchema = categorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().min(1, "Category ID is required"),
})

export const categoryFilterSchema = z.object({
  type: z.enum(["income", "expense", "all"]).default("all"),
  search: z.string().optional(),
  sortBy: z.enum(["name", "type", "createdAt", "usage"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

export type Category = z.infer<typeof categorySchema>
export type CreateCategory = z.infer<typeof createCategorySchema>
export type UpdateCategory = z.infer<typeof updateCategorySchema>
export type CategoryFilter = z.infer<typeof categoryFilterSchema>

// Icon validation schema
export const iconSchema = z.object({
  name: z.string(),
  category: z.string(),
  keywords: z.array(z.string()).optional(),
})

export type IconType = z.infer<typeof iconSchema>