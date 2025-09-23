import { FastifyRequest, FastifyReply } from 'fastify';
import { AccountService } from './accounts.service';
import {
  CreateAccountDto,
  CreateAccountSchema,
  UpdateAccountDto,
  UpdateAccountSchema,
  UpdateBalanceDto,
  UpdateBalanceSchema,
  AccountParamsDto,
  AccountParamsSchema,
  GetAccountsQueryDto,
  GetAccountsQuerySchema,
  GetBalanceHistoryQueryDto,
  GetBalanceHistoryQuerySchema,
  TenantContextDto,
  ErrorResponseDto,
  ValidationErrorResponseDto
} from './accounts.dto';
import { ZodError } from 'zod';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    tenantId: string;
    email: string;
    role?: string;
  };
}

export class AccountController {
  constructor(private accountService: AccountService) {}

  async createAccount(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context from authenticated user
      const { userId, tenantId } = this.extractTenantContext(request);

      // Validate request body
      const validatedData = CreateAccountSchema.parse(request.body);

      // Create account
      const result = await this.accountService.createAccount(validatedData, userId, tenantId);

      if (result.success) {
        return reply.status(201).send({
          success: true,
          message: result.message,
          account: result.account
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getAccounts(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context
      const { userId, tenantId } = this.extractTenantContext(request);

      // Validate query parameters
      const queryParams = GetAccountsQuerySchema.parse(request.query);

      // Separate filters and pagination
      const { page, limit, sortBy, sortOrder, ...filters } = queryParams;
      const pagination = { page, limit, sortBy, sortOrder };

      // Get accounts
      const result = await this.accountService.getAccounts(
        userId,
        tenantId,
        filters,
        pagination
      );

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message,
          accounts: result.accounts,
          total: result.total,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil((result.total || 0) / limit)
          }
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getAccount(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context
      const { userId, tenantId } = this.extractTenantContext(request);

      // Validate route parameters
      const { accountId } = AccountParamsSchema.parse(request.params);

      // Get account
      const result = await this.accountService.getAccount(accountId, userId, tenantId);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message,
          account: result.account
        });
      } else {
        const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async updateAccount(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context
      const { userId, tenantId } = this.extractTenantContext(request);

      // Validate route parameters
      const { accountId } = AccountParamsSchema.parse(request.params);

      // Validate request body
      const validatedData = UpdateAccountSchema.parse(request.body);

      // Update account
      const result = await this.accountService.updateAccount(accountId, validatedData, userId, tenantId);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message,
          account: result.account
        });
      } else {
        const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async deleteAccount(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context
      const { userId, tenantId } = this.extractTenantContext(request);

      // Validate route parameters
      const { accountId } = AccountParamsSchema.parse(request.params);

      // Delete account
      const result = await this.accountService.deleteAccount(accountId, userId, tenantId);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message
        });
      } else {
        const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async updateBalance(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context
      const { userId, tenantId } = this.extractTenantContext(request);

      // Validate route parameters
      const { accountId } = AccountParamsSchema.parse(request.params);

      // Validate request body
      const validatedData = UpdateBalanceSchema.parse(request.body);

      // Update balance
      const result = await this.accountService.updateBalance(
        accountId,
        validatedData.amount,
        userId,
        tenantId,
        validatedData.description
      );

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message,
          account: result.account,
          balanceHistory: result.balanceHistory
        });
      } else {
        const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getBalanceHistory(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context
      const { userId, tenantId } = this.extractTenantContext(request);

      // Validate route parameters
      const { accountId } = AccountParamsSchema.parse(request.params);

      // Validate query parameters
      const queryParams = GetBalanceHistoryQuerySchema.parse(request.query);

      // Get balance history
      const result = await this.accountService.getBalanceHistory(
        accountId,
        userId,
        tenantId,
        queryParams
      );

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message,
          history: result.history,
          pagination: {
            page: queryParams.page,
            limit: queryParams.limit
          }
        });
      } else {
        const statusCode = result.message.includes('not found') || result.message.includes('access denied') ? 404 : 400;
        return reply.status(statusCode).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getAccountSummary(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      // Extract tenant context
      const { userId, tenantId } = this.extractTenantContext(request);

      // Get account summary
      const result = await this.accountService.getAccountSummary(userId, tenantId);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: result.message,
          summary: result.summary
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  private extractTenantContext(request: AuthenticatedRequest): TenantContextDto {
    if (!request.user) {
      throw new Error('Authentication required');
    }

    const { userId, tenantId, email, role } = request.user;

    if (!userId || !tenantId) {
      throw new Error('Invalid authentication context');
    }

    return {
      tenantId,
      userId,
      userRole: role,
      userEmail: email
    };
  }

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ZodError) {
      // Validation error
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      const response: ValidationErrorResponseDto = {
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      };

      return reply.status(422).send(response);
    }

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Authentication required') ||
          error.message.includes('Invalid authentication context')) {
        const response: ErrorResponseDto = {
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        };
        return reply.status(401).send(response);
      }

      if (error.message.includes('not found') ||
          error.message.includes('access denied')) {
        const response: ErrorResponseDto = {
          success: false,
          message: 'Resource not found or access denied',
          code: 'NOT_FOUND'
        };
        return reply.status(404).send(response);
      }

      if (error.message.includes('already exists')) {
        const response: ErrorResponseDto = {
          success: false,
          message: error.message,
          code: 'DUPLICATE_RESOURCE'
        };
        return reply.status(409).send(response);
      }

      // Log the error for debugging
      console.error('Account controller error:', error);

      const response: ErrorResponseDto = {
        success: false,
        message: error.message || 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      };

      return reply.status(500).send(response);
    }

    // Unknown error type
    console.error('Unknown error in account controller:', error);

    const response: ErrorResponseDto = {
      success: false,
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    };

    return reply.status(500).send(response);
  }

  // Health check endpoint
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({
      success: true,
      message: 'Accounts module is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  // Utility method to validate tenant access (can be used by middleware)
  static validateTenantAccess(request: AuthenticatedRequest): boolean {
    try {
      const tenantContext = request.user;
      return !!(tenantContext?.userId && tenantContext?.tenantId);
    } catch {
      return false;
    }
  }
}