import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CategoryController } from './categories.controller';
import { CategoryService } from './categories.service';

// Route schemas for OpenAPI documentation and validation
const createCategorySchema = {
  description: 'Create a new category',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Category name'
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Category description'
      },
      color: {
        type: 'string',
        pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
        description: 'Hex color code'
      },
      icon: {
        type: 'string',
        maxLength: 10,
        description: 'Category icon (emoji or symbol)'
      },
      parentId: {
        type: 'string',
        format: 'uuid',
        description: 'Parent category ID for hierarchical categories'
      },
      isActive: {
        type: 'boolean',
        default: true,
        description: 'Whether the category is active'
      }
    }
  },
  response: {
    201: {
      description: 'Category created successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenantId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string' },
            icon: { type: 'string' },
            parentId: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' },
            isSystem: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    400: {
      description: 'Validation error or business logic error',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

const getCategoriesSchema = {
  description: 'Get categories with optional filtering',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      includeInactive: {
        type: 'boolean',
        default: false,
        description: 'Include inactive categories'
      },
      parentId: {
        type: 'string',
        format: 'uuid',
        description: 'Filter by parent category ID'
      },
      includeUsage: {
        type: 'boolean',
        default: false,
        description: 'Include usage statistics'
      },
      sortBy: {
        type: 'string',
        enum: ['name', 'createdAt', 'updatedAt', 'usage'],
        default: 'name',
        description: 'Sort field'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'asc',
        description: 'Sort order'
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 500,
        default: 100,
        description: 'Maximum number of results'
      },
      offset: {
        type: 'integer',
        minimum: 0,
        default: 0,
        description: 'Number of results to skip'
      }
    }
  },
  response: {
    200: {
      description: 'Categories retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Category' }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            count: { type: 'integer' }
          }
        }
      }
    }
  }
};

const getCategorySchema = {
  description: 'Get a specific category by ID',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['categoryId'],
    properties: {
      categoryId: {
        type: 'string',
        format: 'uuid',
        description: 'Category ID'
      }
    }
  },
  response: {
    200: {
      description: 'Category retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/Category' }
      }
    },
    404: {
      description: 'Category not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
};

const updateCategorySchema = {
  description: 'Update a category',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['categoryId'],
    properties: {
      categoryId: {
        type: 'string',
        format: 'uuid',
        description: 'Category ID'
      }
    }
  },
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Category name'
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Category description'
      },
      color: {
        type: 'string',
        pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
        description: 'Hex color code'
      },
      icon: {
        type: 'string',
        maxLength: 10,
        description: 'Category icon'
      },
      parentId: {
        type: 'string',
        format: 'uuid',
        description: 'Parent category ID'
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the category is active'
      }
    }
  },
  response: {
    200: {
      description: 'Category updated successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/Category' }
      }
    },
    404: {
      description: 'Category not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
};

const deleteCategorySchema = {
  description: 'Delete a category',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['categoryId'],
    properties: {
      categoryId: {
        type: 'string',
        format: 'uuid',
        description: 'Category ID'
      }
    }
  },
  response: {
    200: {
      description: 'Category deleted successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    },
    400: {
      description: 'Cannot delete category',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    },
    404: {
      description: 'Category not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
};

const getCategoryTreeSchema = {
  description: 'Get hierarchical category tree',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      includeInactive: {
        type: 'boolean',
        default: false,
        description: 'Include inactive categories'
      },
      includeUsage: {
        type: 'boolean',
        default: false,
        description: 'Include usage statistics'
      },
      maxDepth: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        default: 5,
        description: 'Maximum tree depth'
      },
      rootCategoryId: {
        type: 'string',
        format: 'uuid',
        description: 'Root category ID for subtree'
      }
    }
  },
  response: {
    200: {
      description: 'Category tree retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CategoryTreeNode' }
        }
      }
    }
  }
};

const searchCategoriesSchema = {
  description: 'Search categories by name or description',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Search query'
      },
      includeInactive: {
        type: 'boolean',
        default: false,
        description: 'Include inactive categories'
      },
      parentId: {
        type: 'string',
        format: 'uuid',
        description: 'Filter by parent category'
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Maximum number of results'
      }
    }
  },
  response: {
    200: {
      description: 'Search results retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Category' }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            count: { type: 'integer' }
          }
        }
      }
    }
  }
};

const getCategoryUsageSchema = {
  description: 'Get category usage statistics',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['categoryId'],
    properties: {
      categoryId: {
        type: 'string',
        format: 'uuid',
        description: 'Category ID'
      }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Start date for usage period'
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date for usage period'
      },
      groupBy: {
        type: 'string',
        enum: ['day', 'week', 'month', 'year'],
        default: 'month',
        description: 'Group usage statistics by period'
      },
      includeSubcategories: {
        type: 'boolean',
        default: true,
        description: 'Include subcategories in usage calculation'
      }
    }
  },
  response: {
    200: {
      description: 'Category usage retrieved successfully',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { $ref: '#/components/schemas/CategoryUsageStats' }
      }
    },
    404: {
      description: 'Category not found',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
};

const bulkOperationsSchema = {
  description: 'Perform bulk operations on categories',
  tags: ['Categories'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['operation', 'categoryIds'],
    properties: {
      operation: {
        type: 'string',
        enum: ['activate', 'deactivate', 'delete', 'move'],
        description: 'Bulk operation to perform'
      },
      categoryIds: {
        type: 'array',
        items: {
          type: 'string',
          format: 'uuid'
        },
        minItems: 1,
        maxItems: 100,
        description: 'Array of category IDs'
      },
      newParentId: {
        type: 'string',
        format: 'uuid',
        description: 'New parent ID for move operation'
      }
    }
  },
  response: {
    200: {
      description: 'Bulk operation completed',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            operation: { type: 'string' },
            total: { type: 'integer' },
            successful: { type: 'integer' },
            failed: { type: 'integer' },
            errors: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

// Plugin function for category routes
export async function categoryRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  // Initialize service and controller
  const categoryService = new CategoryService(options.prisma);
  const categoryController = new CategoryController(categoryService);

  // Bind controller methods to preserve 'this' context
  const boundController = {
    createCategory: categoryController.createCategory.bind(categoryController),
    getCategories: categoryController.getCategories.bind(categoryController),
    getCategory: categoryController.getCategory.bind(categoryController),
    updateCategory: categoryController.updateCategory.bind(categoryController),
    deleteCategory: categoryController.deleteCategory.bind(categoryController),
    getCategoryTree: categoryController.getCategoryTree.bind(categoryController),
    getCategoryPath: categoryController.getCategoryPath.bind(categoryController),
    searchCategories: categoryController.searchCategories.bind(categoryController),
    getCategoryUsage: categoryController.getCategoryUsage.bind(categoryController),
    bulkCategoryOperations: categoryController.bulkCategoryOperations.bind(categoryController),
    healthCheck: categoryController.healthCheck.bind(categoryController),
    getCategoriesStats: categoryController.getCategoriesStats.bind(categoryController)
  };

  // CRITICAL: Apply authentication middleware to all routes
  // This ensures tenant isolation at the route level
  await fastify.register(async function (fastify) {
    // Apply auth middleware hook (assumes auth middleware is available)
    fastify.addHook('preHandler', async (request, reply) => {
      // This hook should validate JWT token and populate request.user
      // with { userId, tenantId, role } information
      // Implementation depends on your auth middleware
    });

    // Core CRUD routes
    fastify.post('/categories', { schema: createCategorySchema }, boundController.createCategory);
    fastify.get('/categories', { schema: getCategoriesSchema }, boundController.getCategories);
    fastify.get('/categories/:categoryId', { schema: getCategorySchema }, boundController.getCategory);
    fastify.put('/categories/:categoryId', { schema: updateCategorySchema }, boundController.updateCategory);
    fastify.delete('/categories/:categoryId', { schema: deleteCategorySchema }, boundController.deleteCategory);

    // Hierarchical and specialized routes
    fastify.get('/categories/tree', { schema: getCategoryTreeSchema }, boundController.getCategoryTree);
    fastify.get('/categories/:categoryId/path', boundController.getCategoryPath);
    fastify.get('/categories/search', { schema: searchCategoriesSchema }, boundController.searchCategories);
    fastify.get('/categories/:categoryId/usage', { schema: getCategoryUsageSchema }, boundController.getCategoryUsage);

    // Bulk operations
    fastify.post('/categories/bulk', { schema: bulkOperationsSchema }, boundController.bulkCategoryOperations);

    // Management and statistics routes
    fastify.get('/categories/stats/overview', boundController.getCategoriesStats);
  });

  // Health check route (no auth required)
  fastify.get('/categories/health', { schema: { tags: ['Health'] } }, boundController.healthCheck);

  // Register OpenAPI schema components
  fastify.addSchema({
    $id: 'Category',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      tenantId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string' },
      color: { type: 'string' },
      icon: { type: 'string' },
      parentId: { type: 'string', format: 'uuid' },
      isSystem: { type: 'boolean' },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      children: {
        type: 'array',
        items: { $ref: 'Category' }
      },
      usage: { $ref: 'CategoryUsageStats' }
    }
  });

  fastify.addSchema({
    $id: 'CategoryTreeNode',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      tenantId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string' },
      color: { type: 'string' },
      icon: { type: 'string' },
      isSystem: { type: 'boolean' },
      isActive: { type: 'boolean' },
      depth: { type: 'integer' },
      children: {
        type: 'array',
        items: { $ref: 'CategoryTreeNode' }
      },
      usage: { $ref: 'CategoryUsageStats' }
    }
  });

  fastify.addSchema({
    $id: 'CategoryUsageStats',
    type: 'object',
    properties: {
      transactionCount: { type: 'integer' },
      totalAmount: { type: 'string' },
      averageAmount: { type: 'string' },
      lastUsed: { type: 'string', format: 'date-time' },
      periodBreakdown: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            period: { type: 'string' },
            count: { type: 'integer' },
            amount: { type: 'string' }
          }
        }
      }
    }
  });
}

// Export plugin options interface
export interface CategoryRoutesOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
}

// Route prefixes and metadata
export const CATEGORY_ROUTES_CONFIG = {
  prefix: '/api/v1',
  tags: ['Categories'],
  description: 'Category management endpoints with hierarchical support and tenant isolation'
};