import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AccountController, AuthenticatedRequest } from './accounts.controller';
import { AccountService } from './accounts.service';
import { OpenAPISchemas } from './accounts.dto';
import { AccountType } from '@prisma/client';

export interface AccountRoutesOptions extends FastifyPluginOptions {
  accountService: AccountService;
}

export async function accountRoutes(
  fastify: FastifyInstance,
  options: AccountRoutesOptions
) {
  const accountController = new AccountController(options.accountService);

  // Register authentication hook for all routes
  fastify.addHook('preHandler', async (request: AuthenticatedRequest, reply) => {
    // Skip authentication for health check
    if (request.url.endsWith('/health')) {
      return;
    }

    if (!AccountController.validateTenantAccess(request)) {
      return reply.status(401).send({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
  });

  // Health check endpoint
  fastify.get('/health', {
    schema: {
      summary: 'Account module health check',
      description: 'Check if the accounts module is healthy and responsive',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' }
          }
        }
      }
    }
  }, accountController.healthCheck.bind(accountController));

  // Create Account
  fastify.post('/', {
    schema: {
      summary: 'Create a new account',
      description: 'Create a new financial account with tenant isolation',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      body: OpenAPISchemas.CreateAccountRequest,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Account created successfully' },
            account: OpenAPISchemas.AccountResponse
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Authentication required' },
            code: { type: 'string', example: 'AUTH_REQUIRED' }
          }
        },
        422: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  code: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, accountController.createAccount.bind(accountController));

  // Get All Accounts
  fastify.get('/', {
    schema: {
      summary: 'Get user accounts',
      description: 'Retrieve all accounts for the authenticated user with optional filtering and pagination',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: Object.values(AccountType),
            description: 'Filter by account type'
          },
          isActive: {
            type: 'string',
            enum: ['true', 'false'],
            description: 'Filter by active status'
          },
          currency: {
            type: 'string',
            minLength: 3,
            maxLength: 3,
            description: 'Filter by currency code'
          },
          search: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Search in account name, description, or bank name'
          },
          page: {
            type: 'integer',
            minimum: 1,
            maximum: 1000,
            default: 1,
            description: 'Page number for pagination'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Number of items per page'
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'balance', 'createdAt', 'updatedAt'],
            default: 'createdAt',
            description: 'Field to sort by'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
            description: 'Sort order'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Accounts retrieved successfully' },
            accounts: {
              type: 'array',
              items: OpenAPISchemas.AccountResponse
            },
            total: { type: 'number', example: 5 },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 50 },
                totalPages: { type: 'number', example: 1 }
              }
            }
          }
        },
        401: {
          $ref: '#/components/schemas/ErrorResponse'
        }
      }
    }
  }, accountController.getAccounts.bind(accountController));

  // Get Account by ID
  fastify.get('/:accountId', {
    schema: {
      summary: 'Get account by ID',
      description: 'Retrieve a specific account by its ID with tenant isolation',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Account ID',
            example: 'acc_123456789'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Account retrieved successfully' },
            account: OpenAPISchemas.AccountResponse
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Resource not found or access denied' },
            code: { type: 'string', example: 'NOT_FOUND' }
          }
        },
        401: {
          $ref: '#/components/schemas/ErrorResponse'
        }
      }
    }
  }, accountController.getAccount.bind(accountController));

  // Update Account
  fastify.put('/:accountId', {
    schema: {
      summary: 'Update account',
      description: 'Update account details (excluding balance and type)',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Account ID'
          }
        }
      },
      body: OpenAPISchemas.UpdateAccountRequest,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Account updated successfully' },
            account: OpenAPISchemas.AccountResponse
          }
        },
        404: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        422: {
          $ref: '#/components/schemas/ValidationErrorResponse'
        }
      }
    }
  }, accountController.updateAccount.bind(accountController));

  // Delete Account
  fastify.delete('/:accountId', {
    schema: {
      summary: 'Delete account',
      description: 'Soft delete an account (deactivate). Account must have zero balance.',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Account ID'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Account deleted successfully' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Cannot delete account with non-zero balance' }
          }
        },
        404: {
          $ref: '#/components/schemas/ErrorResponse'
        }
      }
    }
  }, accountController.deleteAccount.bind(accountController));

  // Update Account Balance
  fastify.patch('/:accountId/balance', {
    schema: {
      summary: 'Update account balance',
      description: 'Update account balance with transaction logging',
      tags: ['Accounts', 'Balance'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Account ID'
          }
        }
      },
      body: OpenAPISchemas.UpdateBalanceRequest,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Balance updated successfully' },
            account: OpenAPISchemas.AccountResponse,
            balanceHistory: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                accountId: { type: 'string' },
                tenantId: { type: 'string' },
                previousBalance: { type: 'number', format: 'decimal' },
                newBalance: { type: 'number', format: 'decimal' },
                change: { type: 'number', format: 'decimal' },
                description: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        404: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        422: {
          $ref: '#/components/schemas/ValidationErrorResponse'
        }
      }
    }
  }, accountController.updateBalance.bind(accountController));

  // Get Balance History
  fastify.get('/:accountId/balance/history', {
    schema: {
      summary: 'Get balance history',
      description: 'Retrieve balance change history for an account',
      tags: ['Accounts', 'Balance'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['accountId'],
        properties: {
          accountId: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Account ID'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            maximum: 1000,
            default: 1,
            description: 'Page number for pagination'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Number of items per page'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Balance history retrieved successfully' },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  accountId: { type: 'string' },
                  tenantId: { type: 'string' },
                  previousBalance: { type: 'number', format: 'decimal' },
                  newBalance: { type: 'number', format: 'decimal' },
                  change: { type: 'number', format: 'decimal' },
                  description: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' }
              }
            }
          }
        },
        404: {
          $ref: '#/components/schemas/ErrorResponse'
        }
      }
    }
  }, accountController.getBalanceHistory.bind(accountController));

  // Get Account Summary
  fastify.get('/summary/overview', {
    schema: {
      summary: 'Get account summary',
      description: 'Get overview of all user accounts including totals and breakdowns',
      tags: ['Accounts', 'Summary'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Account summary retrieved successfully' },
            summary: {
              type: 'object',
              properties: {
                totalAccounts: { type: 'number', example: 5 },
                activeAccounts: { type: 'number', example: 4 },
                totalBalance: { type: 'number', format: 'decimal', example: 25000.00 },
                balanceByType: {
                  type: 'object',
                  additionalProperties: { type: 'number', format: 'decimal' },
                  example: {
                    'CHECKING': 5000.00,
                    'SAVINGS': 15000.00,
                    'CREDIT_CARD': -2000.00,
                    'INVESTMENT': 7000.00
                  }
                },
                balanceByCurrency: {
                  type: 'object',
                  additionalProperties: { type: 'number', format: 'decimal' },
                  example: {
                    'USD': 23000.00,
                    'EUR': 2000.00
                  }
                }
              }
            }
          }
        },
        401: {
          $ref: '#/components/schemas/ErrorResponse'
        }
      }
    }
  }, accountController.getAccountSummary.bind(accountController));
}

// Plugin registration
export default async function accountsPlugin(
  fastify: FastifyInstance,
  options: AccountRoutesOptions
) {
  await fastify.register(accountRoutes, options);
}

// Export plugin options interface for type safety
export { AccountRoutesOptions };