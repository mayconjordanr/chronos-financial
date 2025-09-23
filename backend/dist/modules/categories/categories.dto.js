"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_CATEGORIES = exports.DEFAULT_CATEGORY_COLORS = exports.MAX_BULK_OPERATION_SIZE = exports.MAX_CATEGORY_DESCRIPTION_LENGTH = exports.MAX_CATEGORY_NAME_LENGTH = exports.MAX_CATEGORY_DEPTH = exports.CategoryRouteParamsSchema = exports.UserIdParamSchema = exports.TenantIdParamSchema = exports.CategoryIdParamSchema = exports.CategoryPathSchema = exports.CategoryTreeOptionsSchema = exports.BulkCategoryOperationsSchema = exports.CategoryUsageFiltersSchema = exports.GetCategoriesSchema = exports.SearchCategoriesSchema = exports.UpdateCategorySchema = exports.CreateCategorySchema = void 0;
exports.validateCreateCategory = validateCreateCategory;
exports.validateUpdateCategory = validateUpdateCategory;
exports.validateSearchCategories = validateSearchCategories;
exports.validateGetCategories = validateGetCategories;
exports.validateCategoryUsageFilters = validateCategoryUsageFilters;
exports.validateBulkCategoryOperations = validateBulkCategoryOperations;
exports.validateCategoryTreeOptions = validateCategoryTreeOptions;
exports.validateCategoryPath = validateCategoryPath;
exports.validateCategoryIdParam = validateCategoryIdParam;
exports.validateTenantIdParam = validateTenantIdParam;
exports.validateUserIdParam = validateUserIdParam;
exports.validateCategoryRouteParams = validateCategoryRouteParams;
const zod_1 = require("zod");
const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
exports.CreateCategorySchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Category name is required')
        .max(100, 'Category name must be less than 100 characters')
        .trim(),
    description: zod_1.z.string()
        .max(500, 'Description must be less than 500 characters')
        .trim()
        .optional(),
    color: zod_1.z.string()
        .regex(colorRegex, 'Invalid color format. Use hex color (e.g., #FF5733)')
        .optional(),
    icon: zod_1.z.string()
        .max(10, 'Icon must be less than 10 characters')
        .optional(),
    parentId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid parent category ID format')
        .optional(),
    isActive: zod_1.z.boolean()
        .default(true)
        .optional(),
    metadata: zod_1.z.record(zod_1.z.any())
        .optional()
});
exports.UpdateCategorySchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Category name is required')
        .max(100, 'Category name must be less than 100 characters')
        .trim()
        .optional(),
    description: zod_1.z.string()
        .max(500, 'Description must be less than 500 characters')
        .trim()
        .optional()
        .nullable(),
    color: zod_1.z.string()
        .regex(colorRegex, 'Invalid color format. Use hex color (e.g., #FF5733)')
        .optional()
        .nullable(),
    icon: zod_1.z.string()
        .max(10, 'Icon must be less than 10 characters')
        .optional()
        .nullable(),
    parentId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid parent category ID format')
        .optional()
        .nullable(),
    isActive: zod_1.z.boolean()
        .optional(),
    metadata: zod_1.z.record(zod_1.z.any())
        .optional()
        .nullable()
});
exports.SearchCategoriesSchema = zod_1.z.object({
    query: zod_1.z.string()
        .min(1, 'Search query is required')
        .max(100, 'Search query must be less than 100 characters')
        .trim(),
    includeInactive: zod_1.z.boolean()
        .default(false)
        .optional(),
    parentId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid parent category ID format')
        .optional(),
    limit: zod_1.z.number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .optional()
});
exports.GetCategoriesSchema = zod_1.z.object({
    includeInactive: zod_1.z.boolean()
        .default(false)
        .optional(),
    parentId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid parent category ID format')
        .optional(),
    includeUsage: zod_1.z.boolean()
        .default(false)
        .optional(),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'updatedAt', 'usage'])
        .default('name')
        .optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc'])
        .default('asc')
        .optional(),
    limit: zod_1.z.number()
        .int()
        .min(1)
        .max(500)
        .default(100)
        .optional(),
    offset: zod_1.z.number()
        .int()
        .min(0)
        .default(0)
        .optional()
});
exports.CategoryUsageFiltersSchema = zod_1.z.object({
    startDate: zod_1.z.string()
        .datetime({ message: 'Invalid start date format' })
        .optional()
        .transform((val) => val ? new Date(val) : undefined),
    endDate: zod_1.z.string()
        .datetime({ message: 'Invalid end date format' })
        .optional()
        .transform((val) => val ? new Date(val) : undefined),
    groupBy: zod_1.z.enum(['day', 'week', 'month', 'year'])
        .default('month')
        .optional(),
    includeSubcategories: zod_1.z.boolean()
        .default(true)
        .optional()
});
exports.BulkCategoryOperationsSchema = zod_1.z.object({
    operation: zod_1.z.enum(['activate', 'deactivate', 'delete', 'move']),
    categoryIds: zod_1.z.array(zod_1.z.string().regex(uuidRegex, 'Invalid category ID format'))
        .min(1, 'At least one category ID is required')
        .max(100, 'Cannot process more than 100 categories at once'),
    newParentId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid parent category ID format')
        .optional()
        .nullable()
});
exports.CategoryTreeOptionsSchema = zod_1.z.object({
    includeInactive: zod_1.z.boolean()
        .default(false)
        .optional(),
    includeUsage: zod_1.z.boolean()
        .default(false)
        .optional(),
    maxDepth: zod_1.z.number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .optional(),
    rootCategoryId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid root category ID format')
        .optional()
});
exports.CategoryPathSchema = zod_1.z.object({
    categoryId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid category ID format'),
    includeSelf: zod_1.z.boolean()
        .default(true)
        .optional()
});
exports.CategoryIdParamSchema = zod_1.z.object({
    categoryId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid category ID format')
});
exports.TenantIdParamSchema = zod_1.z.object({
    tenantId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid tenant ID format')
});
exports.UserIdParamSchema = zod_1.z.object({
    userId: zod_1.z.string()
        .regex(uuidRegex, 'Invalid user ID format')
});
exports.CategoryRouteParamsSchema = exports.CategoryIdParamSchema.merge(exports.TenantIdParamSchema);
function validateCreateCategory(data) {
    return exports.CreateCategorySchema.parse(data);
}
function validateUpdateCategory(data) {
    return exports.UpdateCategorySchema.parse(data);
}
function validateSearchCategories(data) {
    return exports.SearchCategoriesSchema.parse(data);
}
function validateGetCategories(data) {
    return exports.GetCategoriesSchema.parse(data);
}
function validateCategoryUsageFilters(data) {
    return exports.CategoryUsageFiltersSchema.parse(data);
}
function validateBulkCategoryOperations(data) {
    return exports.BulkCategoryOperationsSchema.parse(data);
}
function validateCategoryTreeOptions(data) {
    return exports.CategoryTreeOptionsSchema.parse(data);
}
function validateCategoryPath(data) {
    return exports.CategoryPathSchema.parse(data);
}
function validateCategoryIdParam(data) {
    return exports.CategoryIdParamSchema.parse(data);
}
function validateTenantIdParam(data) {
    return exports.TenantIdParamSchema.parse(data);
}
function validateUserIdParam(data) {
    return exports.UserIdParamSchema.parse(data);
}
function validateCategoryRouteParams(data) {
    return exports.CategoryRouteParamsSchema.parse(data);
}
exports.MAX_CATEGORY_DEPTH = 5;
exports.MAX_CATEGORY_NAME_LENGTH = 100;
exports.MAX_CATEGORY_DESCRIPTION_LENGTH = 500;
exports.MAX_BULK_OPERATION_SIZE = 100;
exports.DEFAULT_CATEGORY_COLORS = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
    '#FF8C33', '#33FFF5', '#8C33FF', '#F533FF', '#33F533'
];
exports.SYSTEM_CATEGORIES = [
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
//# sourceMappingURL=categories.dto.js.map