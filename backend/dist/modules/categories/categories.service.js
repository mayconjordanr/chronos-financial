"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const library_1 = require("@prisma/client/runtime/library");
const categories_dto_1 = require("./categories.dto");
class CategoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCategory(data, userId, tenantId) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const existingCategory = await tx.category.findFirst({
                    where: {
                        name: data.name,
                        tenantId
                    }
                });
                if (existingCategory) {
                    throw new Error('Category name already exists');
                }
                if (data.parentId) {
                    const parentCategory = await tx.category.findFirst({
                        where: {
                            id: data.parentId,
                            tenantId
                        }
                    });
                    if (!parentCategory) {
                        throw new Error('Parent category not found or access denied');
                    }
                    const depth = await this.calculateCategoryDepth(tx, data.parentId, tenantId);
                    if (depth >= categories_dto_1.MAX_CATEGORY_DEPTH) {
                        throw new Error('Category hierarchy depth limit exceeded');
                    }
                }
                if (data.color && !this.isValidColor(data.color)) {
                    throw new Error('Invalid color format. Use hex color (e.g., #FF5733)');
                }
                const category = await tx.category.create({
                    data: {
                        tenantId,
                        name: data.name,
                        description: data.description || null,
                        color: data.color || null,
                        icon: data.icon || null,
                        parentId: data.parentId || null,
                        isActive: data.isActive ?? true,
                        isSystem: false
                    },
                    include: {
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                                icon: true
                            }
                        },
                        children: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                                icon: true,
                                isActive: true
                            },
                            where: { isActive: true }
                        }
                    }
                });
                return category;
            });
            return {
                success: true,
                message: 'Category created successfully',
                category: result
            };
        }
        catch (error) {
            console.error('Error creating category:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create category'
            };
        }
    }
    async getCategories(userId, tenantId, options) {
        try {
            const { includeInactive = false, parentId, includeUsage = false, sortBy = 'name', sortOrder = 'asc', limit = 100, offset = 0 } = options || {};
            const where = {
                tenantId
            };
            if (!includeInactive) {
                where.isActive = true;
            }
            if (parentId !== undefined) {
                where.parentId = parentId;
            }
            const orderBy = {};
            if (sortBy === 'usage') {
                orderBy.name = sortOrder;
            }
            else {
                orderBy[sortBy] = sortOrder;
            }
            const [categories, total] = await Promise.all([
                this.prisma.category.findMany({
                    where,
                    include: {
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                                icon: true
                            }
                        },
                        children: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                                icon: true,
                                isActive: true
                            },
                            where: { isActive: true }
                        },
                        _count: includeUsage ? {
                            select: {
                                transactions: true
                            }
                        } : false
                    },
                    orderBy,
                    skip: offset,
                    take: limit
                }),
                this.prisma.category.count({ where })
            ]);
            let categoriesWithDetails = categories;
            if (includeUsage && categories.length > 0) {
                categoriesWithDetails = await Promise.all(categories.map(async (category) => {
                    const usage = await this.calculateCategoryUsage(category.id, tenantId);
                    return {
                        ...category,
                        usage
                    };
                }));
                if (sortBy === 'usage') {
                    categoriesWithDetails.sort((a, b) => {
                        const aCount = a.usage?.transactionCount || 0;
                        const bCount = b.usage?.transactionCount || 0;
                        return sortOrder === 'desc' ? bCount - aCount : aCount - bCount;
                    });
                }
            }
            return {
                success: true,
                message: 'Categories retrieved successfully',
                categories: categoriesWithDetails,
                total
            };
        }
        catch (error) {
            console.error('Error getting categories:', error);
            return {
                success: false,
                message: 'Failed to retrieve categories'
            };
        }
    }
    async getCategory(categoryId, userId, tenantId) {
        try {
            const category = await this.prisma.category.findFirst({
                where: {
                    id: categoryId,
                    tenantId
                },
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                            icon: true
                        }
                    },
                    children: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                            icon: true,
                            isActive: true
                        },
                        where: { isActive: true }
                    }
                }
            });
            if (!category) {
                return {
                    success: false,
                    message: 'Category not found or access denied'
                };
            }
            return {
                success: true,
                message: 'Category retrieved successfully',
                category: category
            };
        }
        catch (error) {
            console.error('Error getting category:', error);
            return {
                success: false,
                message: 'Category not found or access denied'
            };
        }
    }
    async updateCategory(categoryId, data, userId, tenantId) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const existingCategory = await tx.category.findFirst({
                    where: {
                        id: categoryId,
                        tenantId
                    }
                });
                if (!existingCategory) {
                    throw new Error('Category not found or access denied');
                }
                if (data.parentId !== undefined) {
                    if (data.parentId) {
                        const parentCategory = await tx.category.findFirst({
                            where: {
                                id: data.parentId,
                                tenantId
                            }
                        });
                        if (!parentCategory) {
                            throw new Error('Parent category not found or access denied');
                        }
                        if (await this.wouldCreateCircularReference(tx, categoryId, data.parentId, tenantId)) {
                            throw new Error('Circular reference detected in category hierarchy');
                        }
                        const depth = await this.calculateCategoryDepth(tx, data.parentId, tenantId);
                        if (depth >= categories_dto_1.MAX_CATEGORY_DEPTH) {
                            throw new Error('Category hierarchy depth limit exceeded');
                        }
                    }
                }
                if (data.name && data.name !== existingCategory.name) {
                    const duplicateCategory = await tx.category.findFirst({
                        where: {
                            name: data.name,
                            tenantId,
                            id: { not: categoryId }
                        }
                    });
                    if (duplicateCategory) {
                        throw new Error('Category name already exists');
                    }
                }
                if (data.color && !this.isValidColor(data.color)) {
                    throw new Error('Invalid color format. Use hex color (e.g., #FF5733)');
                }
                const updatedCategory = await tx.category.update({
                    where: { id: categoryId },
                    data: {
                        name: data.name !== undefined ? data.name : undefined,
                        description: data.description !== undefined ? data.description : undefined,
                        color: data.color !== undefined ? data.color : undefined,
                        icon: data.icon !== undefined ? data.icon : undefined,
                        parentId: data.parentId !== undefined ? data.parentId : undefined,
                        isActive: data.isActive !== undefined ? data.isActive : undefined,
                        updatedAt: new Date()
                    },
                    include: {
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                                icon: true
                            }
                        },
                        children: {
                            select: {
                                id: true,
                                name: true,
                                color: true,
                                icon: true,
                                isActive: true
                            },
                            where: { isActive: true }
                        }
                    }
                });
                return updatedCategory;
            });
            return {
                success: true,
                message: 'Category updated successfully',
                category: result
            };
        }
        catch (error) {
            console.error('Error updating category:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update category'
            };
        }
    }
    async deleteCategory(categoryId, userId, tenantId) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const existingCategory = await tx.category.findFirst({
                    where: {
                        id: categoryId,
                        tenantId
                    }
                });
                if (!existingCategory) {
                    throw new Error('Category not found or access denied');
                }
                const childCategories = await tx.category.findMany({
                    where: {
                        parentId: categoryId,
                        tenantId
                    }
                });
                if (childCategories.length > 0) {
                    throw new Error('Cannot delete category with child categories');
                }
                const transactionCount = await tx.transaction.count({
                    where: {
                        categoryId: categoryId,
                        tenantId
                    }
                });
                if (transactionCount > 0) {
                    throw new Error('Cannot delete category that is being used by transactions');
                }
                await tx.category.delete({
                    where: { id: categoryId }
                });
                return existingCategory;
            });
            return {
                success: true,
                message: 'Category deleted successfully',
                category: result
            };
        }
        catch (error) {
            console.error('Error deleting category:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete category'
            };
        }
    }
    async getCategoryTree(userId, tenantId, options) {
        try {
            const { includeInactive = false, includeUsage = false, maxDepth = 5, rootCategoryId } = options || {};
            const where = {
                tenantId
            };
            if (!includeInactive) {
                where.isActive = true;
            }
            if (rootCategoryId) {
                where.OR = [
                    { id: rootCategoryId },
                    { parentId: rootCategoryId }
                ];
            }
            const categories = await this.prisma.category.findMany({
                where,
                orderBy: [
                    { name: 'asc' }
                ]
            });
            const tree = await this.buildCategoryTree(categories, rootCategoryId || null, 0, maxDepth, includeUsage, tenantId);
            return {
                success: true,
                message: 'Category tree retrieved successfully',
                tree
            };
        }
        catch (error) {
            console.error('Error getting category tree:', error);
            return {
                success: false,
                message: 'Failed to retrieve category tree'
            };
        }
    }
    async getCategoryPath(categoryId, userId, tenantId) {
        try {
            const category = await this.prisma.category.findFirst({
                where: {
                    id: categoryId,
                    tenantId
                }
            });
            if (!category) {
                return {
                    success: false,
                    message: 'Category not found or access denied'
                };
            }
            const path = [];
            let currentCategory = category;
            while (currentCategory) {
                path.unshift(currentCategory);
                if (currentCategory.parentId) {
                    currentCategory = await this.prisma.category.findFirst({
                        where: {
                            id: currentCategory.parentId,
                            tenantId
                        }
                    });
                }
                else {
                    break;
                }
            }
            return {
                success: true,
                message: 'Category path retrieved successfully',
                path
            };
        }
        catch (error) {
            console.error('Error getting category path:', error);
            return {
                success: false,
                message: 'Failed to retrieve category path'
            };
        }
    }
    async searchCategories(query, userId, tenantId, options) {
        try {
            const { includeInactive = false, parentId, limit = 20 } = options || {};
            const where = {
                tenantId,
                OR: [
                    {
                        name: {
                            contains: query,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: query,
                            mode: 'insensitive'
                        }
                    }
                ]
            };
            if (!includeInactive) {
                where.isActive = true;
            }
            if (parentId !== undefined) {
                where.parentId = parentId;
            }
            const categories = await this.prisma.category.findMany({
                where,
                include: {
                    parent: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                            icon: true
                        }
                    }
                },
                orderBy: [
                    { name: 'asc' }
                ],
                take: limit
            });
            return {
                success: true,
                message: 'Categories found successfully',
                categories: categories,
                total: categories.length
            };
        }
        catch (error) {
            console.error('Error searching categories:', error);
            return {
                success: false,
                message: 'Failed to search categories'
            };
        }
    }
    async getCategoryUsage(categoryId, userId, tenantId, filters) {
        try {
            const category = await this.prisma.category.findFirst({
                where: {
                    id: categoryId,
                    tenantId
                }
            });
            if (!category) {
                return {
                    success: false,
                    message: 'Category not found or access denied'
                };
            }
            const usage = await this.calculateCategoryUsage(categoryId, tenantId, filters);
            return {
                success: true,
                message: 'Category usage retrieved successfully',
                usage
            };
        }
        catch (error) {
            console.error('Error getting category usage:', error);
            return {
                success: false,
                message: 'Failed to retrieve category usage'
            };
        }
    }
    async calculateCategoryDepth(tx, categoryId, tenantId, depth = 0) {
        const category = await tx.category.findFirst({
            where: {
                id: categoryId,
                tenantId
            }
        });
        if (!category || !category.parentId) {
            return depth;
        }
        return this.calculateCategoryDepth(tx, category.parentId, tenantId, depth + 1);
    }
    async wouldCreateCircularReference(tx, categoryId, newParentId, tenantId) {
        if (categoryId === newParentId) {
            return true;
        }
        let currentParentId = newParentId;
        const visited = new Set([categoryId]);
        while (currentParentId) {
            if (visited.has(currentParentId)) {
                return true;
            }
            visited.add(currentParentId);
            const parent = await tx.category.findFirst({
                where: {
                    id: currentParentId,
                    tenantId
                }
            });
            if (!parent) {
                break;
            }
            currentParentId = parent.parentId;
        }
        return false;
    }
    async buildCategoryTree(categories, parentId, depth, maxDepth, includeUsage, tenantId) {
        if (depth >= maxDepth) {
            return [];
        }
        const children = categories.filter(cat => cat.parentId === parentId);
        const tree = [];
        for (const category of children) {
            const node = {
                id: category.id,
                tenantId: category.tenantId,
                name: category.name,
                description: category.description,
                color: category.color,
                icon: category.icon,
                isSystem: category.isSystem,
                isActive: category.isActive,
                depth,
                children: await this.buildCategoryTree(categories, category.id, depth + 1, maxDepth, includeUsage, tenantId)
            };
            if (includeUsage) {
                node.usage = await this.calculateCategoryUsage(category.id, tenantId);
            }
            tree.push(node);
        }
        return tree;
    }
    async calculateCategoryUsage(categoryId, tenantId, filters) {
        const where = {
            categoryId,
            tenantId
        };
        if (filters?.startDate) {
            where.date = { ...where.date, gte: filters.startDate };
        }
        if (filters?.endDate) {
            where.date = { ...where.date, lte: filters.endDate };
        }
        const [transactions, aggregates] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                select: {
                    amount: true,
                    date: true
                },
                orderBy: { date: 'desc' }
            }),
            this.prisma.transaction.aggregate({
                where,
                _count: { id: true },
                _sum: { amount: true },
                _avg: { amount: true }
            })
        ]);
        const totalAmount = aggregates._sum.amount || new library_1.Decimal(0);
        const averageAmount = aggregates._avg.amount || new library_1.Decimal(0);
        const transactionCount = aggregates._count.id || 0;
        const lastUsed = transactions.length > 0 ? transactions[0].date : null;
        return {
            transactionCount,
            totalAmount: totalAmount.toString(),
            averageAmount: averageAmount.toString(),
            lastUsed
        };
    }
    isValidColor(color) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return colorRegex.test(color);
    }
}
exports.CategoryService = CategoryService;
//# sourceMappingURL=categories.service.js.map