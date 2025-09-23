import { FastifyRequest, FastifyReply } from 'fastify';
import { CategoryService } from './categories.service';
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateGetCategories,
  validateSearchCategories,
  validateCategoryUsageFilters,
  validateBulkCategoryOperations,
  validateCategoryTreeOptions,
  validateCategoryPath,
  validateCategoryIdParam,
  CreateCategoryDto,
  UpdateCategoryDto,
  GetCategoriesDto,
  SearchCategoriesDto,
  CategoryUsageFiltersDto,
  BulkCategoryOperationsDto,
  CategoryTreeOptionsDto,
  CategoryPathDto
} from './categories.dto';
import { ZodError } from 'zod';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate request body
      const categoryData = validateCreateCategory(request.body);

      const result = await this.categoryService.createCategory(
        categoryData,
        userId,
        tenantId
      );

      if (result.success) {
        reply.status(201).send({
          success: true,
          message: result.message,
          data: result.category
        });
      } else {
        reply.status(400).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in createCategory controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async getCategories(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate query parameters
      const options = validateGetCategories(request.query);

      const result = await this.categoryService.getCategories(
        userId,
        tenantId,
        options
      );

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
      } else {
        reply.status(500).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in getCategories controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async getCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate category ID parameter
      const { categoryId } = validateCategoryIdParam(request.params);

      const result = await this.categoryService.getCategory(
        categoryId,
        userId,
        tenantId
      );

      if (result.success) {
        reply.status(200).send({
          success: true,
          message: result.message,
          data: result.category
        });
      } else {
        reply.status(404).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in getCategory controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid category ID',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async updateCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate category ID parameter
      const { categoryId } = validateCategoryIdParam(request.params);

      // Validate request body
      const updateData = validateUpdateCategory(request.body);

      const result = await this.categoryService.updateCategory(
        categoryId,
        updateData,
        userId,
        tenantId
      );

      if (result.success) {
        reply.status(200).send({
          success: true,
          message: result.message,
          data: result.category
        });
      } else {
        const statusCode = result.message.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in updateCategory controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async deleteCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate category ID parameter
      const { categoryId } = validateCategoryIdParam(request.params);

      const result = await this.categoryService.deleteCategory(
        categoryId,
        userId,
        tenantId
      );

      if (result.success) {
        reply.status(200).send({
          success: true,
          message: result.message
        });
      } else {
        const statusCode = result.message.includes('not found') ? 404 : 400;
        reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in deleteCategory controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid category ID',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async getCategoryTree(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate query parameters
      const options = validateCategoryTreeOptions(request.query);

      const result = await this.categoryService.getCategoryTree(
        userId,
        tenantId,
        options
      );

      if (result.success) {
        reply.status(200).send({
          success: true,
          message: result.message,
          data: result.tree
        });
      } else {
        reply.status(500).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in getCategoryTree controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async getCategoryPath(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate category ID parameter
      const { categoryId } = validateCategoryIdParam(request.params);

      const result = await this.categoryService.getCategoryPath(
        categoryId,
        userId,
        tenantId
      );

      if (result.success) {
        reply.status(200).send({
          success: true,
          message: result.message,
          data: result.path
        });
      } else {
        reply.status(404).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in getCategoryPath controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid category ID',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async searchCategories(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate query parameters
      const searchOptions = validateSearchCategories(request.query);

      const result = await this.categoryService.searchCategories(
        searchOptions.query,
        userId,
        tenantId,
        searchOptions
      );

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
      } else {
        reply.status(500).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in searchCategories controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid search parameters',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async getCategoryUsage(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate category ID parameter
      const { categoryId } = validateCategoryIdParam(request.params);

      // Validate query parameters (filters are optional)
      const filters = request.query ? validateCategoryUsageFilters(request.query) : undefined;

      const result = await this.categoryService.getCategoryUsage(
        categoryId,
        userId,
        tenantId,
        filters
      );

      if (result.success) {
        reply.status(200).send({
          success: true,
          message: result.message,
          data: result.usage
        });
      } else {
        const statusCode = result.message.includes('not found') ? 404 : 500;
        reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in getCategoryUsage controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Invalid parameters',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  async bulkCategoryOperations(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
      const { tenantId, userId } = this.extractAuthInfo(request);

      // Validate request body
      const operationData = validateBulkCategoryOperations(request.body);

      // Process bulk operations based on operation type
      let results: any[] = [];
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const categoryId of operationData.categoryIds) {
        try {
          let result: any;

          switch (operationData.operation) {
            case 'activate':
              result = await this.categoryService.updateCategory(
                categoryId,
                { isActive: true },
                userId,
                tenantId
              );
              break;

            case 'deactivate':
              result = await this.categoryService.updateCategory(
                categoryId,
                { isActive: false },
                userId,
                tenantId
              );
              break;

            case 'delete':
              result = await this.categoryService.deleteCategory(
                categoryId,
                userId,
                tenantId
              );
              break;

            case 'move':
              if (operationData.newParentId === undefined) {
                throw new Error('newParentId is required for move operation');
              }
              result = await this.categoryService.updateCategory(
                categoryId,
                { parentId: operationData.newParentId },
                userId,
                tenantId
              );
              break;

            default:
              throw new Error(`Unsupported operation: ${operationData.operation}`);
          }

          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push(`Category ${categoryId}: ${result.message}`);
          }

          results.push({ categoryId, success: result.success, message: result.message });
        } catch (error) {
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
    } catch (error) {
      console.error('Error in bulkCategoryOperations controller:', error);

      if (error instanceof ZodError) {
        reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        reply.status(500).send({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  // CRITICAL: Helper method to extract authentication information
  // This assumes the auth middleware has populated the request with user/tenant info
  private extractAuthInfo(request: FastifyRequest): { tenantId: string; userId: string } {
    // In a real implementation, this would extract from JWT token or session
    // For now, we'll extract from request context set by auth middleware
    const user = (request as any).user;

    if (!user || !user.tenantId || !user.userId) {
      throw new Error('Authentication required');
    }

    return {
      tenantId: user.tenantId,
      userId: user.userId
    };
  }

  // Health check endpoint for categories module
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      reply.status(200).send({
        success: true,
        message: 'Categories module is healthy',
        timestamp: new Date().toISOString(),
        service: 'categories'
      });
    } catch (error) {
      console.error('Error in categories health check:', error);
      reply.status(500).send({
        success: false,
        message: 'Categories module health check failed'
      });
    }
  }

  // Statistics endpoint for categories overview
  async getCategoriesStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      // CRITICAL: Extract tenant and user information from authenticated request
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
      } else {
        reply.status(500).send({
          success: false,
          message: 'Failed to retrieve categories statistics'
        });
      }
    } catch (error) {
      console.error('Error in getCategoriesStats controller:', error);
      reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}