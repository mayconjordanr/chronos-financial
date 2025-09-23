"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRoutes = transactionRoutes;
const transactions_controller_1 = require("./transactions.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
async function transactionRoutes(fastify) {
    const transactionController = new transactions_controller_1.TransactionController(fastify.transactionService);
    fastify.addHook('preHandler', auth_middleware_1.authMiddleware);
    fastify.post('/transactions', {
        schema: {
            tags: ['Transactions'],
            summary: 'Create a new transaction',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['accountId', 'amount', 'type', 'description'],
                properties: {
                    accountId: { type: 'string', format: 'uuid' },
                    categoryId: { type: 'string', format: 'uuid' },
                    toAccountId: { type: 'string', format: 'uuid' },
                    amount: { type: 'number', minimum: 0.01 },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
                    description: { type: 'string', minLength: 1, maxLength: 500 },
                    date: { type: 'string', format: 'date-time' },
                    tags: { type: 'array', items: { type: 'string' } },
                    metadata: { type: 'object' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        transaction: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                accountId: { type: 'string' },
                                categoryId: { type: 'string', nullable: true },
                                toAccountId: { type: 'string', nullable: true },
                                amount: { type: 'number' },
                                type: { type: 'string' },
                                description: { type: 'string' },
                                date: { type: 'string' },
                                tenantId: { type: 'string' },
                                userId: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, transactionController.createTransaction.bind(transactionController));
    fastify.get('/transactions', {
        schema: {
            tags: ['Transactions'],
            summary: 'Get transactions with filtering and pagination',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    accountId: { type: 'string', format: 'uuid' },
                    categoryId: { type: 'string', format: 'uuid' },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    minAmount: { type: 'number' },
                    maxAmount: { type: 'number' },
                    search: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    page: { type: 'number', minimum: 1 },
                    limit: { type: 'number', minimum: 1, maximum: 100 },
                    sortBy: { type: 'string', enum: ['date', 'amount', 'description'] },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'] }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        transactions: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    amount: { type: 'number' },
                                    type: { type: 'string' },
                                    description: { type: 'string' },
                                    date: { type: 'string' },
                                    account: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            name: { type: 'string' },
                                            type: { type: 'string' }
                                        }
                                    },
                                    category: {
                                        type: 'object',
                                        nullable: true,
                                        properties: {
                                            id: { type: 'string' },
                                            name: { type: 'string' },
                                            color: { type: 'string' },
                                            icon: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        total: { type: 'number' }
                    }
                }
            }
        }
    }, transactionController.getTransactions.bind(transactionController));
    fastify.get('/transactions/summary', {
        schema: {
            tags: ['Transactions'],
            summary: 'Get transaction summary statistics',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    accountId: { type: 'string', format: 'uuid' },
                    categoryId: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        summary: {
                            type: 'object',
                            properties: {
                                totalTransactions: { type: 'number' },
                                totalIncome: { type: 'number' },
                                totalExpenses: { type: 'number' },
                                totalTransfers: { type: 'number' },
                                netFlow: { type: 'number' },
                                averageTransaction: { type: 'number' },
                                incomeTransactions: { type: 'number' },
                                expenseTransactions: { type: 'number' },
                                transferTransactions: { type: 'number' }
                            }
                        }
                    }
                }
            }
        }
    }, transactionController.getTransactionSummary.bind(transactionController));
    fastify.get('/transactions/:id', {
        schema: {
            tags: ['Transactions'],
            summary: 'Get a specific transaction',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        transaction: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                amount: { type: 'number' },
                                type: { type: 'string' },
                                description: { type: 'string' },
                                date: { type: 'string' },
                                account: { type: 'object' },
                                category: { type: 'object', nullable: true },
                                toAccount: { type: 'object', nullable: true }
                            }
                        }
                    }
                }
            }
        }
    }, transactionController.getTransaction.bind(transactionController));
    fastify.put('/transactions/:id', {
        schema: {
            tags: ['Transactions'],
            summary: 'Update a transaction',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    categoryId: { type: 'string', format: 'uuid' },
                    amount: { type: 'number', minimum: 0.01 },
                    description: { type: 'string', minLength: 1, maxLength: 500 },
                    date: { type: 'string', format: 'date-time' },
                    tags: { type: 'array', items: { type: 'string' } },
                    metadata: { type: 'object' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        transaction: { type: 'object' }
                    }
                }
            }
        }
    }, transactionController.updateTransaction.bind(transactionController));
    fastify.delete('/transactions/:id', {
        schema: {
            tags: ['Transactions'],
            summary: 'Delete a transaction',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, transactionController.deleteTransaction.bind(transactionController));
    fastify.post('/transactions/recurring', {
        schema: {
            tags: ['Transactions'],
            summary: 'Create a recurring transaction template',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['accountId', 'amount', 'type', 'description', 'frequency', 'startDate'],
                properties: {
                    accountId: { type: 'string', format: 'uuid' },
                    categoryId: { type: 'string', format: 'uuid' },
                    toAccountId: { type: 'string', format: 'uuid' },
                    amount: { type: 'number', minimum: 0.01 },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
                    description: { type: 'string', minLength: 1, maxLength: 500 },
                    frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    tags: { type: 'array', items: { type: 'string' } },
                    metadata: { type: 'object' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        recurringTransaction: { type: 'object' }
                    }
                }
            }
        }
    }, transactionController.createRecurringTransaction.bind(transactionController));
    fastify.post('/transactions/recurring/generate', {
        schema: {
            tags: ['Transactions'],
            summary: 'Generate transactions from recurring templates',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        generated: { type: 'number' }
                    }
                }
            }
        }
    }, transactionController.generateRecurringTransactions.bind(transactionController));
}
//# sourceMappingURL=transactions.routes.js.map