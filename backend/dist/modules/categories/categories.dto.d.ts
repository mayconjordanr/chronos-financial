import { z } from 'zod';
export declare const CreateCategorySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive?: boolean | undefined;
    description?: string | undefined;
    metadata?: Record<string, any> | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    parentId?: string | undefined;
}, {
    name: string;
    isActive?: boolean | undefined;
    description?: string | undefined;
    metadata?: Record<string, any> | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const UpdateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    icon: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    parentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    description?: string | null | undefined;
    metadata?: Record<string, any> | null | undefined;
    color?: string | null | undefined;
    icon?: string | null | undefined;
    parentId?: string | null | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    description?: string | null | undefined;
    metadata?: Record<string, any> | null | undefined;
    color?: string | null | undefined;
    icon?: string | null | undefined;
    parentId?: string | null | undefined;
}>;
export declare const SearchCategoriesSchema: z.ZodObject<{
    query: z.ZodString;
    includeInactive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    parentId: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    parentId?: string | undefined;
    limit?: number | undefined;
    includeInactive?: boolean | undefined;
}, {
    query: string;
    parentId?: string | undefined;
    limit?: number | undefined;
    includeInactive?: boolean | undefined;
}>;
export declare const GetCategoriesSchema: z.ZodObject<{
    includeInactive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    parentId: z.ZodOptional<z.ZodString>;
    includeUsage: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    sortBy: z.ZodOptional<z.ZodDefault<z.ZodEnum<["name", "createdAt", "updatedAt", "usage"]>>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodEnum<["asc", "desc"]>>>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    parentId?: string | undefined;
    limit?: number | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "usage" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    includeInactive?: boolean | undefined;
    includeUsage?: boolean | undefined;
    offset?: number | undefined;
}, {
    parentId?: string | undefined;
    limit?: number | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "usage" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    includeInactive?: boolean | undefined;
    includeUsage?: boolean | undefined;
    offset?: number | undefined;
}>;
export declare const CategoryUsageFiltersSchema: z.ZodObject<{
    startDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    endDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    groupBy: z.ZodOptional<z.ZodDefault<z.ZodEnum<["day", "week", "month", "year"]>>>;
    includeSubcategories: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    groupBy?: "year" | "week" | "day" | "month" | undefined;
    includeSubcategories?: boolean | undefined;
}, {
    startDate?: string | undefined;
    endDate?: string | undefined;
    groupBy?: "year" | "week" | "day" | "month" | undefined;
    includeSubcategories?: boolean | undefined;
}>;
export declare const BulkCategoryOperationsSchema: z.ZodObject<{
    operation: z.ZodEnum<["activate", "deactivate", "delete", "move"]>;
    categoryIds: z.ZodArray<z.ZodString, "many">;
    newParentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    operation: "move" | "delete" | "activate" | "deactivate";
    categoryIds: string[];
    newParentId?: string | null | undefined;
}, {
    operation: "move" | "delete" | "activate" | "deactivate";
    categoryIds: string[];
    newParentId?: string | null | undefined;
}>;
export declare const CategoryTreeOptionsSchema: z.ZodObject<{
    includeInactive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    includeUsage: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    maxDepth: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    rootCategoryId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    includeInactive?: boolean | undefined;
    includeUsage?: boolean | undefined;
    maxDepth?: number | undefined;
    rootCategoryId?: string | undefined;
}, {
    includeInactive?: boolean | undefined;
    includeUsage?: boolean | undefined;
    maxDepth?: number | undefined;
    rootCategoryId?: string | undefined;
}>;
export declare const CategoryPathSchema: z.ZodObject<{
    categoryId: z.ZodString;
    includeSelf: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    categoryId: string;
    includeSelf?: boolean | undefined;
}, {
    categoryId: string;
    includeSelf?: boolean | undefined;
}>;
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
export type SearchCategoriesDto = z.infer<typeof SearchCategoriesSchema>;
export type GetCategoriesDto = z.infer<typeof GetCategoriesSchema>;
export type CategoryUsageFiltersDto = z.infer<typeof CategoryUsageFiltersSchema>;
export type BulkCategoryOperationsDto = z.infer<typeof BulkCategoryOperationsSchema>;
export type CategoryTreeOptionsDto = z.infer<typeof CategoryTreeOptionsSchema>;
export type CategoryPathDto = z.infer<typeof CategoryPathSchema>;
export declare const CategoryIdParamSchema: z.ZodObject<{
    categoryId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    categoryId: string;
}, {
    categoryId: string;
}>;
export declare const TenantIdParamSchema: z.ZodObject<{
    tenantId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
}, {
    tenantId: string;
}>;
export declare const UserIdParamSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export declare const CategoryRouteParamsSchema: z.ZodObject<{
    categoryId: z.ZodString;
} & {
    tenantId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    categoryId: string;
}, {
    tenantId: string;
    categoryId: string;
}>;
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
    children?: CategoryWithDetails[];
    parent?: CategoryWithDetails | null;
    depth?: number;
    path?: string;
    usage?: CategoryUsageStats;
}
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
export interface CategoryUsageStats {
    transactionCount: number;
    totalAmount: string;
    averageAmount: string;
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
export declare function validateCreateCategory(data: unknown): CreateCategoryDto;
export declare function validateUpdateCategory(data: unknown): UpdateCategoryDto;
export declare function validateSearchCategories(data: unknown): SearchCategoriesDto;
export declare function validateGetCategories(data: unknown): GetCategoriesDto;
export declare function validateCategoryUsageFilters(data: unknown): CategoryUsageFiltersDto;
export declare function validateBulkCategoryOperations(data: unknown): BulkCategoryOperationsDto;
export declare function validateCategoryTreeOptions(data: unknown): CategoryTreeOptionsDto;
export declare function validateCategoryPath(data: unknown): CategoryPathDto;
export declare function validateCategoryIdParam(data: unknown): z.infer<typeof CategoryIdParamSchema>;
export declare function validateTenantIdParam(data: unknown): z.infer<typeof TenantIdParamSchema>;
export declare function validateUserIdParam(data: unknown): z.infer<typeof UserIdParamSchema>;
export declare function validateCategoryRouteParams(data: unknown): z.infer<typeof CategoryRouteParamsSchema>;
export declare const MAX_CATEGORY_DEPTH = 5;
export declare const MAX_CATEGORY_NAME_LENGTH = 100;
export declare const MAX_CATEGORY_DESCRIPTION_LENGTH = 500;
export declare const MAX_BULK_OPERATION_SIZE = 100;
export declare const DEFAULT_CATEGORY_COLORS: string[];
export declare const SYSTEM_CATEGORIES: {
    name: string;
    description: string;
    color: string;
    icon: string;
    isSystem: boolean;
}[];
//# sourceMappingURL=categories.dto.d.ts.map