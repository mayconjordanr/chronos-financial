import { z } from 'zod';

// Base validation schemas
const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Create category validation schema
export const CreateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .trim(),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),

  color: z.string()
    .regex(colorRegex, 'Invalid color format. Use hex color (e.g., #FF5733)')
    .optional(),

  icon: z.string()
    .max(10, 'Icon must be less than 10 characters')
    .optional(),

  parentId: z.string()
    .regex(uuidRegex, 'Invalid parent category ID format')
    .optional(),

  isActive: z.boolean()
    .default(true)
    .optional(),

  metadata: z.record(z.any())
    .optional()
});

// Update category validation schema
export const UpdateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .trim()
    .optional(),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  color: z.string()
    .regex(colorRegex, 'Invalid color format. Use hex color (e.g., #FF5733)')
    .optional()
    .nullable(),

  icon: z.string()
    .max(10, 'Icon must be less than 10 characters')
    .optional()
    .nullable(),

  parentId: z.string()
    .regex(uuidRegex, 'Invalid parent category ID format')
    .optional()
    .nullable(),

  isActive: z.boolean()
    .optional(),

  metadata: z.record(z.any())
    .optional()
    .nullable()
});

// Search categories validation schema
export const SearchCategoriesSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters')
    .trim(),

  includeInactive: z.boolean()
    .default(false)
    .optional(),

  parentId: z.string()
    .regex(uuidRegex, 'Invalid parent category ID format')
    .optional(),

  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional()
});

// Get categories with filters validation schema
export const GetCategoriesSchema = z.object({
  includeInactive: z.boolean()
    .default(false)
    .optional(),

  parentId: z.string()
    .regex(uuidRegex, 'Invalid parent category ID format')
    .optional(),

  includeUsage: z.boolean()
    .default(false)
    .optional(),

  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'usage'])
    .default('name')
    .optional(),

  sortOrder: z.enum(['asc', 'desc'])
    .default('asc')
    .optional(),

  limit: z.number()
    .int()
    .min(1)
    .max(500)
    .default(100)
    .optional(),

  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .optional()
});

// Category usage filters validation schema
export const CategoryUsageFiltersSchema = z.object({
  startDate: z.string()
    .datetime({ message: 'Invalid start date format' })
    .optional()
    .transform((val) => val ? new Date(val) : undefined),

  endDate: z.string()
    .datetime({ message: 'Invalid end date format' })
    .optional()
    .transform((val) => val ? new Date(val) : undefined),

  groupBy: z.enum(['day', 'week', 'month', 'year'])
    .default('month')
    .optional(),

  includeSubcategories: z.boolean()
    .default(true)
    .optional()
});

// Bulk operations validation schema
export const BulkCategoryOperationsSchema = z.object({
  operation: z.enum(['activate', 'deactivate', 'delete', 'move']),

  categoryIds: z.array(z.string().regex(uuidRegex, 'Invalid category ID format'))
    .min(1, 'At least one category ID is required')
    .max(100, 'Cannot process more than 100 categories at once'),

  newParentId: z.string()
    .regex(uuidRegex, 'Invalid parent category ID format')
    .optional()
    .nullable() // For move operation
});

// Category tree options validation schema
export const CategoryTreeOptionsSchema = z.object({
  includeInactive: z.boolean()
    .default(false)
    .optional(),

  includeUsage: z.boolean()
    .default(false)
    .optional(),

  maxDepth: z.number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .optional(),

  rootCategoryId: z.string()
    .regex(uuidRegex, 'Invalid root category ID format')
    .optional()
});

// Category path validation schema
export const CategoryPathSchema = z.object({
  categoryId: z.string()
    .regex(uuidRegex, 'Invalid category ID format'),

  includeSelf: z.boolean()
    .default(true)
    .optional()
});

// Export types for TypeScript
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
export type SearchCategoriesDto = z.infer<typeof SearchCategoriesSchema>;
export type GetCategoriesDto = z.infer<typeof GetCategoriesSchema>;
export type CategoryUsageFiltersDto = z.infer<typeof CategoryUsageFiltersSchema>;
export type BulkCategoryOperationsDto = z.infer<typeof BulkCategoryOperationsSchema>;
export type CategoryTreeOptionsDto = z.infer<typeof CategoryTreeOptionsSchema>;
export type CategoryPathDto = z.infer<typeof CategoryPathSchema>;

// Request parameter validation schemas
export const CategoryIdParamSchema = z.object({
  categoryId: z.string()
    .regex(uuidRegex, 'Invalid category ID format')
});

export const TenantIdParamSchema = z.object({
  tenantId: z.string()
    .regex(uuidRegex, 'Invalid tenant ID format')
});

export const UserIdParamSchema = z.object({
  userId: z.string()
    .regex(uuidRegex, 'Invalid user ID format')
});

// Combined parameter schemas for routes
export const CategoryRouteParamsSchema = CategoryIdParamSchema.merge(TenantIdParamSchema);

// Response interfaces for service layer
export interface CategoryResult {
  success: boolean;
  message: string;
  category?: CategoryWithDetails;
}

export interface CategoriesResult {
  success: boolean;
  message: string;
  categories?: CategoryWithDetails[];
  total?: number;
}

export interface CategoryTreeResult {
  success: boolean;
  message: string;
  tree?: CategoryTreeNode[];
}

export interface CategoryPathResult {
  success: boolean;
  message: string;
  path?: CategoryWithDetails[];
}

export interface CategoryUsageResult {
  success: boolean;
  message: string;
  usage?: CategoryUsageStats;
}

export interface BulkOperationResult {
  success: boolean;
  message: string;
  processed?: number;
  failed?: number;
  errors?: string[];
}

// Category with details interface
export interface CategoryWithDetails {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parentId?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any> | null;

  // Hierarchical information
  children?: CategoryWithDetails[];
  parent?: CategoryWithDetails | null;
  depth?: number;
  path?: string;

  // Usage statistics (when requested)
  usage?: CategoryUsageStats;
}

// Category tree node interface
export interface CategoryTreeNode {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isSystem: boolean;
  isActive: boolean;
  depth: number;
  children: CategoryTreeNode[];
  usage?: CategoryUsageStats;
}

// Category usage statistics interface
export interface CategoryUsageStats {
  transactionCount: number;
  totalAmount: string; // Decimal as string for precision
  averageAmount: string; // Decimal as string for precision
  lastUsed?: Date | null;
  periodBreakdown?: {
    period: string;
    count: number;
    amount: string;
  }[];
  monthlyTrend?: {
    month: string;
    count: number;
    amount: string;
  }[];
}

// Validation helper functions
export function validateCreateCategory(data: unknown): CreateCategoryDto {
  return CreateCategorySchema.parse(data);
}

export function validateUpdateCategory(data: unknown): UpdateCategoryDto {
  return UpdateCategorySchema.parse(data);
}

export function validateSearchCategories(data: unknown): SearchCategoriesDto {
  return SearchCategoriesSchema.parse(data);
}

export function validateGetCategories(data: unknown): GetCategoriesDto {
  return GetCategoriesSchema.parse(data);
}

export function validateCategoryUsageFilters(data: unknown): CategoryUsageFiltersDto {
  return CategoryUsageFiltersSchema.parse(data);
}

export function validateBulkCategoryOperations(data: unknown): BulkCategoryOperationsDto {
  return BulkCategoryOperationsSchema.parse(data);
}

export function validateCategoryTreeOptions(data: unknown): CategoryTreeOptionsDto {
  return CategoryTreeOptionsSchema.parse(data);
}

export function validateCategoryPath(data: unknown): CategoryPathDto {
  return CategoryPathSchema.parse(data);
}

export function validateCategoryIdParam(data: unknown): z.infer<typeof CategoryIdParamSchema> {
  return CategoryIdParamSchema.parse(data);
}

export function validateTenantIdParam(data: unknown): z.infer<typeof TenantIdParamSchema> {
  return TenantIdParamSchema.parse(data);
}

export function validateUserIdParam(data: unknown): z.infer<typeof UserIdParamSchema> {
  return UserIdParamSchema.parse(data);
}

export function validateCategoryRouteParams(data: unknown): z.infer<typeof CategoryRouteParamsSchema> {
  return CategoryRouteParamsSchema.parse(data);
}

// Constants
export const MAX_CATEGORY_DEPTH = 5;
export const MAX_CATEGORY_NAME_LENGTH = 100;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 500;
export const MAX_BULK_OPERATION_SIZE = 100;
export const DEFAULT_CATEGORY_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
  '#FF8C33', '#33FFF5', '#8C33FF', '#F533FF', '#33F533'
];

// Category system defaults
export const SYSTEM_CATEGORIES = [
  {
    name: 'Income',
    description: 'All income sources',
    color: '#4CAF50',
    icon: '💰',
    isSystem: true
  },
  {
    name: 'Expenses',
    description: 'All expense categories',
    color: '#F44336',
    icon: '💸',
    isSystem: true
  },
  {
    name: 'Transfers',
    description: 'Money transfers between accounts',
    color: '#2196F3',
    icon: '🔄',
    isSystem: true
  }
];