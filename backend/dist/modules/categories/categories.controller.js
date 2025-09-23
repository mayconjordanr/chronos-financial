"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const categories_dto_1 = require("./categories.dto");
const zod_1 = require("zod");
class CategoryController {
    categoryService;
    constructor(categoryService) {
        this.categoryService = categoryService;
    }
    async createCategory(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const categoryData = (0, categories_dto_1.validateCreateCategory)(request.body);
            const result = await this.categoryService.createCategory(categoryData, userId, tenantId);
            if (result.success) {
                reply.status(201).send({
                    success: true,
                    message: result.message,
                    data: result.category
                });
            }
            else {
                reply.status(400).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in createCategory controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async getCategories(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const options = (0, categories_dto_1.validateGetCategories)(request.query);
            const result = await this.categoryService.getCategories(userId, tenantId, options);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message,
                    data: result.categories,
                    meta: {
                        total: result.total,
                        count: result.categories?.length || 0
                    }
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in getCategories controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Invalid query parameters',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async getCategory(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const { categoryId } = (0, categories_dto_1.validateCategoryIdParam)(request.params);
            const result = await this.categoryService.getCategory(categoryId, userId, tenantId);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message,
                    data: result.category
                });
            }
            else {
                reply.status(404).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in getCategory controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Invalid category ID',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async updateCategory(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const { categoryId } = (0, categories_dto_1.validateCategoryIdParam)(request.params);
            const updateData = (0, categories_dto_1.validateUpdateCategory)(request.body);
            const result = await this.categoryService.updateCategory(categoryId, updateData, userId, tenantId);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message,
                    data: result.category
                });
            }
            else {
                const statusCode = result.message.includes('not found') ? 404 : 400;
                reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in updateCategory controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async deleteCategory(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const { categoryId } = (0, categories_dto_1.validateCategoryIdParam)(request.params);
            const result = await this.categoryService.deleteCategory(categoryId, userId, tenantId);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message
                });
            }
            else {
                const statusCode = result.message.includes('not found') ? 404 : 400;
                reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in deleteCategory controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Invalid category ID',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async getCategoryTree(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const options = (0, categories_dto_1.validateCategoryTreeOptions)(request.query);
            const result = await this.categoryService.getCategoryTree(userId, tenantId, options);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message,
                    data: result.tree
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in getCategoryTree controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Invalid query parameters',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async getCategoryPath(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const { categoryId } = (0, categories_dto_1.validateCategoryIdParam)(request.params);
            const result = await this.categoryService.getCategoryPath(categoryId, userId, tenantId);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message,
                    data: result.path
                });
            }
            else {
                reply.status(404).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in getCategoryPath controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Invalid category ID',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async searchCategories(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const searchOptions = (0, categories_dto_1.validateSearchCategories)(request.query);
            const result = await this.categoryService.searchCategories(searchOptions.query, userId, tenantId, searchOptions);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message,
                    data: result.categories,
                    meta: {
                        total: result.total,
                        count: result.categories?.length || 0
                    }
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in searchCategories controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Invalid search parameters',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async getCategoryUsage(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const { categoryId } = (0, categories_dto_1.validateCategoryIdParam)(request.params);
            const filters = request.query ? (0, categories_dto_1.validateCategoryUsageFilters)(request.query) : undefined;
            const result = await this.categoryService.getCategoryUsage(categoryId, userId, tenantId, filters);
            if (result.success) {
                reply.status(200).send({
                    success: true,
                    message: result.message,
                    data: result.usage
                });
            }
            else {
                const statusCode = result.message.includes('not found') ? 404 : 500;
                reply.status(statusCode).send({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            console.error('Error in getCategoryUsage controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Invalid parameters',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    async bulkCategoryOperations(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const operationData = (0, categories_dto_1.validateBulkCategoryOperations)(request.body);
            let results = [];
            let successCount = 0;
            let failedCount = 0;
            const errors = [];
            for (const categoryId of operationData.categoryIds) {
                try {
                    let result;
                    switch (operationData.operation) {
                        case 'activate':
                            result = await this.categoryService.updateCategory(categoryId, { isActive: true }, userId, tenantId);
                            break;
                        case 'deactivate':
                            result = await this.categoryService.updateCategory(categoryId, { isActive: false }, userId, tenantId);
                            break;
                        case 'delete':
                            result = await this.categoryService.deleteCategory(categoryId, userId, tenantId);
                            break;
                        case 'move':
                            if (operationData.newParentId === undefined) {
                                throw new Error('newParentId is required for move operation');
                            }
                            result = await this.categoryService.updateCategory(categoryId, { parentId: operationData.newParentId }, userId, tenantId);
                            break;
                        default:
                            throw new Error(`Unsupported operation: ${operationData.operation}`);
                    }
                    if (result.success) {
                        successCount++;
                    }
                    else {
                        failedCount++;
                        errors.push(`Category ${categoryId}: ${result.message}`);
                    }
                    results.push({ categoryId, success: result.success, message: result.message });
                }
                catch (error) {
                    failedCount++;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`Category ${categoryId}: ${errorMessage}`);
                    results.push({ categoryId, success: false, message: errorMessage });
                }
            }
            reply.status(200).send({
                success: true,
                message: `Bulk operation completed. ${successCount} succeeded, ${failedCount} failed.`,
                data: {
                    operation: operationData.operation,
                    total: operationData.categoryIds.length,
                    successful: successCount,
                    failed: failedCount,
                    errors: errors,
                    results: results
                }
            });
        }
        catch (error) {
            console.error('Error in bulkCategoryOperations controller:', error);
            if (error instanceof zod_1.ZodError) {
                reply.status(400).send({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Internal server error'
                });
            }
        }
    }
    extractAuthInfo(request) {
        const user = request.user;
        if (!user || !user.tenantId || !user.userId) {
            throw new Error('Authentication required');
        }
        return {
            tenantId: user.tenantId,
            userId: user.userId
        };
    }
    async healthCheck(request, reply) {
        try {
            reply.status(200).send({
                success: true,
                message: 'Categories module is healthy',
                timestamp: new Date().toISOString(),
                service: 'categories'
            });
        }
        catch (error) {
            console.error('Error in categories health check:', error);
            reply.status(500).send({
                success: false,
                message: 'Categories module health check failed'
            });
        }
    }
    async getCategoriesStats(request, reply) {
        try {
            const { tenantId, userId } = this.extractAuthInfo(request);
            const [allCategories, activeCategories] = await Promise.all([
                this.categoryService.getCategories(userId, tenantId, { includeInactive: true }),
                this.categoryService.getCategories(userId, tenantId, { includeInactive: false })
            ]);
            if (allCategories.success && activeCategories.success) {
                const stats = {
                    total: allCategories.total || 0,
                    active: activeCategories.total || 0,
                    inactive: (allCategories.total || 0) - (activeCategories.total || 0),
                    lastUpdated: new Date().toISOString()
                };
                reply.status(200).send({
                    success: true,
                    message: 'Categories statistics retrieved successfully',
                    data: stats
                });
            }
            else {
                reply.status(500).send({
                    success: false,
                    message: 'Failed to retrieve categories statistics'
                });
            }
        }
        catch (error) {
            console.error('Error in getCategoriesStats controller:', error);
            reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=categories.controller.js.map