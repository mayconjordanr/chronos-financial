import { PrismaClient, Category } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  GetCategoriesDto,
  SearchCategoriesDto,
  CategoryUsageFiltersDto,
  BulkCategoryOperationsDto,
  CategoryTreeOptionsDto,
  CategoryResult,
  CategoriesResult,
  CategoryTreeResult,
  CategoryPathResult,
  CategoryUsageResult,
  BulkOperationResult,
  CategoryWithDetails,
  CategoryTreeNode,
  CategoryUsageStats,
  MAX_CATEGORY_DEPTH
} from './categories.dto';

export class CategoryService {
  constructor(private prisma: PrismaClient) {}

  async createCategory(
    data: CreateCategoryDto,
    userId: string,
    tenantId: string
  ): Promise<CategoryResult> {
    try {
      // Use database transaction for atomic operation
      const result = await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Check for duplicate name within tenant
        const existingCategory = await tx.category.findFirst({
          where: {
            name: data.name,
            tenantId // CRITICAL: Tenant isolation
          }
        });

        if (existingCategory) {
          throw new Error('Category name already exists');
        }

        // CRITICAL: Validate parent category if provided
        if (data.parentId) {
          const parentCategory = await tx.category.findFirst({
            where: {
              id: data.parentId,
              tenantId // CRITICAL: Tenant isolation - parent must be in same tenant
            }
          });

          if (!parentCategory) {
            throw new Error('Parent category not found or access denied');
          }

          // Validate category depth limit
          const depth = await this.calculateCategoryDepth(tx, data.parentId, tenantId);
          if (depth >= MAX_CATEGORY_DEPTH) {
            throw new Error('Category hierarchy depth limit exceeded');
          }
        }

        // Validate color format if provided
        if (data.color && !this.isValidColor(data.color)) {
          throw new Error('Invalid color format. Use hex color (e.g., #FF5733)');
        }

        // Create the category
        const category = await tx.category.create({
          data: {
            tenantId, // CRITICAL: Always include tenant ID
            name: data.name,
            description: data.description || null,
            color: data.color || null,
            icon: data.icon || null,
            parentId: data.parentId || null,
            isActive: data.isActive ?? true,
            isSystem: false // User-created categories are never system categories
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
        category: result as CategoryWithDetails
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create category'
      };
    }
  }

  async getCategories(
    userId: string,
    tenantId: string,
    options?: GetCategoriesDto
  ): Promise<CategoriesResult> {
    try {
      const {
        includeInactive = false,
        parentId,
        includeUsage = false,
        sortBy = 'name',
        sortOrder = 'asc',
        limit = 100,
        offset = 0
      } = options || {};

      // Build where clause with tenant isolation
      const where: any = {
        tenantId // CRITICAL: Tenant isolation
      };

      if (!includeInactive) {
        where.isActive = true;
      }

      if (parentId !== undefined) {
        where.parentId = parentId;
      }

      // Build order clause
      const orderBy: any = {};
      if (sortBy === 'usage') {
        // For usage sorting, we'll handle it after fetching
        orderBy.name = sortOrder;
      } else {
        orderBy[sortBy] = sortOrder;
      }

      // Get categories with relations
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

      // Add usage statistics if requested
      let categoriesWithDetails: CategoryWithDetails[] = categories as CategoryWithDetails[];

      if (includeUsage && categories.length > 0) {
        categoriesWithDetails = await Promise.all(
          categories.map(async (category) => {
            const usage = await this.calculateCategoryUsage(category.id, tenantId);
            return {
              ...category,
              usage
            } as CategoryWithDetails;
          })
        );

        // Sort by usage if requested
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
    } catch (error) {
      console.error('Error getting categories:', error);
      return {
        success: false,
        message: 'Failed to retrieve categories'
      };
    }
  }

  async getCategory(
    categoryId: string,
    userId: string,
    tenantId: string
  ): Promise<CategoryResult> {
    try {
      // CRITICAL: Always include tenantId in query
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          tenantId // CRITICAL: Tenant isolation
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
        category: category as CategoryWithDetails
      };
    } catch (error) {
      console.error('Error getting category:', error);
      return {
        success: false,
        message: 'Category not found or access denied'
      };
    }
  }

  async updateCategory(
    categoryId: string,
    data: UpdateCategoryDto,
    userId: string,
    tenantId: string
  ): Promise<CategoryResult> {
    try {
      // Use database transaction for atomic operation
      const result = await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate category exists and belongs to tenant
        const existingCategory = await tx.category.findFirst({
          where: {
            id: categoryId,
            tenantId // CRITICAL: Tenant isolation
          }
        });

        if (!existingCategory) {
          throw new Error('Category not found or access denied');
        }

        // CRITICAL: Validate parent category if being updated
        if (data.parentId !== undefined) {
          if (data.parentId) {
            const parentCategory = await tx.category.findFirst({
              where: {
                id: data.parentId,
                tenantId // CRITICAL: Tenant isolation
              }
            });

            if (!parentCategory) {
              throw new Error('Parent category not found or access denied');
            }

            // Prevent circular references
            if (await this.wouldCreateCircularReference(tx, categoryId, data.parentId, tenantId)) {
              throw new Error('Circular reference detected in category hierarchy');
            }

            // Validate depth limit
            const depth = await this.calculateCategoryDepth(tx, data.parentId, tenantId);
            if (depth >= MAX_CATEGORY_DEPTH) {
              throw new Error('Category hierarchy depth limit exceeded');
            }
          }
        }

        // Check for duplicate name if name is being updated
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

        // Validate color format if provided
        if (data.color && !this.isValidColor(data.color)) {
          throw new Error('Invalid color format. Use hex color (e.g., #FF5733)');
        }

        // Update the category
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
        category: result as CategoryWithDetails
      };
    } catch (error) {
      console.error('Error updating category:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update category'
      };
    }
  }

  async deleteCategory(
    categoryId: string,
    userId: string,
    tenantId: string
  ): Promise<CategoryResult> {
    try {
      // Use database transaction for atomic operation
      const result = await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate category exists and belongs to tenant
        const existingCategory = await tx.category.findFirst({
          where: {
            id: categoryId,
            tenantId // CRITICAL: Tenant isolation
          }
        });

        if (!existingCategory) {
          throw new Error('Category not found or access denied');
        }

        // Check for child categories
        const childCategories = await tx.category.findMany({
          where: {
            parentId: categoryId,
            tenantId
          }
        });

        if (childCategories.length > 0) {
          throw new Error('Cannot delete category with child categories');
        }

        // Check for transactions using this category
        const transactionCount = await tx.transaction.count({
          where: {
            categoryId: categoryId,
            tenantId
          }
        });

        if (transactionCount > 0) {
          throw new Error('Cannot delete category that is being used by transactions');
        }

        // Delete the category
        await tx.category.delete({
          where: { id: categoryId }
        });

        return existingCategory;
      });

      return {
        success: true,
        message: 'Category deleted successfully',
        category: result as CategoryWithDetails
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete category'
      };
    }
  }

  async getCategoryTree(
    userId: string,
    tenantId: string,
    options?: CategoryTreeOptionsDto
  ): Promise<CategoryTreeResult> {
    try {
      const {
        includeInactive = false,
        includeUsage = false,
        maxDepth = 5,
        rootCategoryId
      } = options || {};

      // Build where clause
      const where: any = {
        tenantId // CRITICAL: Tenant isolation
      };

      if (!includeInactive) {
        where.isActive = true;
      }

      if (rootCategoryId) {
        // Get subtree starting from specific root
        where.OR = [
          { id: rootCategoryId },
          { parentId: rootCategoryId }
        ];
      }

      // Get all categories
      const categories = await this.prisma.category.findMany({
        where,
        orderBy: [
          { name: 'asc' }
        ]
      });

      // Build tree structure
      const tree = await this.buildCategoryTree(
        categories,
        rootCategoryId || null,
        0,
        maxDepth,
        includeUsage,
        tenantId
      );

      return {
        success: true,
        message: 'Category tree retrieved successfully',
        tree
      };
    } catch (error) {
      console.error('Error getting category tree:', error);
      return {
        success: false,
        message: 'Failed to retrieve category tree'
      };
    }
  }

  async getCategoryPath(
    categoryId: string,
    userId: string,
    tenantId: string
  ): Promise<CategoryPathResult> {
    try {
      // CRITICAL: Validate category exists and belongs to tenant
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          tenantId // CRITICAL: Tenant isolation
        }
      });

      if (!category) {
        return {
          success: false,
          message: 'Category not found or access denied'
        };
      }

      const path: CategoryWithDetails[] = [];
      let currentCategory = category;

      // Build path from root to target category
      while (currentCategory) {
        path.unshift(currentCategory as CategoryWithDetails);

        if (currentCategory.parentId) {
          currentCategory = await this.prisma.category.findFirst({
            where: {
              id: currentCategory.parentId,
              tenantId // CRITICAL: Tenant isolation
            }
          });
        } else {
          break;
        }
      }

      return {
        success: true,
        message: 'Category path retrieved successfully',
        path
      };
    } catch (error) {
      console.error('Error getting category path:', error);
      return {
        success: false,
        message: 'Failed to retrieve category path'
      };
    }
  }

  async searchCategories(
    query: string,
    userId: string,
    tenantId: string,
    options?: SearchCategoriesDto
  ): Promise<CategoriesResult> {
    try {
      const {
        includeInactive = false,
        parentId,
        limit = 20
      } = options || {};

      // Build where clause with tenant isolation
      const where: any = {
        tenantId, // CRITICAL: Tenant isolation
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
        categories: categories as CategoryWithDetails[],
        total: categories.length
      };
    } catch (error) {
      console.error('Error searching categories:', error);
      return {
        success: false,
        message: 'Failed to search categories'
      };
    }
  }

  async getCategoryUsage(
    categoryId: string,
    userId: string,
    tenantId: string,
    filters?: CategoryUsageFiltersDto
  ): Promise<CategoryUsageResult> {
    try {
      // CRITICAL: Validate category exists and belongs to tenant
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          tenantId // CRITICAL: Tenant isolation
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
    } catch (error) {
      console.error('Error getting category usage:', error);
      return {
        success: false,
        message: 'Failed to retrieve category usage'
      };
    }
  }

  // Private helper methods

  private async calculateCategoryDepth(
    tx: any,
    categoryId: string,
    tenantId: string,
    depth: number = 0
  ): Promise<number> {
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

  private async wouldCreateCircularReference(
    tx: any,
    categoryId: string,
    newParentId: string,
    tenantId: string
  ): Promise<boolean> {
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

  private async buildCategoryTree(
    categories: Category[],
    parentId: string | null,
    depth: number,
    maxDepth: number,
    includeUsage: boolean,
    tenantId: string
  ): Promise<CategoryTreeNode[]> {
    if (depth >= maxDepth) {
      return [];
    }

    const children = categories.filter(cat => cat.parentId === parentId);
    const tree: CategoryTreeNode[] = [];

    for (const category of children) {
      const node: CategoryTreeNode = {
        id: category.id,
        tenantId: category.tenantId,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isSystem: category.isSystem,
        isActive: category.isActive,
        depth,
        children: await this.buildCategoryTree(
          categories,
          category.id,
          depth + 1,
          maxDepth,
          includeUsage,
          tenantId
        )
      };

      if (includeUsage) {
        node.usage = await this.calculateCategoryUsage(category.id, tenantId);
      }

      tree.push(node);
    }

    return tree;
  }

  private async calculateCategoryUsage(
    categoryId: string,
    tenantId: string,
    filters?: CategoryUsageFiltersDto
  ): Promise<CategoryUsageStats> {
    const where: any = {
      categoryId,
      tenantId // CRITICAL: Tenant isolation
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

    const totalAmount = aggregates._sum.amount || new Decimal(0);
    const averageAmount = aggregates._avg.amount || new Decimal(0);
    const transactionCount = aggregates._count.id || 0;
    const lastUsed = transactions.length > 0 ? transactions[0].date : null;

    return {
      transactionCount,
      totalAmount: totalAmount.toString(),
      averageAmount: averageAmount.toString(),
      lastUsed
    };
  }

  private isValidColor(color: string): boolean {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(color);
  }
}